"""
Statute browsing and section lookup.

Two jobs, one source of truth (the .txt files in data/laws):

  1. **Citation deep-linking.** An answer that says "under Section 302 PPC" should
     let the reader click through to the enacted text. Until now the product
     asked to be trusted: it printed "Grounded in Pakistan Penal Code" and that
     was the end of it. The whole argument for RAG is auditability, and an
     audit trail nobody can follow is just a claim.

  2. **A readable statute library.** 21 Acts, ~2,900 KB of official text are
     sitting on disk being used only as embedding fodder. There is no free,
     searchable, mobile-readable copy of the PPC or the Constitution for an
     ordinary Pakistani — pakistancode.gov.pk serves PDFs that are unusable on a
     phone. We already have the text.

Parsed on first request and cached. The files are static between ingests, so
re-splitting them per request would be pointless work.
"""

from __future__ import annotations

import re
from pathlib import Path
from functools import lru_cache
from typing import Optional

from fastapi import APIRouter, HTTPException, Query

router = APIRouter()

LAWS_DIR = Path(__file__).resolve().parent.parent / "data" / "laws"

# id -> (display name, year, unit, short label used in citations)
CATALOGUE = {
    "ppc":                       ("Pakistan Penal Code", 1860, "Section", "PPC"),
    "crpc":                      ("Code of Criminal Procedure", 1898, "Section", "CrPC"),
    "cpc_1908":                  ("Code of Civil Procedure", 1908, "Section", "CPC"),
    "constitution_1973":         ("Constitution of Pakistan", 1973, "Article", "Constitution"),
    "qanun_e_shahadat":          ("Qanun-e-Shahadat Order", 1984, "Article", "QSO"),
    "peca_2016":                 ("Prevention of Electronic Crimes Act", 2016, "Section", "PECA"),
    "mflo_1961":                 ("Muslim Family Laws Ordinance", 1961, "Section", "MFLO"),
    "dmma_1939":                 ("Dissolution of Muslim Marriages Act", 1939, "Section", "DMMA"),
    "punjab_rent_2009":          ("Punjab Rented Premises Act", 2009, "Section", "Punjab Rent"),
    "industrial_relations_2012": ("Industrial Relations Act", 2012, "Section", "IRA"),
    "minimum_wages_1961":        ("Minimum Wages Ordinance", 1961, "Section", "Min. Wages"),
    "eobi_1976":                 ("Employees' Old-Age Benefits Act", 1976, "Section", "EOBI"),
    "harassment_2010":           ("Protection Against Harassment of Women at the Workplace Act", 2010, "Section", "Harassment Act"),
    "nab_ordinance_1999":        ("National Accountability Ordinance", 1999, "Section", "NAB"),
    "guardians_wards_1890":      ("Guardians and Wards Act", 1890, "Section", "GWA"),
    "payment_of_wages_1936":     ("Payment of Wages Act", 1936, "Section", "PoWA"),
    "employment_of_children_1991": ("Employment of Children Act", 1991, "Section", "ECA"),
    "factories_act_1934":        ("Factories Act", 1934, "Section", "Factories Act"),
    "partnership_act_1932":      ("Partnership Act", 1932, "Section", "Partnership Act"),
    "transfer_of_property_1882": ("Transfer of Property Act", 1882, "Section", "TPA"),
    "powers_of_attorney_1882":   ("Powers-of-Attorney Act", 1882, "Section", "PoA Act"),
}

# How a citation names its statute -> the file id. Used to resolve "302 PPC".
ALIAS = {
    "ppc": "ppc", "pakistan penal code": "ppc", "penal code": "ppc",
    "crpc": "crpc", "cr.p.c": "crpc", "criminal procedure": "crpc",
    "cpc": "cpc_1908", "civil procedure": "cpc_1908",
    "constitution": "constitution_1973",
    "qso": "qanun_e_shahadat", "qanun-e-shahadat": "qanun_e_shahadat",
    "peca": "peca_2016", "electronic crimes": "peca_2016",
    "mflo": "mflo_1961", "muslim family laws": "mflo_1961",
    "dmma": "dmma_1939", "dissolution of muslim marriages": "dmma_1939",
    "ira": "industrial_relations_2012", "industrial relations": "industrial_relations_2012",
    "eobi": "eobi_1976",
    "nab": "nab_ordinance_1999", "national accountability": "nab_ordinance_1999",
}


