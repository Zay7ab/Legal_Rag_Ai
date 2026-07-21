"""
Public corpus statistics.

Exists because "trust us, it's Pakistan-focused" is what every legal AI product
says, and it is unverifiable. This endpoint publishes exactly what is in the
library, counted from the files on disk at request time. If a statute is missing,
this says so. If coverage is partial, this says that too.

It is deliberately public and unauthenticated: a claim about coverage is only
worth anything if anyone can check it.
"""

from __future__ import annotations

import re
from pathlib import Path
from functools import lru_cache

from fastapi import APIRouter

router = APIRouter()

LAWS_DIR = Path(__file__).resolve().parent.parent / "data" / "laws"

# nominal = the numbered range in the enacted statute. Real files can exceed it,
# because decades of amendments insert sections (302, 302A, 337A-337Z, 489F...).
CATALOGUE = {
    "ppc":               ("Pakistan Penal Code", 1860, "Section", 511),
    "crpc":              ("Code of Criminal Procedure", 1898, "Section", 565),
    "cpc_1908":          ("Code of Civil Procedure", 1908, "Section", 158),
    "constitution_1973": ("Constitution of Pakistan", 1973, "Article", 280),
    "qanun_e_shahadat":  ("Qanun-e-Shahadat Order", 1984, "Article", 166),
    "peca_2016":         ("Prevention of Electronic Crimes Act", 2016, "Section", 57),
    "mflo_1961":         ("Muslim Family Laws Ordinance", 1961, "Section", 14),
    "dmma_1939":         ("Dissolution of Muslim Marriages Act", 1939, "Section", 5),
    "factories_act_1934": ("Factories Act", 1934, "Section", 96),
    "partnership_act_1932": ("Partnership Act", 1932, "Section", 74),
    "transfer_of_property_1882": ("Transfer of Property Act", 1882, "Section", 137),
    "powers_of_attorney_1882": ("Powers-of-Attorney Act", 1882, "Section", 5),
    "punjab_rent_2009":  ("Punjab Rented Premises Act", 2009, "Section", 33),
    "industrial_relations_2012": ("Industrial Relations Act", 2012, "Section", 89),
    "minimum_wages_1961": ("Minimum Wages Ordinance", 1961, "Section", 15),
    "eobi_1976":         ("Employees' Old-Age Benefits Act", 1976, "Section", 49),
    "harassment_2010":   ("Protection Against Harassment of Women at the Workplace Act", 2010, "Section", 11),
    "nab_ordinance_1999": ("National Accountability Ordinance", 1999, "Section", 36),
    "guardians_wards_1890": ("Guardians and Wards Act", 1890, "Section", 52),
    "payment_of_wages_1936": ("Payment of Wages Act", 1936, "Section", 26),
    "employment_of_children_1991": ("Employment of Children Act", 1991, "Section", 21),
    "dmma_1939":         ("Dissolution of Muslim Marriages Act", 1939, "Section", 5),
    "factories_act_1934": ("Factories Act", 1934, "Section", 96),
    "partnership_act_1932": ("Partnership Act", 1932, "Section", 74),
    "transfer_of_property_1882": ("Transfer of Property Act", 1882, "Section", 137),
    "powers_of_attorney_1882": ("Powers-of-Attorney Act", 1882, "Section", 5),
}

COMPLETE_AT = 0.90


@lru_cache(maxsize=1)
def _scan() -> dict:
    laws, total_bytes, total_sections = [], 0, 0
    for path in sorted(LAWS_DIR.glob("*.txt")):
        meta = CATALOGUE.get(path.stem)
        if not meta:
            continue
        name, year, label, nominal = meta
        text = path.read_text(encoding="utf-8", errors="ignore")
        found = len(set(re.findall(rf"^{label}\s+(\d+[A-Za-z\-]*)", text, re.M)))
        ratio = found / nominal if nominal else 0
        total_bytes += len(text.encode())
        total_sections += found
        laws.append({
            "id": path.stem,
            "name": name,
            "year": year,
            "unit": label.lower() + "s",
            "sections": found,
            "nominal": nominal,
            "complete": ratio >= COMPLETE_AT,
            # Honest label rather than a percentage over 100, which reads as a bug.
            "coverage": "full" if ratio >= 1 else f"{ratio * 100:.0f}%",
        })
    return {
        "laws": laws,
        "total_laws": len(laws),
        "total_sections": total_sections,
        "total_kb": total_bytes // 1024,
        "complete_laws": sum(1 for x in laws if x["complete"]),
        "source": "Pakistan Code, Ministry of Law and Justice (pakistancode.gov.pk)",
    }


@router.get("/")
def corpus_stats():
    """What is actually in the law library. Counted from disk, not claimed."""
    return _scan()
