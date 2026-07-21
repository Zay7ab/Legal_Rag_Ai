"""
Document generation service — Phase 4
- Real PDF generation via ReportLab
- 8 legal document templates
- Bilingual support (English / Urdu header)
- AI-assisted field suggestions via LLM
"""

from typing import List, Dict, Any, Optional
from pathlib import Path
from jinja2 import Environment, BaseLoader
import tempfile, os, textwrap
from datetime import date

# ── Template definitions ───────────────────────────────────────────────────────

TEMPLATES = [
    {
        "id": "rent_agreement",
        "name": "Residential Rent Agreement",
        "category": "rental",
        "icon": "🏠",
        "description": "Standard rent agreement compliant with Punjab/Sindh/KPK/Balochistan rent laws",
        "fields": [
            {"id": "landlord_name",    "label": "Landlord Full Name",         "type": "text",     "required": True},
            {"id": "landlord_cnic",    "label": "Landlord CNIC",              "type": "text",     "required": True},
            {"id": "tenant_name",      "label": "Tenant Full Name",           "type": "text",     "required": True},
            {"id": "tenant_cnic",      "label": "Tenant CNIC",                "type": "text",     "required": True},
            {"id": "property_address", "label": "Property Address",           "type": "textarea", "required": True},
            {"id": "property_type",    "label": "Property Type (House/Flat/Shop)", "type": "text","required": True},
            {"id": "rent_amount",      "label": "Monthly Rent (PKR)",         "type": "number",   "required": True},
            {"id": "security_deposit", "label": "Security Deposit (PKR)",     "type": "number",   "required": True},
            {"id": "start_date",       "label": "Agreement Start Date",       "type": "date",     "required": True},
            {"id": "duration_months",  "label": "Duration (months)",          "type": "number",   "required": True},
            {"id": "city",             "label": "City",                       "type": "text",     "required": True},
            {"id": "witness1_name",    "label": "Witness 1 Name",             "type": "text",     "required": True},
            {"id": "witness2_name",    "label": "Witness 2 Name",             "type": "text",     "required": True},
        ],
    },
    {
        "id": "affidavit_general",
        "name": "General Affidavit",
        "category": "affidavit",
        "icon": "📜",
        "description": "General purpose sworn affidavit for Pakistani courts and government offices",
        "fields": [
            {"id": "deponent_name",    "label": "Deponent Full Name",         "type": "text",     "required": True},
            {"id": "deponent_cnic",    "label": "Deponent CNIC",              "type": "text",     "required": True},
            {"id": "deponent_father",  "label": "Father's / Husband's Name",  "type": "text",     "required": True},
            {"id": "deponent_address", "label": "Deponent Address",           "type": "textarea", "required": True},
            {"id": "statement",        "label": "Statement / Declaration",    "type": "textarea", "required": True},
            {"id": "city",             "label": "City",                       "type": "text",     "required": True},
            {"id": "date",             "label": "Date",                       "type": "date",     "required": True},
        ],
    },
    {
        "id": "employment_contract",
        "name": "Employment Contract",
        "category": "employment",
        "icon": "💼",
        "description": "Standard employment agreement compliant with Industrial Relations Act 2012",
        "fields": [
            {"id": "employer_name",    "label": "Employer / Company Name",    "type": "text",     "required": True},
            {"id": "employer_address", "label": "Employer Address",           "type": "textarea", "required": True},
            {"id": "employee_name",    "label": "Employee Full Name",         "type": "text",     "required": True},
            {"id": "employee_cnic",    "label": "Employee CNIC",              "type": "text",     "required": True},
            {"id": "designation",      "label": "Designation / Job Title",    "type": "text",     "required": True},
            {"id": "department",       "label": "Department",                 "type": "text",     "required": False},
            {"id": "salary",           "label": "Monthly Salary (PKR)",       "type": "number",   "required": True},
            {"id": "start_date",       "label": "Joining Date",               "type": "date",     "required": True},
            {"id": "probation_months", "label": "Probation Period (months)",  "type": "number",   "required": False},
            {"id": "annual_leave",     "label": "Annual Leave (days)",        "type": "number",   "required": False},
            {"id": "city",             "label": "City",                       "type": "text",     "required": True},
        ],
    },
    {
        "id": "noc_property",
        "name": "No Objection Certificate (NOC)",
        "category": "civil",
        "icon": "📋",
        "description": "NOC from property owner for construction, sale, rent, or other purposes",
        "fields": [
            {"id": "owner_name",       "label": "Property Owner Name",        "type": "text",     "required": True},
            {"id": "owner_cnic",       "label": "Owner CNIC",                 "type": "text",     "required": True},
            {"id": "property_address", "label": "Property Address",           "type": "textarea", "required": True},
            {"id": "beneficiary_name", "label": "Beneficiary / Applicant Name","type": "text",    "required": True},
            {"id": "purpose",          "label": "Purpose of NOC",             "type": "text",     "required": True},
            {"id": "date",             "label": "Date",                       "type": "date",     "required": True},
            {"id": "city",             "label": "City",                       "type": "text",     "required": True},
        ],
    },
    {
        "id": "power_of_attorney",
        "name": "Power of Attorney (Special)",
        "category": "civil",
        "icon": "⚖️",
        "description": "Special Power of Attorney for property, legal, or financial matters in Pakistan",
        "fields": [
            {"id": "principal_name",   "label": "Principal (Grantor) Full Name","type": "text",   "required": True},
            {"id": "principal_cnic",   "label": "Principal CNIC",             "type": "text",     "required": True},
            {"id": "principal_address","label": "Principal Address",          "type": "textarea", "required": True},
            {"id": "attorney_name",    "label": "Attorney (Agent) Full Name", "type": "text",     "required": True},
            {"id": "attorney_cnic",    "label": "Attorney CNIC",              "type": "text",     "required": True},
            {"id": "attorney_address", "label": "Attorney Address",           "type": "textarea", "required": True},
            {"id": "powers_granted",   "label": "Powers Granted (describe)",  "type": "textarea", "required": True},
            {"id": "date",             "label": "Date",                       "type": "date",     "required": True},
            {"id": "city",             "label": "City",                       "type": "text",     "required": True},
            {"id": "witness1_name",    "label": "Witness 1 Name",             "type": "text",     "required": True},
            {"id": "witness2_name",    "label": "Witness 2 Name",             "type": "text",     "required": True},
        ],
    },
    {
        "id": "partnership_deed",
        "name": "Partnership Deed",
        "category": "business",
        "icon": "🤝",
        "description": "Business partnership agreement under Partnership Act 1932 of Pakistan",
        "fields": [
            {"id": "firm_name",        "label": "Firm / Business Name",       "type": "text",     "required": True},
            {"id": "business_address", "label": "Business Address",           "type": "textarea", "required": True},
            {"id": "business_nature",  "label": "Nature of Business",         "type": "text",     "required": True},
            {"id": "partner1_name",    "label": "Partner 1 Full Name",        "type": "text",     "required": True},
            {"id": "partner1_cnic",    "label": "Partner 1 CNIC",             "type": "text",     "required": True},
            {"id": "partner1_share",   "label": "Partner 1 Share (%)",        "type": "number",   "required": True},
            {"id": "partner2_name",    "label": "Partner 2 Full Name",        "type": "text",     "required": True},
            {"id": "partner2_cnic",    "label": "Partner 2 CNIC",             "type": "text",     "required": True},
            {"id": "partner2_share",   "label": "Partner 2 Share (%)",        "type": "number",   "required": True},
            {"id": "capital_amount",   "label": "Total Capital (PKR)",        "type": "number",   "required": True},
            {"id": "start_date",       "label": "Partnership Start Date",     "type": "date",     "required": True},
            {"id": "city",             "label": "City",                       "type": "text",     "required": True},
        ],
    },
    {
        "id": "legal_notice",
        "name": "Legal Notice",
        "category": "civil",
        "icon": "📮",
        "description": "Formal legal notice as required before filing a civil suit in Pakistani courts",
        "fields": [
            {"id": "sender_name",      "label": "Sender Full Name",           "type": "text",     "required": True},
            {"id": "sender_address",   "label": "Sender Address",             "type": "textarea", "required": True},
            {"id": "sender_cnic",      "label": "Sender CNIC",                "type": "text",     "required": True},
            {"id": "recipient_name",   "label": "Recipient Full Name / Company","type": "text",   "required": True},
            {"id": "recipient_address","label": "Recipient Address",          "type": "textarea", "required": True},
            {"id": "subject",          "label": "Subject / Matter",           "type": "text",     "required": True},
            {"id": "facts",            "label": "Facts of the Matter",        "type": "textarea", "required": True},
            {"id": "demand",           "label": "Demand / Relief Sought",     "type": "textarea", "required": True},
            {"id": "deadline_days",    "label": "Response Deadline (days)",   "type": "number",   "required": True},
            {"id": "date",             "label": "Date",                       "type": "date",     "required": True},
            {"id": "city",             "label": "City",                       "type": "text",     "required": True},
        ],
    },
    {
        "id": "divorce_deed",
        "name": "Divorce Deed (Talaq Nama)",
        "category": "family",
        "icon": "📝",
        "description": "Deed of divorce (Talaq) under Muslim Family Laws Ordinance 1961",
        "fields": [
            {"id": "husband_name",     "label": "Husband Full Name",          "type": "text",     "required": True},
            {"id": "husband_cnic",     "label": "Husband CNIC",               "type": "text",     "required": True},
            {"id": "husband_address",  "label": "Husband Address",            "type": "textarea", "required": True},
            {"id": "wife_name",        "label": "Wife Full Name",             "type": "text",     "required": True},
            {"id": "wife_cnic",        "label": "Wife CNIC",                  "type": "text",     "required": True},
            {"id": "nikah_date",       "label": "Date of Nikah",              "type": "date",     "required": True},
            {"id": "mehr_amount",      "label": "Mehr Amount (PKR)",          "type": "number",   "required": True},
            {"id": "mehr_paid",        "label": "Mehr Paid / Deferred",       "type": "text",     "required": True},
            {"id": "talaq_type",       "label": "Type of Talaq (Ahsan/Hasan/Bid'ah)","type": "text","required": True},
            {"id": "date",             "label": "Date of Talaq",              "type": "date",     "required": True},
            {"id": "city",             "label": "City",                       "type": "text",     "required": True},
            {"id": "witness1_name",    "label": "Witness 1 Name",             "type": "text",     "required": True},
            {"id": "witness2_name",    "label": "Witness 2 Name",             "type": "text",     "required": True},
        ],
    },
]