@lru_cache(maxsize=32)
def _sections(statute_id: str) -> list:
    """Split a statute into sections. Cached — the file is static between ingests."""
    meta = CATALOGUE.get(statute_id)
    if not meta:
        return []
    path = LAWS_DIR / f"{statute_id}.txt"
    if not path.exists():
        return []
    label = meta[2]
    text = path.read_text(encoding="utf-8", errors="ignore")

    out = []
    parts = re.split(rf"\n(?={label} \d+[A-Z]?\.)", text)
    for part in parts:
        m = re.match(rf"{label} (\d+[A-Z]?)\.\s*(.*)", part, re.S)
        if not m:
            continue
        num, body = m.group(1), m.group(2).strip()
        # The first sentence is the marginal heading; the rest is the provision.
        head = re.split(r"(?<=[.\u2014])\s", body, maxsplit=1)
        title = head[0].strip().rstrip(".\u2014 ")
        out.append({
            "number": num,
            "title": title[:160],
            "text": body,
        })
    return out


@router.get("/")
def list_statutes():
    """Every statute we hold, with its section count."""
    out = []
    for sid, (name, year, unit, short) in CATALOGUE.items():
        secs = _sections(sid)
        if not secs:
            continue
        out.append({
            "id": sid, "name": name, "year": year,
            "unit": unit.lower() + "s", "short": short,
            "count": len(secs),
        })
    return sorted(out, key=lambda x: x["name"])


# NOTE: this must be declared BEFORE /{statute_id} and /{statute_id}/{number}.
# FastAPI matches in declaration order, so with the parameterised routes first,
# "/resolve/citation" binds as statute_id="resolve", number="citation" and 404s.
@router.get("/resolve/citation")
def resolve_citation(text: str = Query(..., description='e.g. "302 PPC" or "10A Constitution"')):
    """
    Resolve a free-text citation to a statute + section.

    Lets the frontend linkify "Section 302 PPC" in an LLM answer without having
    to know the file layout.
    """
    m = re.match(r"\s*(?:Section|Article|s\.|§)?\s*(\d+[A-Za-z\-]*)\s*(?:of\s+(?:the\s+)?)?(.*)", text, re.I)
    if not m:
        raise HTTPException(status_code=422, detail="Could not read that as a citation.")
    num, act = m.group(1), (m.group(2) or "").strip().lower()

    sid = None
    for alias, target in sorted(ALIAS.items(), key=lambda kv: -len(kv[0])):
        if alias in act:
            sid = target
            break
    if not sid:
        raise HTTPException(status_code=404, detail="Couldn't tell which statute that citation refers to.")
    return get_section(sid, num)


@router.get("/{statute_id}")
def get_statute(statute_id: str, q: Optional[str] = Query(None, description="filter sections")):
    meta = CATALOGUE.get(statute_id)
    if not meta:
        raise HTTPException(status_code=404, detail="No such statute in the library.")
    secs = _sections(statute_id)
    if not secs:
        raise HTTPException(status_code=404, detail="That statute isn't loaded. Run scripts/fetch_laws.py")

    if q:
        low = q.lower()
        secs = [
            s for s in secs
            if low in s["title"].lower() or low in s["text"].lower() or low == s["number"].lower()
        ]

    name, year, unit, short = meta
    return {
        "id": statute_id, "name": name, "year": year,
        "unit": unit.lower() + "s", "short": short,
        "total": len(_sections(statute_id)),
        "matched": len(secs),
        # Bodies are trimmed in list view; the section endpoint returns them whole.
        "sections": [{"number": s["number"], "title": s["title"], "preview": s["text"][:260]} for s in secs],
        "source": "Pakistan Code, Ministry of Law and Justice",
    }


@router.get("/{statute_id}/{number}")
def get_section(statute_id: str, number: str):
    """
    One section, in full. This is what a citation link resolves to.

    Case-insensitive on the letter suffix, because people write 489F, 489-F and
    489f, and all three appear in real citations.
    """
    meta = CATALOGUE.get(statute_id)
    if not meta:
        raise HTTPException(status_code=404, detail="No such statute in the library.")

    wanted = number.upper().replace("-", "").replace(" ", "")
    for s in _sections(statute_id):
        if s["number"].upper().replace("-", "") == wanted:
            name, year, unit, short = meta
            return {
                "statute_id": statute_id, "statute": name, "year": year,
                "short": short, "unit": unit.lower(),
                "number": s["number"], "title": s["title"], "text": s["text"],
                "source": "Pakistan Code, Ministry of Law and Justice",
            }
    raise HTTPException(
        status_code=404,
        detail=f"{meta[2]} {number} is not in {meta[0]}. It may have been omitted or renumbered.",
    )
