from fastapi import APIRouter, Query, HTTPException
from pydantic import BaseModel
from typing import List, Optional

router = APIRouter()

RIGHTS_DATA = {
    "arrest": {
        "title": "Rights When Arrested",
        "law_references": ["Article 10, Constitution of Pakistan 1973", "CrPC Section 50-60"],
        "rights": [
            "You have the right to be informed of the grounds of your arrest immediately.",
            "You must be produced before a magistrate within 24 hours of arrest (Article 10(2)).",
            "You have the right to consult and be defended by a lawyer of your choice.",
            "You cannot be compelled to be a witness against yourself (Article 13).",
            "You have the right to remain silent during police questioning.",
            "Remand extensions must be authorized by a magistrate.",
            "Torture or inhumane treatment during custody is prohibited (Article 14).",
        ],
        "what_to_do": [
            "Immediately ask for the reason of your arrest.",
            "Request to contact your family or lawyer.",
            "Do not sign any document without legal advice.",
            "Note the names and badge numbers of arresting officers.",
        ],
    },
    "tenant": {
        "title": "Tenant Rights",
        "law_references": ["Sindh Rented Premises Ordinance 1979", "Punjab Rented Premises Act 2009", "Rent Restriction Ordinance"],
        "rights": [
            "Tenant cannot be evicted without a proper court order.",
            "Landlord must give written notice before eviction proceedings.",
            "Rent increases require proper notice and must follow provincial rent laws.",
            "Landlord cannot cut off utilities (water, electricity) to force eviction.",
            "Tenant has the right to a receipt for every rent payment.",
            "Security deposit must be returned at end of tenancy (minus legitimate deductions).",
        ],
        "what_to_do": [
            "Always sign a written rent agreement.",
            "Keep copies of all rent receipts.",
            "If facing illegal eviction, file a complaint in Rent Tribunal.",
            "Do not vacate under threats — legal process must be followed.",
        ],
    },
    "labour": {
        "title": "Worker / Labour Rights",
        "law_references": ["Industrial Relations Act 2012", "Factories Act 1934", "Minimum Wages Ordinance 1961", "EOBI Act 1976"],
        "rights": [
            "Workers are entitled to minimum wage as notified by provincial government.",
            "Maximum working hours: 8 hours/day, 48 hours/week (Factories Act).",
            "Overtime must be paid at double the regular rate.",
            "Annual leave: 14 days paid leave after 12 months of service.",
            "Female workers are entitled to 12 weeks maternity leave.",
            "Dismissal without cause or notice entitles worker to compensation.",
            "Workers can form or join trade unions.",
        ],
        "what_to_do": [
            "Get your appointment letter and employment contract in writing.",
            "Register with EOBI and SESSI/PESSI for social security.",
            "File complaint with Labour Department for violations.",
            "Join or form a trade union for collective bargaining.",
        ],
    },
    "consumer": {
        "title": "Consumer Rights",
        "law_references": ["Consumer Protection Act 2019 (Federal)", "Punjab Consumer Protection Act 2005"],
        "rights": [
            "Right to receive goods/services as described and advertised.",
            "Right to a refund or replacement for defective products.",
            "Right to accurate pricing — no hidden charges.",
            "Right to file complaint against unfair trade practices.",
            "Right to safety from hazardous goods.",
        ],
        "what_to_do": [
            "Always keep purchase receipts and invoices.",
            "File complaint at Consumer Court (free of cost, no lawyer required).",
            "You can claim compensation for damages caused by defective products.",
        ],
    },
    "women": {
        "title": "Women's Legal Rights",
        "law_references": ["Women Protection Act 2006", "Anti-Harassment Act 2010", "Muslim Family Laws Ordinance 1961"],
        "rights": [
            "Women have equal right to inherit property under Islamic law and MFLO.",
            "Harassment at workplace is a criminal offense (up to 3 years imprisonment).",
            "Minimum age of marriage is 16 (girls) and 18 (boys) under Child Marriage Restraint Act.",
            "Women have the right to seek Khula (divorce) through court.",
            "Dowry demands and dowry-related harassment are criminal offenses.",
            "Women have equal right to vote, hold public office, and own property.",
        ],
        "what_to_do": [
            "Report workplace harassment to the Ombudsperson for Protection Against Harassment.",
            "Contact Women Development Department or Dar-ul-Aman for domestic violence.",
            "Call 1099 (Punjab Women Helpline) or local police for emergencies.",
        ],
    },
    "cybercrime": {
        "title": "Cyber Crime Laws & Digital Rights",
        "law_references": ["Prevention of Electronic Crimes Act (PECA) 2016"],
        "rights": [
            "Online harassment, stalking, and defamation are criminal offenses under PECA.",
            "Unauthorized access to computer systems is punishable by up to 3 years imprisonment.",
            "Non-consensual sharing of intimate images is a criminal offense.",
            "Hate speech and incitement online is punishable.",
            "You can report cybercrime to FIA Cybercrime Wing.",
        ],
        "what_to_do": [
            "Report cybercrime at https://complaint.fia.gov.pk",
            "Preserve screenshots and evidence before reporting.",
            "Call FIA Cybercrime helpline: 9911",
        ],
    },
}


class RightsCategory(BaseModel):
    id: str
    title: str
    icon: str


class RightsDetail(BaseModel):
    title: str
    law_references: List[str]
    rights: List[str]
    what_to_do: List[str]


@router.get("/categories", response_model=List[RightsCategory])
def get_categories():
    icons = {
        "arrest": "🚔",
        "tenant": "🏠",
        "labour": "⚒️",
        "consumer": "🛒",
        "women": "👩",
        "cybercrime": "💻",
    }
    return [
        RightsCategory(id=k, title=v["title"], icon=icons.get(k, "⚖️"))
        for k, v in RIGHTS_DATA.items()
    ]


@router.get("/{category}", response_model=RightsDetail)
def get_rights(category: str):
    data = RIGHTS_DATA.get(category)
    if not data:
        raise HTTPException(status_code=404, detail="Category not found")
    return RightsDetail(**data)