# ── Jinja2 template text ───────────────────────────────────────────────────────

TEMPLATE_TEXTS = {

"rent_agreement": """\
RESIDENTIAL RENT AGREEMENT
══════════════════════════════════════════════════════

This Rent Agreement is entered into on {{ start_date }} at {{ city }} between:

LANDLORD : {{ landlord_name }}  |  CNIC: {{ landlord_cnic }}
TENANT   : {{ tenant_name }}    |  CNIC: {{ tenant_cnic }}

PROPERTY : {{ property_address }}
TYPE     : {{ property_type }}

TERMS AND CONDITIONS
────────────────────

1. RENT
   The monthly rent shall be PKR {{ rent_amount | int | format_pk }} payable on or before
   the 5th of each calendar month.

2. SECURITY DEPOSIT
   A refundable security deposit of PKR {{ security_deposit | int | format_pk }} has been
   received by the Landlord, to be returned at termination minus lawful deductions.

3. DURATION
   This agreement is for {{ duration_months }} months commencing {{ start_date }}.
   It shall automatically expire unless renewed in writing.

4. UTILITIES
   Tenant is solely responsible for electricity, gas, water, and telephone bills.

5. MAINTENANCE
   Tenant shall maintain the property in good condition. No structural alterations
   without prior written consent of the Landlord.

6. SUBLETTING
   Subletting or assignment of this tenancy is prohibited without written consent.

7. TERMINATION
   Either party may terminate with ONE (1) month's written notice to the other.

8. EVICTION
   Eviction proceedings, if required, shall be initiated through the competent
   Rent Tribunal under applicable provincial rent laws.

9. GOVERNING LAW
   This agreement is governed by the applicable provincial rent law of Pakistan
   (Punjab Rented Premises Act 2009 / the applicable provincial rent law (Sindh: Rented Premises Ordinance 1979 — verify locally) etc.)

══════════════════════════════════════════════════════
SIGNATURES

Landlord: _______________________    Tenant: _______________________
{{ landlord_name }}                  {{ tenant_name }}
CNIC: {{ landlord_cnic }}            CNIC: {{ tenant_cnic }}

WITNESSES:
1. Name: {{ witness1_name }}   Signature: _____________
2. Name: {{ witness2_name }}   Signature: _____________

Date: {{ start_date }}   Place: {{ city }}
""",

"affidavit_general": """\
AFFIDAVIT
══════════════════════════════════════════════════════

I, {{ deponent_name }}, son/daughter/wife of {{ deponent_father }},
holder of CNIC No. {{ deponent_cnic }}, residing at:

   {{ deponent_address }}

do hereby solemnly affirm on oath and declare as under:

────────────────────────────────────────────────────────
THAT {{ statement }}
────────────────────────────────────────────────────────

VERIFICATION

Verified on oath at {{ city }} on this day {{ date }} that the contents of
this affidavit are true and correct to the best of my knowledge and belief,
and nothing material has been concealed or misstated.

DEPONENT

Name      : {{ deponent_name }}
CNIC      : {{ deponent_cnic }}
Signature : _______________________

══════════════════════════════════════════════════════
Sworn before me:

Commissioner of Oaths / Oath Commissioner
Date: {{ date }}   Place: {{ city }}
""",

"employment_contract": """\
EMPLOYMENT CONTRACT
══════════════════════════════════════════════════════

This Employment Contract is entered into on {{ start_date }} between:

EMPLOYER : {{ employer_name }}
ADDRESS  : {{ employer_address }}

EMPLOYEE : {{ employee_name }}  |  CNIC: {{ employee_cnic }}

TERMS OF EMPLOYMENT
────────────────────

1. DESIGNATION   : {{ designation }}{% if department %}  |  Department: {{ department }}{% endif %}

2. COMMENCEMENT  : {{ start_date }}

3. PROBATION     : {% if probation_months and probation_months > 0 %}{{ probation_months }} months probationary period applies.
                   Either party may terminate during probation with 7 days' notice.
                   {% else %}No probationary period. Employment is confirmed from day one.{% endif %}

4. SALARY        : PKR {{ salary | int | format_pk }} per month, payable by the last working
                   day of each calendar month.

5. WORKING HOURS : As per company policy. Not to exceed 8 hours/day or 48 hours/week
                   (Factories Act 1934). Overtime shall be compensated at double rate.

6. ANNUAL LEAVE  : {{ annual_leave if annual_leave else 14 }} days paid annual leave per year
                   as per applicable labour laws (minimum 14 days required by law).

7. OTHER LEAVES  : Sick leave, casual leave, and maternity/paternity leave as per
                   applicable provincial labour laws.

8. EOBI / SESSI  : Employer shall register employee with EOBI and applicable social
                   security institution (SESSI / PESSI / KPESSI) as required by law.

9. TERMINATION   : Either party may terminate with ONE (1) month's written notice or
                   salary in lieu thereof. Termination for cause requires show-cause
                   process under the Industrial Relations Act 2012.

10. CONFIDENTIALITY : Employee shall maintain confidentiality of all proprietary
                    information during and after employment.

11. GOVERNING LAW : This contract is subject to Industrial Relations Act 2012,
                    Factories Act 1934, and other applicable Pakistan labour laws.

══════════════════════════════════════════════════════
SIGNATURES

Employer: _______________________    Employee: _______________________
{{ employer_name }}                  {{ employee_name }}

Date: {{ start_date }}   Place: {{ city }}
""",

"noc_property": """\
NO OBJECTION CERTIFICATE
══════════════════════════════════════════════════════

Date  : {{ date }}
Place : {{ city }}

TO WHOM IT MAY CONCERN

I, {{ owner_name }}, holder of CNIC No. {{ owner_cnic }}, being the lawful
and registered owner of the property situated at:

   {{ property_address }}

do hereby voluntarily issue this No Objection Certificate (NOC) in favour of:

   {{ beneficiary_name }}

for the following purpose:

   {{ purpose }}

I confirm that:
  (a) I have no objection whatsoever to the above-stated purpose.
  (b) This NOC is issued of my own free will without any coercion or undue influence.
  (c) I am legally competent to issue this certificate.

This NOC shall remain valid for 90 days from the date of issue unless
specifically stated otherwise.

══════════════════════════════════════════════════════
Property Owner

Name      : {{ owner_name }}
CNIC      : {{ owner_cnic }}
Signature : _______________________

Date: {{ date }}   Place: {{ city }}

Witness   : _______________________
""",

"power_of_attorney": """\
SPECIAL POWER OF ATTORNEY
══════════════════════════════════════════════════════

Date  : {{ date }}
Place : {{ city }}

KNOW ALL PERSONS BY THESE PRESENTS:

I, {{ principal_name }}, holder of CNIC No. {{ principal_cnic }},
residing at:
   {{ principal_address }}

(hereinafter "the Principal") hereby appoint and constitute:

{{ attorney_name }}, holder of CNIC No. {{ attorney_cnic }},
residing at:
   {{ attorney_address }}

(hereinafter "the Attorney") as my true and lawful attorney to act on my
behalf with full power and authority to do the following:

POWERS GRANTED
────────────────
{{ powers_granted }}

────────────────────────────────────────────────────────

GENERAL PROVISIONS
1. The Attorney shall exercise these powers in good faith and in my best interest.
2. This Power of Attorney shall remain valid until revoked in writing.
3. Third parties may rely on this document in good faith.
4. This document is executed under the Powers-of-Attorney Act 1882 of Pakistan.

══════════════════════════════════════════════════════
SIGNATURES

Principal: _______________________    Attorney: _______________________
{{ principal_name }}                  {{ attorney_name }}
CNIC: {{ principal_cnic }}            CNIC: {{ attorney_cnic }}

WITNESSES:
1. Name: {{ witness1_name }}   Signature: _____________   CNIC: _____________
2. Name: {{ witness2_name }}   Signature: _____________   CNIC: _____________

Notarized / Attested before: _______________________
Date: {{ date }}   Place: {{ city }}
""",

"partnership_deed": """\
PARTNERSHIP DEED
══════════════════════════════════════════════════════

This Partnership Deed is entered into on {{ start_date }} at {{ city }} between:

PARTNER 1 : {{ partner1_name }}  |  CNIC: {{ partner1_cnic }}  |  Share: {{ partner1_share }}%
PARTNER 2 : {{ partner2_name }}  |  CNIC: {{ partner2_cnic }}  |  Share: {{ partner2_share }}%

FIRM NAME    : {{ firm_name }}
BUSINESS     : {{ business_nature }}
ADDRESS      : {{ business_address }}
TOTAL CAPITAL: PKR {{ capital_amount | int | format_pk }}

TERMS OF PARTNERSHIP
────────────────────

1. CAPITAL CONTRIBUTION
   Partner 1 ({{ partner1_name }}) shall contribute {{ partner1_share }}% of total capital.
   Partner 2 ({{ partner2_name }}) shall contribute {{ partner2_share }}% of total capital.

2. PROFIT & LOSS SHARING
   Profits and losses shall be shared in proportion to capital contribution:
   - {{ partner1_name }}: {{ partner1_share }}%
   - {{ partner2_name }}: {{ partner2_share }}%

3. MANAGEMENT
   Both partners shall jointly manage the business. Major decisions require
   unanimous consent of all partners.

4. BANKING
   A joint bank account shall be maintained. Transactions above PKR 50,000
   require both partners' signatures.

5. ACCOUNTS & AUDIT
   Proper books of accounts shall be maintained. Annual audit is mandatory.

6. RETIREMENT / WITHDRAWAL
   Any partner may retire with 3 months' written notice. Retiring partner
   shall be entitled to their capital share and accumulated profit.

7. DISSOLUTION
   The firm may be dissolved by mutual consent or as per Partnership Act 1932.

8. GOVERNING LAW
   This deed is governed by the Partnership Act 1932 of Pakistan.

══════════════════════════════════════════════════════
SIGNATURES

Partner 1: _______________________    Partner 2: _______________________
{{ partner1_name }}                   {{ partner2_name }}
CNIC: {{ partner1_cnic }}             CNIC: {{ partner2_cnic }}

Date: {{ start_date }}   Place: {{ city }}
""",

"legal_notice": """\
LEGAL NOTICE
══════════════════════════════════════════════════════

Date  : {{ date }}
Place : {{ city }}

FROM:
{{ sender_name }}
CNIC: {{ sender_cnic }}
{{ sender_address }}

TO:
{{ recipient_name }}
{{ recipient_address }}

SUBJECT: {{ subject }}

══════════════════════════════════════════════════════

Dear {{ recipient_name }},

TAKE NOTICE THAT:

FACTS:
{{ facts }}

DEMAND / RELIEF:
{{ demand }}

You are hereby called upon to comply with the above demand within
{{ deadline_days }} days from the date of receipt of this notice.

PLEASE TAKE NOTICE FURTHER that in the event of your failure to comply
within the stipulated period, my client shall be constrained to initiate
legal proceedings against you in the court of competent jurisdiction,
without further reference to you, and you shall be held liable for all
costs and consequences thereof.

This notice is without prejudice to any other legal rights and remedies
available to my client.

══════════════════════════════════════════════════════
Issued by:

{{ sender_name }}
CNIC: {{ sender_cnic }}
Date: {{ date }}
""",

"divorce_deed": """\
DEED OF DIVORCE (TALAQ NAMA)
══════════════════════════════════════════════════════

Executed under the Muslim Family Laws Ordinance 1961

Date  : {{ date }}
Place : {{ city }}

HUSBAND : {{ husband_name }}  |  CNIC: {{ husband_cnic }}
ADDRESS : {{ husband_address }}

WIFE    : {{ wife_name }}  |  CNIC: {{ wife_cnic }}

NIKAH DATE : {{ nikah_date }}
MEHR       : PKR {{ mehr_amount | int | format_pk }} — Status: {{ mehr_paid }}

DECLARATION OF TALAQ
────────────────────

I, {{ husband_name }}, holder of CNIC {{ husband_cnic }}, hereby pronounce
Talaq ({{ talaq_type }}) upon my wife {{ wife_name }}, holder of CNIC {{ wife_cnic }},
on this day {{ date }}.

LEGAL COMPLIANCE
1. NOTICE TO UNION COUNCIL: Under Section 7(1) of the Muslim Family Laws
   Ordinance 1961, the husband must give the Chairman of the relevant Union
   Council notice in writing "as soon as may be" after pronouncement, and supply
   a copy to the wife. Failing to do so is an offence under Section 7(2):
   simple imprisonment up to one year, or fine up to five thousand rupees, or both.

2. WHEN THE TALAQ TAKES EFFECT: Under Section 7(3), the talaq is not effective
   until ninety days from the day the notice is delivered to the Chairman —
   not from the date of pronouncement — unless revoked earlier.

3. ARBITRATION COUNCIL: Under Section 7(4), within thirty days of receiving the
   notice the Chairman shall constitute an Arbitration Council to attempt
   reconciliation between the parties.

4. IDDAT PERIOD: Wife shall observe Iddat as per Islamic law.

5. MEHR: The outstanding mehr (if any) is due and payable to the wife.

6. RECONCILIATION: The parties may reconcile before the talaq becomes
   effective; a talaq revoked before then does not take effect (Section 7(3)).

══════════════════════════════════════════════════════
SIGNATURES

Husband: _______________________    Wife (if consenting): _______________________
{{ husband_name }}                  {{ wife_name }}
CNIC: {{ husband_cnic }}            CNIC: {{ wife_cnic }}

WITNESSES:
1. Name: {{ witness1_name }}   Signature: _____________
2. Name: {{ witness2_name }}   Signature: _____________

Date: {{ date }}   Place: {{ city }}

NOTE: This document does not constitute legal advice. Parties should
consult a qualified lawyer. Filing with Union Council is mandatory.
""",
}

