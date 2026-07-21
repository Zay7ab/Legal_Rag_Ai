"""
Seeds the database with real Pakistan court case data.
Run: python scripts/seed_db.py
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from db.database import SessionLocal, init_db
from db.models import Case, Topic, SearchHistory

# ── Topic definitions ──────────────────────────────────────────────────────────
TOPICS = [
    {"slug": "constitutional_law",  "name": "Constitutional Law",  "icon": "📜"},
    {"slug": "criminal_law",        "name": "Criminal Law",        "icon": "⚖️"},
    {"slug": "family_law",          "name": "Family Law",          "icon": "👨‍👩‍👧"},
    {"slug": "civil_law",           "name": "Civil Law",           "icon": "📋"},
    {"slug": "labour_law",          "name": "Labour Law",          "icon": "⚒️"},
    {"slug": "property_law",        "name": "Property Law",        "icon": "🏠"},
    {"slug": "cyber_law",           "name": "Cyber Law",           "icon": "💻"},
    {"slug": "administrative_law",  "name": "Administrative Law",  "icon": "🏛️"},
    {"slug": "commercial_law",      "name": "Commercial Law",      "icon": "💼"},
    {"slug": "women_rights",        "name": "Women's Rights",      "icon": "👩"},
    {"slug": "fundamental_rights",  "name": "Fundamental Rights",  "icon": "🛡️"},
    {"slug": "consumer_law",        "name": "Consumer Law",        "icon": "🛒"},
]

# ── Real Pakistan case data ────────────────────────────────────────────────────
# ─────────────────────────────────────────────────────────────────────────────
# RESTORED with VERIFIED case law (Jul 2026).
#
# The previous corpus was emptied because every case in it was a fabricated LLM
# placeholder ("State vs Accused", "XYZ Corporation", inverted citation formats).
# See git history / FIXES.md for that account.
#
# This set is different. Every entry below is a real, widely-reported landmark
# judgment of the Federal Court / Supreme Court of Pakistan. Each citation and
# the party names were checked against multiple independent sources, including
# the Supreme Court's own judgment PDFs and Wikipedia case pages, before being
# added. Summaries state only the core, textbook-level holding of each case and
# are written in plain words — they are NOT a substitute for reading the
# judgment, and `full_text_url` (where present) links to a source you can verify.
#
# These are constitutional / fundamental-rights landmarks, appropriate for a
# "Case Law" learning feature. They are NOT tenant / bail / khula precedents —
# those are far more numerous, fact-specific, and citation-fragile, so they are
# deliberately left out until sourced from an official reporter (PLD / SCMR /
# supremecourt.gov.pk / caselaw.shc.gov.pk) rather than model recollection.
#
# Adding more: keep the same bar — verified citation, verified party names, a
# holding you can point to in the judgment. A real citation on an invented
# holding is worse than no case at all.
# ─────────────────────────────────────────────────────────────────────────────
CASES: list = [
    dict(
        id="fc-1955-pld-240",
        title="Federation of Pakistan v. Maulvi Tamizuddin Khan",
        court="Federal Court", year=1955, citation="PLD 1955 FC 240",
        petitioner="Federation of Pakistan", respondent="Maulvi Tamizuddin Khan",
        law_sections="Government of India Act 1935 s. 223-A",
        outcome="Dissolution upheld",
        summary=("On a technical point of the Governor-General's assent, the Federal Court "
                 "upheld Governor-General Ghulam Muhammad's dissolution of Pakistan's first "
                 "Constituent Assembly. The decision is widely criticised as an early blow to "
                 "constitutional democracy and is often cited as a root of later instability."),
        keywords="constituent assembly, dissolution, governor general, assent, constitutional crisis",
        is_landmark=True, full_text_url=None,
        topics=["constitutional_law"],
    ),
    dict(
        id="fc-1955-pld-387",
        title="Usif Patel and 2 others v. The Crown",
        court="Federal Court", year=1955, citation="PLD 1955 FC 387",
        petitioner="Usif Patel", respondent="The Crown",
        law_sections="Constitution / validation of laws",
        outcome="Detention set aside",
        summary=("The Federal Court held that the Governor-General had no power to validate "
                 "laws or make provisions to the Constitution by himself. The ruling deepened "
                 "the constitutional emergency that followed the Tamizuddin Khan case."),
        keywords="validation of laws, governor general powers, detention, goondas act",
        is_landmark=True, full_text_url=None,
        topics=["constitutional_law"],
    ),
    dict(
        id="sc-1958-pld-533",
        title="The State v. Dosso",
        court="Supreme Court", year=1958, citation="PLD 1958 SC 533",
        petitioner="The State", respondent="Dosso",
        law_sections="Laws (Continuance in Force) Order 1958",
        outcome="Martial law validated (later discredited)",
        summary=("Applying Hans Kelsen's theory that a successful revolution creates its own "
                 "legal order, the Court treated the 1958 martial law as a valid law-creating "
                 "fact. The reasoning was later repudiated in Asma Jilani and is now regarded "
                 "as a discredited justification for military takeovers."),
        keywords="doctrine of necessity, kelsen, revolution, martial law, grundnorm, basic norm",
        is_landmark=True, full_text_url="https://en.wikipedia.org/wiki/State_v._Dosso",
        topics=["constitutional_law"],
    ),
    dict(
        id="sc-1972-pld-139",
        title="Miss Asma Jilani v. Government of the Punjab",
        court="Supreme Court", year=1972, citation="PLD 1972 SC 139",
        petitioner="Miss Asma Jilani", respondent="Government of the Punjab",
        law_sections="Constitution; detention under martial law",
        outcome="Detention illegal; Dosso overruled",
        summary=("The Court overruled Dosso and held that Yahya Khan's 1969 martial law was "
                 "illegal and that he was a usurper, not a lawful ruler. A foundational case "
                 "for rejecting the doctrine of necessity as a blanket cover for military rule."),
        keywords="usurper, martial law illegal, yahya khan, doctrine of necessity, dosso overruled, detention",
        is_landmark=True,
        full_text_url="https://andyreiter.com/wp-content/uploads/military-justice/pk/Court%20Cases/Pakistan%20-%201972%20-%20Asma%20Jilani%20v.%20Government%20of%20Punjab.pdf",
        topics=["constitutional_law", "fundamental_rights"],
    ),
    dict(
        id="sc-1988-pld-416",
        title="Benazir Bhutto v. Federation of Pakistan",
        court="Supreme Court", year=1988, citation="PLD 1988 SC 416",
        petitioner="Benazir Bhutto", respondent="Federation of Pakistan",
        law_sections="Constitution Arts. 17, 184(3); Political Parties Act 1962",
        outcome="Petition allowed",
        summary=("The Court relaxed the rule of standing (locus standi) to open the door to "
                 "public interest litigation under Article 184(3), and struck down restrictions "
                 "on political parties as offending the freedom of association in Article 17."),
        keywords="public interest litigation, locus standi, political parties, freedom of association, article 17, fundamental rights",
        is_landmark=True,
        full_text_url="https://en.wikipedia.org/wiki/Benazir_Bhutto_v._Federation_of_Pakistan",
        topics=["constitutional_law", "fundamental_rights"],
    ),
    dict(
        id="sc-1996-pld-324",
        title="Al-Jehad Trust v. Federation of Pakistan (Judges' Case)",
        court="Supreme Court", year=1996, citation="PLD 1996 SC 324",
        petitioner="Al-Jehad Trust", respondent="Federation of Pakistan",
        law_sections="Constitution Arts. 175, 177, 193",
        outcome="Petition allowed",
        summary=("The Court held that judicial appointments require meaningful consultation with "
                 "the Chief Justice and that the independence of the judiciary under Article 175 "
                 "must be protected from executive control. A cornerstone of judicial-independence "
                 "jurisprudence in Pakistan."),
        keywords="judicial independence, appointment of judges, consultation, chief justice, article 175, separation of powers",
        is_landmark=True, full_text_url=None,
        topics=["constitutional_law", "administrative_law"],
    ),
    dict(
        id="sc-1998-pld-1445",
        title="Mehram Ali v. Federation of Pakistan",
        court="Supreme Court", year=1998, citation="PLD 1998 SC 1445",
        petitioner="Mehram Ali", respondent="Federation of Pakistan",
        law_sections="Anti-Terrorism Act 1997; Constitution Art. 175",
        outcome="Provisions struck down / read down",
        summary=("The Court struck down or read down parts of the Anti-Terrorism Act 1997, "
                 "holding that special courts must function within the judicial hierarchy under "
                 "Article 175 and remain subject to High Court supervision, safeguarding fair "
                 "trial and judicial independence."),
        keywords="anti terrorism act, special courts, article 175, judicial independence, fair trial, high court supervision",
        is_landmark=True,
        full_text_url="https://en.wikipedia.org/wiki/Mehram_Ali_versus_Federation_of_Pakistan",
        topics=["constitutional_law", "criminal_law"],
    ),
    dict(
        id="sc-2000-pld-869",
        title="Syed Zafar Ali Shah v. General Pervez Musharraf",
        court="Supreme Court", year=2000, citation="PLD 2000 SC 869",
        petitioner="Syed Zafar Ali Shah", respondent="General Pervez Musharraf",
        law_sections="Constitution; doctrine of state necessity",
        outcome="Takeover validated with conditions",
        summary=("The Court validated the October 1999 military takeover under the doctrine of "
                 "state necessity, allowing a limited period of about three years to restore "
                 "democracy, while barring amendments to the salient features of the Constitution."),
        keywords="doctrine of necessity, military takeover, musharraf, provisional constitutional order, salient features",
        is_landmark=True, full_text_url=None,
        topics=["constitutional_law"],
    ),
    dict(
        id="sc-2009-pld-879",
        title="Sindh High Court Bar Association v. Federation of Pakistan",
        court="Supreme Court", year=2009, citation="PLD 2009 SC 879",
        petitioner="Sindh High Court Bar Association", respondent="Federation of Pakistan",
        law_sections="Constitution Arts. 175, 184(3); PCO Nov 2007",
        outcome="Emergency / PCO declared unconstitutional",
        summary=("The Court declared the 3 November 2007 emergency and Provisional Constitutional "
                 "Order unconstitutional, holding actions taken under it (including the removal of "
                 "judges) to be void. A defining judgment of the lawyers' movement and the "
                 "restoration of the judiciary."),
        keywords="emergency, provisional constitutional order, pco, restoration of judiciary, lawyers movement, november 3",
        is_landmark=True, full_text_url=None,
        topics=["constitutional_law", "fundamental_rights"],
    ),
    dict(
        id="sc-2015-pld-401",
        title="District Bar Association, Rawalpindi v. Federation of Pakistan (21st Amendment Case)",
        court="Supreme Court", year=2015, citation="PLD 2015 SC 401",
        petitioner="District Bar Association, Rawalpindi", respondent="Federation of Pakistan",
        law_sections="Constitution (18th & 21st Amendment) Acts; Arts. 175, 239",
        outcome="Amendments upheld (majority)",
        summary=("A 17-judge bench, by majority, upheld the 18th and 21st Constitutional "
                 "Amendments, including the temporary use of military courts to try terrorism "
                 "cases, while engaging in a landmark debate on whether the Constitution has an "
                 "unamendable 'basic structure'."),
        keywords="basic structure, 18th amendment, 21st amendment, military courts, terrorism, constitutional amendment",
        is_landmark=True, full_text_url=None,
        topics=["constitutional_law"],
    ),
    dict(
        id="sc-2017-pld-265",
        title="Imran Ahmad Khan Niazi v. Mian Muhammad Nawaz Sharif (Panama Papers Case)",
        court="Supreme Court", year=2017, citation="PLD 2017 SC 265",
        petitioner="Imran Ahmad Khan Niazi", respondent="Mian Muhammad Nawaz Sharif",
        law_sections="Constitution Art. 62(1)(f); Representation of the People Act 1976 ss. 12(2)(f), 19(f)",
        outcome="Prime Minister disqualified",
        summary=("Arising from the Panama Papers, the Court disqualified the sitting Prime "
                 "Minister under Article 62(1)(f) for not being 'sadiq and ameen' (honest and "
                 "truthful) over an undeclared receivable, and ordered accountability references. "
                 "A defining modern case on the disqualification of public office-holders."),
        keywords="panama papers, disqualification, article 62, sadiq ameen, prime minister, accountability, nab",
        is_landmark=True,
        full_text_url="https://en.wikipedia.org/wiki/Panama_Papers_case",
        topics=["constitutional_law", "administrative_law"],
    ),
    dict(
        id="sc-2024-pld-337",
        title="Jawwad S. Khawaja v. Federation of Pakistan (Military Courts Case)",
        court="Supreme Court", year=2024, citation="PLD 2024 SC 337",
        petitioner="Jawwad S. Khawaja", respondent="Federation of Pakistan",
        law_sections="Constitution Arts. 10A, 175(3); Pakistan Army Act 1952 s. 2(1)(d)",
        outcome="Civilian trials by military courts held unconstitutional (subject to further appeal)",
        summary=("The Court held that trying civilians before military courts is unconstitutional "
                 "and violates the right to a fair trial under Article 10A. The judgment has since "
                 "been the subject of intra-court appeal proceedings, so its final status should "
                 "be checked against the latest orders."),
        keywords="military courts, civilians, fair trial, article 10a, court martial, army act, may 9",
        is_landmark=True,
        full_text_url="https://www.supremecourt.gov.pk/downloads_judgements/const.p._24_2023_f.pdf",
        topics=["fundamental_rights", "criminal_law"],
    ),
]



def seed():
    init_db()
    db = SessionLocal()

    try:
        # ── Seed topics ────────────────────────────────────────────────────────
        topic_map = {}
        existing_topics = {t.slug: t for t in db.query(Topic).all()}

        for t_data in TOPICS:
            if t_data["slug"] not in existing_topics:
                topic = Topic(**t_data)
                db.add(topic)
                db.flush()
                topic_map[t_data["slug"]] = topic
                print(f"  + Topic: {t_data['name']}")
            else:
                topic_map[t_data["slug"]] = existing_topics[t_data["slug"]]

        db.commit()

        # ── Seed cases ─────────────────────────────────────────────────────────
        existing_case_ids = {c.id for c in db.query(Case.id).all()}
        added = 0
        skipped = 0

        for c_data in CASES:
            if c_data["id"] in existing_case_ids:
                skipped += 1
                continue

            topic_slugs = c_data.pop("topics", [])

            # Build search_vector for SQLite FTS simulation
            search_vector = " ".join([
                c_data.get("title", ""),
                c_data.get("summary", ""),
                c_data.get("keywords", ""),
                c_data.get("law_sections", "") or "",
                c_data.get("judges", "") or "",
            ]).lower()

            case = Case(**c_data, search_vector=search_vector)

            # Attach topics
            for slug in topic_slugs:
                if slug in topic_map:
                    case.topics.append(topic_map[slug])

            db.add(case)
            added += 1
            print(f"  + Case: {c_data['id']} — {c_data['title'][:60]}")

        db.commit()

        print(f"\n✅ Seeding complete:")
        print(f"   Topics : {len(TOPICS)} ({len(existing_topics)} already existed)")
        print(f"   Cases  : {added} added, {skipped} already existed")
        print(f"   Total cases in DB: {db.query(Case).count()}")

    except Exception as e:
        db.rollback()
        print(f"❌ Seeding failed: {e}")
        import traceback
        traceback.print_exc()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    print("=" * 60)
    print("  Pakistan LegalAI — Database Seeder")
    print("=" * 60)
    print()
    seed()
