"""Seed default lawyer records on first startup."""
import logging
from db.database import SessionLocal

logger = logging.getLogger(__name__)

_LAWYERS = [
    dict(name="Adv. Khalid Mahmood Khan", city="Lahore", area="Criminal Law", exp=18, rating=4.8, verified=True,
         languages="Urdu,English,Punjabi", fee="PKR 5,000-15,000", courts="LHC,Sessions Court Lahore",
         edu="LLB - Punjab University", about="Specializes in murder, bail, and FIR cases. Former Additional Prosecutor General Punjab.",
         phone="0300-4512678", whatsapp="923004512678", email="khalid.mahmood.adv@gmail.com", chamber="Chamber 14, High Court Building, Lahore"),
    dict(name="Adv. Fatima Zahra Siddiqui", city="Karachi", area="Family Law", exp=12, rating=4.9, verified=True,
         languages="Urdu,English,Sindhi", fee="PKR 3,000-10,000", courts="Family Courts Karachi,SHC",
         edu="LLB - Karachi University", about="Expert in Khula, divorce, custody, and maintenance. Women's rights advocate.",
         phone="0321-2234567", whatsapp="923212234567", email="fatima.zahra.law@gmail.com", chamber="Suite 5, Clifton Law Centre, Karachi"),
    dict(name="Adv. Muhammad Tariq Butt", city="Islamabad", area="Property Law", exp=22, rating=4.7, verified=True,
         languages="Urdu,English", fee="PKR 7,000-20,000", courts="IHC,Sessions Court Islamabad",
         edu="LLM - QAU", about="20+ years in property disputes, mutation, and real estate transactions.",
         phone="0333-5109988", whatsapp="923335109988", email="tariq.butt.adv@outlook.com", chamber="F-7 Markaz, Blue Area, Islamabad"),
    dict(name="Adv. Sara Ahmed", city="Rawalpindi", area="Corporate Law", exp=9, rating=4.6, verified=False,
         languages="Urdu,English", fee="PKR 8,000-25,000", courts="IHC,Commercial Courts RWP",
         edu="LLB - LUMS", about="Corporate contracts, company registration, SECP matters, and commercial disputes.",
         phone="0311-5567890", whatsapp="923115567890", email="sara.ahmed.corp@gmail.com", chamber="Saddar Commercial Area, Rawalpindi"),
    dict(name="Adv. Arif Khan Mohmand", city="Peshawar", area="Criminal Law", exp=15, rating=4.5, verified=True,
         languages="Urdu,English,Pashto", fee="PKR 4,000-12,000", courts="Peshawar High Court,Sessions",
         edu="LLB - UoP", about="Criminal defense specialist with experience in tribal law matters.",
         phone="0344-9001122", whatsapp="923449001122", email="arifkhan.adv@yahoo.com", chamber="High Court Road, Peshawar Cantt"),
    dict(name="Adv. Naseem Akhtar", city="Lahore", area="Family Law", exp=14, rating=4.7, verified=False,
         languages="Urdu,English,Punjabi", fee="PKR 4,000-12,000", courts="Family Courts Lahore,LHC",
         edu="LLB - Punjab University", about="Family law expert: divorce, custody, maintenance, and inheritance cases.",
         phone="0302-6678900", whatsapp="923026678900", email="naseem.akhtar.law@gmail.com", chamber="Model Town, Lahore"),
    dict(name="Adv. Rashid Mehmood", city="Faisalabad", area="Labour Law", exp=11, rating=4.4, verified=True,
         languages="Urdu,Punjabi", fee="PKR 2,000-8,000", courts="Labour Courts FSD,Sessions",
         edu="LLB - BZU", about="Labour disputes, wrongful termination, and EOBI matters.",
         phone="0300-8823456", whatsapp="923008823456", email="rashid.mehmood.adv@gmail.com", chamber="D-Ground, Faisalabad"),
    dict(name="Adv. Amina Qureshi", city="Karachi", area="Constitutional Law", exp=20, rating=4.9, verified=True,
         languages="Urdu,English", fee="PKR 10,000-30,000", courts="Supreme Court,Sindh HC",
         edu="LLM - USA", about="Constitutional litigation, fundamental rights, and Supreme Court practice.",
         phone="0321-9876543", whatsapp="923219876543", email="amina.qureshi.sc@gmail.com", chamber="Sindh High Court Road, Karachi"),
    dict(name="Adv. Zain ul Abideen", city="Lahore", area="Corporate Law", exp=8, rating=4.5, verified=True,
         languages="Urdu,English", fee="PKR 6,000-18,000", courts="LHC,Commercial Courts",
         edu="LLB - LUMS", about="Corporate transactions, SECP filings, company registration, and shareholder disputes.",
         phone="0300-1122334", whatsapp="923001122334", email="zain.abideen.corp@gmail.com", chamber="Gulberg III, Lahore"),
    dict(name="Adv. Hina Javed", city="Islamabad", area="Family Law", exp=10, rating=4.7, verified=True,
         languages="Urdu,English,Punjabi", fee="PKR 4,000-12,000", courts="Family Courts Islamabad,IHC",
         edu="LLB - IIUI", about="Expert in divorce, custody, and domestic violence cases. NGO partner for women's legal aid.",
         phone="0315-5678901", whatsapp="923155678901", email="hina.javed.law@gmail.com", chamber="F-8 Markaz, Islamabad"),
    dict(name="Adv. Muhammad Usman Ghani", city="Peshawar", area="Property Law", exp=16, rating=4.6, verified=True,
         languages="Urdu,English,Pashto", fee="PKR 5,000-15,000", courts="Peshawar HC,Civil Courts",
         edu="LLB - UoP", about="Land disputes, tribal property matters, and inheritance cases in KPK region.",
         phone="0344-7788990", whatsapp="923447788990", email="usman.ghani.adv@yahoo.com", chamber="Peshawar Cantonment, Peshawar"),
    dict(name="Adv. Sana Baloch", city="Quetta", area="Criminal Law", exp=13, rating=4.5, verified=False,
         languages="Urdu,English,Balochi,Brahui", fee="PKR 3,000-10,000", courts="Balochistan HC,Sessions",
         edu="LLB - UoB", about="Criminal defence, bail applications, and tribal jirga interface matters in Balochistan.",
         phone="0811-223344", whatsapp="92811223344", email="sana.baloch.adv@gmail.com", chamber="Zarghoon Road, Quetta"),
    dict(name="Adv. Irfan Siddiqui", city="Karachi", area="Labour Law", exp=19, rating=4.8, verified=True,
         languages="Urdu,English,Sindhi", fee="PKR 5,000-14,000", courts="Labour Court Karachi,SHC",
         edu="LLM - KU", about="Industrial disputes, EOBI claims, union matters, and wrongful dismissal for factory workers.",
         phone="0333-4455667", whatsapp="923334455667", email="irfan.siddiqui.labour@gmail.com", chamber="SITE Area, Karachi"),
    dict(name="Adv. Maryam Nawaz Ch.", city="Faisalabad", area="Family Law", exp=7, rating=4.4, verified=False,
         languages="Urdu,Punjabi", fee="PKR 2,500-8,000", courts="Family Courts FSD",
         edu="LLB - GCU", about="Divorce, khula, child custody, and maintenance cases with a focus on rural clients.",
         phone="0301-7766554", whatsapp="923017766554", email="maryam.nawaz.adv@gmail.com", chamber="D-Ground, Faisalabad"),
    dict(name="Adv. Shahzad Akbar Rana", city="Rawalpindi", area="Criminal Law", exp=24, rating=4.9, verified=True,
         languages="Urdu,English,Punjabi", fee="PKR 8,000-25,000", courts="IHC,Supreme Court,Sessions RWP",
         edu="LLM - Punjab University", about="30 years criminal practice; murder, anti-terrorism, and NAB defence specialist.",
         phone="0311-9988776", whatsapp="923119988776", email="shahzad.akbar.rana@gmail.com", chamber="Murree Road, Rawalpindi"),
    dict(name="Adv. Bilal Ahmed Dogar", city="Multan", area="Civil Litigation", exp=17, rating=4.6, verified=True,
         languages="Urdu,English,Saraiki,Punjabi", fee="PKR 4,000-12,000", courts="Multan Bench LHC,Civil Courts Multan",
         edu="LLB - Bahauddin Zakariya University", about="Civil suits, declaration and injunction, specific performance, and recovery matters in South Punjab.",
         phone="0300-6612233", whatsapp="923006612233", email="bilal.dogar.adv@gmail.com", chamber="Kutchery Road, Multan"),
    dict(name="Adv. Rabia Sultana", city="Multan", area="Family Law", exp=9, rating=4.5, verified=False,
         languages="Urdu,Saraiki,Punjabi", fee="PKR 2,500-8,000", courts="Family Courts Multan",
         edu="LLB - BZU", about="Khula, custody, maintenance and dower recovery; focus on women clients in South Punjab.",
         phone="0301-8890011", whatsapp="923018890011", email="rabia.sultana.law@gmail.com", chamber="Gulgasht Colony, Multan"),
    dict(name="Adv. Hamza Farooq", city="Lahore", area="Civil Litigation", exp=12, rating=4.6, verified=True,
         languages="Urdu,English,Punjabi", fee="PKR 5,000-15,000", courts="LHC,Civil Courts Lahore",
         edu="LLB - Punjab University", about="Civil and revenue litigation, property declaration suits, and execution proceedings.",
         phone="0300-4477889", whatsapp="923004477889", email="hamza.farooq.adv@gmail.com", chamber="Fane Road, Lahore"),
]


def seed_lawyers() -> None:
    from db.models import Lawyer
    db = SessionLocal()
    try:
        if db.query(Lawyer).count() > 0:
            return
        for data in _LAWYERS:
            db.add(Lawyer(**data))
        db.commit()
        logger.info("[DB] Seeded %d default lawyers.", len(_LAWYERS))
    except Exception as e:
        logger.error("Lawyer seed failed: %s", e)
        db.rollback()
    finally:
        db.close()