# ── Number formatter ───────────────────────────────────────────────────────────

def _format_pk(value):
    """Format number as Pakistani Rupee: 1,00,000"""
    try:
        n = int(value)
        s = str(n)
        if len(s) <= 3:
            return s
        result = s[-3:]
        s = s[:-3]
        while len(s) > 2:
            result = s[-2:] + ',' + result
            s = s[:-2]
        if s:
            result = s + ',' + result
        return result
    except Exception:
        return str(value)


# ── PDF Builder (ReportLab) ────────────────────────────────────────────────────

def _build_pdf(content: str, title: str, output_path: str):
    """Render document content to a styled PDF using ReportLab."""
    try:
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.units import cm
        from reportlab.lib import colors
        from reportlab.platypus import (
            SimpleDocTemplate, Paragraph, Spacer, HRFlowable, Table, TableStyle
        )
        from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY

        doc = SimpleDocTemplate(
            output_path,
            pagesize=A4,
            rightMargin=2.5*cm,
            leftMargin=2.5*cm,
            topMargin=2.5*cm,
            bottomMargin=2.5*cm,
        )

        styles = getSampleStyleSheet()
        NAVY = colors.HexColor("#0a1628")
        GOLD = colors.HexColor("#c8962e")
        LIGHT_GRAY = colors.HexColor("#f5f5f5")

        # Custom styles
        title_style = ParagraphStyle(
            "DocTitle", parent=styles["Title"],
            fontSize=16, textColor=NAVY,
            fontName="Helvetica-Bold", alignment=TA_CENTER,
            spaceAfter=6,
        )
        subtitle_style = ParagraphStyle(
            "DocSubtitle", parent=styles["Normal"],
            fontSize=9, textColor=colors.gray,
            alignment=TA_CENTER, spaceAfter=4,
        )
        heading_style = ParagraphStyle(
            "SectionHead", parent=styles["Normal"],
            fontSize=10, textColor=NAVY,
            fontName="Helvetica-Bold", spaceBefore=10, spaceAfter=4,
        )
        body_style = ParagraphStyle(
            "Body", parent=styles["Normal"],
            fontSize=9.5, leading=15,
            textColor=colors.black, alignment=TA_JUSTIFY,
            spaceAfter=4,
        )
        mono_style = ParagraphStyle(
            "Mono", parent=styles["Code"],
            fontSize=8.5, leading=13,
            textColor=colors.HexColor("#2d3748"),
            spaceAfter=3, leftIndent=10,
        )

        story = []

        # ── Header ─────────────────────────────────────────────────────────────
        story.append(Paragraph("⚖️  PAKISTAN LEGALAI PLATFORM", subtitle_style))
        story.append(Paragraph(title.upper(), title_style))
        story.append(HRFlowable(width="100%", thickness=2, color=GOLD, spaceAfter=12))

        # ── Body content ────────────────────────────────────────────────────────
        lines = content.strip().split("\n")
        skip_first_heading = True

        for line in lines:
            line_stripped = line.strip()

            if not line_stripped:
                story.append(Spacer(1, 4))
                continue

            # Section dividers ══
            if set(line_stripped) <= {"═", "─", "=", "-"} and len(line_stripped) > 5:
                story.append(HRFlowable(width="100%", thickness=0.5,
                                         color=colors.lightgrey, spaceAfter=6))
                continue

            # Section headings (ALL CAPS lines or lines ending with ────)
            if (line_stripped.isupper() and len(line_stripped) > 3
                    and not line_stripped.startswith("PKR")):
                if skip_first_heading:
                    skip_first_heading = False
                    continue
                story.append(Paragraph(line_stripped, heading_style))
                continue

            # Numbered items or bullet points
            if (line_stripped[:2] in [f"{i}." for i in range(1, 20)] or
                    line_stripped.startswith("(") or line_stripped.startswith("  (")):
                story.append(Paragraph(line_stripped, body_style))
                continue

            # Signature / form lines (contain underscores)
            if "___" in line_stripped or "CNIC:" in line_stripped or "Date:" in line_stripped:
                story.append(Paragraph(line_stripped.replace("_", " ___"), mono_style))
                continue

            # Regular body text
            story.append(Paragraph(line_stripped, body_style))

        # ── Footer ──────────────────────────────────────────────────────────────
        story.append(Spacer(1, 20))
        story.append(HRFlowable(width="100%", thickness=0.5, color=GOLD, spaceAfter=6))
        story.append(Paragraph(
            "<i>⚠️ This document was generated by Pakistan LegalAI for informational purposes. "
            "It is not formal legal advice. Please have this document reviewed by a qualified "
            "Pakistani lawyer or advocate before use.</i>",
            ParagraphStyle("Footer", parent=styles["Normal"],
                           fontSize=7.5, textColor=colors.gray, alignment=TA_CENTER)
        ))

        doc.build(story)
        return True

    except ImportError:
        return False  # ReportLab not installed → fall back to TXT


