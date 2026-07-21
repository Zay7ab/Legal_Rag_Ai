"""
Query expansion: how people speak -> how statutes are written.

The gap this closes
-------------------
"Khula ka procedure kya hai?" retrieved nothing useful even after the
Dissolution of Muslim Marriages Act 1939 was added to the corpus. The Act never
uses the word *khula*. It says "dissolution of marriage". The user's word and
the statute's word do not overlap, and no embedding model bridges that on its
own — it isn't a paraphrase, it's a register change.

This is the actual hard problem in Pakistani legal NLP, and it is worse here than
in most jurisdictions:

  - Pakistanis ask in Roman Urdu ("qatl", "zamanat", "parchi")
  - the statutes are in English, but keep Arabic/Urdu legal terms untranslated
    ("qatl-i-amd", "diyat", "ta'zir") -- so it is not simply English vs Urdu
  - the everyday word and the statutory word are often different words entirely
    (khula -> dissolution of marriage; parchi -> summons)

Design
------
Expansion is ADDITIVE and only applied to retrieval. The user's words stay in the
query; statutory terms are appended. That matters:

  - if the mapping is wrong, the original terms still drive retrieval, so a bad
    entry degrades the query rather than hijacking it
  - the LLM never sees the expansion, so it cannot start using vocabulary the
    user didn't
  - the grounding decision is still made on real similarity, not on a keyword
    having been injected

Every entry maps a term people actually use to language that actually appears in
the corpus. Verified with scripts/verify_expansions.py — an expansion pointing at
words no statute contains is worse than none, because it adds noise to every
query that trips it.
"""

from __future__ import annotations

import re

# term (as people write it) -> statutory language (as the corpus writes it)
#
# Keys are matched on word boundaries, case-insensitively, and cover the common
# Roman Urdu spellings. Where a term is genuinely ambiguous ("case"), it's left
# out — a wrong expansion costs more than a missing one.
EXPANSIONS: dict[str, str] = {
    # ── Family ────────────────────────────────────────────────────────────────
    # khula appears nowhere in the DMMA; the Act says "dissolution of marriage"
    "khula":        "dissolution of marriage decree wife entitled grounds",
    "khulla":       "dissolution of marriage decree wife entitled grounds",
    "talaq":        "talaq divorce notice Chairman Union Council ninety days",
    "talak":        "talaq divorce notice Chairman Union Council",
    "nikah":        "marriage solemnized registration nikah",
    "haq mehr":     "dower mehr payable wife",
    "mehr":         "dower mehr payable wife",
    "haq meher":    "dower mehr payable wife",
    "iddat":        "iddat period dissolution marriage",
    "custody":      "guardian custody minor welfare",
    "bachay ki custody": "guardian custody minor welfare of the minor",
    "kharcha":      "maintenance wife children",
    "nan nafqa":    "maintenance wife children",
    "nafqa":        "maintenance wife children",

    # ── Criminal ──────────────────────────────────────────────────────────────
    "qatl":         "qatl-i-amd culpable homicide causing death punishment",
    "khoon":        "qatl-i-amd causing death",
    "zamanat":      "bail bailable non-bailable released on bail",
    "zamanat qabl az giraftari": "bail before arrest anticipatory",
    "parchi":       "summons served attendance",
    "warrant":      "warrant of arrest issued Magistrate",
    "fir":          "information cognizable offence officer in charge police station",
    "girftar":      "arrest arrested without warrant",
    "giraftari":    "arrest arrested without warrant",
    "chori":        "theft dishonestly takes movable property",
    "daketi":       "dacoity robbery",
    "dhoka":        "cheating dishonestly induce deliver property",
    "fraud":        "cheating dishonestly induce deliver property fraudulently",
    "cheque bounce": "dishonestly issues a cheque dishonoured presentation",
    "rishwat":      "gratification corruption corrupt practices public office",
    "bribe":        "gratification corruption corrupt practices",
    "harassment":   "harassment workplace unwelcome sexual advance",
    "blackmail":    "extortion threat modesty explicit",

    # ── Property / civil ──────────────────────────────────────────────────────
    "kiraya":       "rent tenant landlord premises",
    "kirayadar":    "tenant landlord rented premises",
    "makan malik":  "landlord owner premises",
    "bedakhli":     "eviction ejectment tenant possession",
    "eviction":     "eviction ejectment possession tenant",
    "jaidad":       "property immovable transfer",
    "intiqal":      "transfer of property sale deed",
    "wirasat":      "inheritance succession heirs",
    "warasat":      "inheritance succession heirs",

    # ── Employment ────────────────────────────────────────────────────────────
    "tankhwa":      "wages payment wages deduction",
    "salary":       "wages payment of wages deduction employer",
    "naukri":       "employment employer workman termination",
    "mulazmat":     "employment employer workman",
    "bartaraf":     "termination dismissal workman",
    "pension":      "old-age benefit insured person pension",

    # ── Cyber ─────────────────────────────────────────────────────────────────
    "cybercrime":   "electronic crimes information system unauthorised access",
    "hacking":      "unauthorised access information system data",
    "online harassment": "modesty natural person explicit dignity",
}

# Longest first, so "zamanat qabl az giraftari" wins over "zamanat".
_ORDERED = sorted(EXPANSIONS.items(), key=lambda kv: -len(kv[0]))
_PATTERNS = [(re.compile(rf"\b{re.escape(k)}\b", re.I), v) for k, v in _ORDERED]

MAX_ADDED = 140   # keep the query focused; a bloated query retrieves mush


def expand(query: str) -> str:
    """
    Append statutory language for any everyday terms found.

    Returns the original query with terms appended, or unchanged if nothing
    matched. Never replaces the user's words.
    """
    if not query:
        return query
    added, seen = [], set()
    for pattern, statutory in _PATTERNS:
        if pattern.search(query):
            for word in statutory.split():
                low = word.lower()
                if low not in seen and low not in query.lower():
                    seen.add(low)
                    added.append(word)
    if not added:
        return query
    tail = " ".join(added)[:MAX_ADDED]
    return f"{query} {tail}"


def matched_terms(query: str) -> list:
    """Which everyday terms fired. For debugging and the eval harness."""
    return [k for k, _ in _ORDERED if re.search(rf"\b{re.escape(k)}\b", query, re.I)]