# ── Main service class ─────────────────────────────────────────────────────────


# ── Legal accuracy ────────────────────────────────────────────────────────────
# Every statutory statement printed into a generated document must match the
# enacted text in data/laws/. These are documents people take to a Union Council
# or a court, so a wrong deadline is not a cosmetic bug.
#
# One was wrong: the Talaq Nama told the husband to give notice to the Chairman
# "within 7 days". MFLO Section 7(1) says "as soon as may be after the
# pronouncement" -- there is no 7-day deadline in the Ordinance. It was invented.
# It also implied the 90 days run from pronouncement; Section 7(3) runs them from
# the day the NOTICE is delivered to the Chairman, which is a materially
# different date, and the one that decides when a divorce is final.
#
# Checked with: python scripts/verify_documents.py


class DocService:
    def __init__(self):
        env = Environment(loader=BaseLoader())
        env.filters["format_pk"] = _format_pk
        self.env = env

    def get_templates(self) -> List[Dict]:
        return TEMPLATES

    def get_template(self, template_id: str) -> Optional[Dict]:
        return next((t for t in TEMPLATES if t["id"] == template_id), None)

    def get_categories(self) -> List[Dict]:
        seen = {}
        for t in TEMPLATES:
            cat = t["category"]
            if cat not in seen:
                seen[cat] = {"id": cat, "name": cat.replace("_", " ").title(),
                             "icon": t["icon"], "count": 0}
            seen[cat]["count"] += 1
        return list(seen.values())

    def generate(
        self,
        template_id: str,
        fields: Dict[str, Any],
        language: str = "en",
        fmt: str = "pdf",
    ) -> str:
        """
        Generate a document from a template.
        Returns path to the generated file (PDF preferred, TXT fallback).
        """
        tmpl_def = self.get_template(template_id)
        if not tmpl_def:
            raise ValueError(f"Template '{template_id}' not found.")

        raw_text = TEMPLATE_TEXTS.get(template_id)
        if not raw_text:
            raise ValueError(f"Template text for '{template_id}' not found.")

        # Render Jinja2
        tmpl = self.env.from_string(raw_text)
        rendered = tmpl.render(**fields)

        title = tmpl_def["name"]
        prefix = f"legalai_{template_id}_"
        out_dir = Path(tempfile.gettempdir()) / "legalai_docs"
        out_dir.mkdir(exist_ok=True)

        # Try PDF first
        if fmt in ("pdf", "auto"):
            pdf_path = str(out_dir / f"{prefix}{os.getpid()}.pdf")
            success = _build_pdf(rendered, title, pdf_path)
            if success:
                return pdf_path

        # Fallback: plain text
        txt_path = str(out_dir / f"{prefix}{os.getpid()}.txt")
        with open(txt_path, "w", encoding="utf-8") as f:
            f.write(f"{title}\n{'='*60}\n\n")
            f.write(rendered)
            f.write("\n\n⚠️ This document was generated by Pakistan LegalAI. "
                    "Not formal legal advice.\n")
        return txt_path

    def get_ai_suggestions(self, template_id: str, description: str) -> Dict[str, str]:
        """
        Use LLM to suggest field values based on a plain-language description.
        Returns a dict of {field_id: suggested_value}.
        """
        from services.llm_service import LLMService
        import json

        tmpl = self.get_template(template_id)
        if not tmpl:
            return {}

        field_list = "\n".join([
            f"  - {f['id']}: {f['label']} ({f['type']})"
            for f in tmpl["fields"]
        ])

        prompt = f"""You are helping fill in a Pakistani legal document: "{tmpl['name']}".

The user described their situation as:
"{description}"

Today's date is: {date.today().isoformat()}

Based on the description, suggest values for as many of these fields as possible:
{field_list}

Respond ONLY with a valid JSON object mapping field IDs to suggested string values.
For dates use YYYY-MM-DD format.
For numbers use plain integers (no commas or currency symbols).
For fields you cannot infer, omit them entirely.
Do not include any explanation or markdown — pure JSON only.
Example: {{"landlord_name": "Muhammad Arif", "city": "Karachi"}}"""

        try:
            llm = LLMService(max_tokens=600, temperature=0.1)
            raw = llm.complete(prompt)
            # Strip markdown fences if present
            raw = raw.strip().lstrip("```json").lstrip("```").rstrip("```").strip()
            return json.loads(raw)
        except Exception as e:
            return {}
