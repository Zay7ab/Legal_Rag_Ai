# Setup — run these in order

Order matters. Two steps are easy to miss and both make the app look broken.

```bash
# 1. Config
cp .env.example .env
python -c "import secrets; print(secrets.token_hex(32))"   # paste into JWT_SECRET_KEY
# also set ADMIN_EMAIL=your@email.com  (this account becomes admin on first login)
# also set GROQ_API_KEY=gsk_...        (free: https://console.groq.com) — chat won't work without it

cp react-frontend/.env.example react-frontend/.env
# set REACT_APP_FIREBASE_* only if you want Google sign-in; the button hides itself otherwise

# 2. Backend
pip install -r backend/requirements.txt

python backend/scripts/seed_db.py         # 21 cases + 12 topics   <-- EASY TO MISS
python backend/scripts/ingest_laws.py     # build the FAISS index  <-- REQUIRED, ~3 min + 470MB model
python backend/scripts/eval_retrieval.py  # verify: expect recall@5 15/17, junk 0/6

uvicorn main:app --reload --port 8000     # from inside backend/

# 3. Frontend
cd react-frontend && npm install && npm start
```

## The two that bite

**`seed_db.py`** — `main.py` only seeds lawyers. Cases and topics come from this
script. Skip it and Case Law is a working UI over an empty table: every search
returns "Nothing matched", which reads as broken rather than empty. The app now
logs a warning at startup if the case table is empty.

**`ingest_laws.py`** — the corpus (~2.3 MB of official statute text) is included,
but FAISS doesn't know about it until you ingest. Skip it and every answer shows
"No statute matched". The index is gitignored on purpose: it's a build artifact,
and it's a pickle — you should build your own rather than deserialise mine.

## Sanity checks before a demo

| Check | Expected |
|---|---|
| `python backend/scripts/check_corpus.py` | PPC/CrPC/Constitution "full" |
| `python backend/scripts/eval_retrieval.py` | recall@5 15/17, junk 0/6, exit 0 |
| Ask: *"What is the punishment under Section 489F PPC?"* | answers **with** a green "Grounded in Pakistan Penal Code" badge |
| Case Law → search "fundamental" | returns results |
| Admin → Answer quality | loads (needs the ADMIN_EMAIL account) |

## Before you submit

1. **Revoke the Gmail App Password** — https://myaccount.google.com/apppasswords
2. **Rotate the Firebase key** + restrict authorised domains / HTTP referrers
3. Purge git history (`git filter-repo` / BFG) — rotating matters more
4. `pip freeze > requirements.lock.txt` — unpinned deps broke this project once
   already (passlib/bcrypt)

## Known, deliberate gaps

- **Punjab Rent Act** is still a 1 KB excerpt — punjablaws.gov.pk returned 503.
  Rent questions honestly show "No statute matched".
- **News feed pulls general headlines** ("GTA 6", PSL cricket), not law sections.
  Backend RSS filter in `routers/news.py` — ~20 min fix, and it's a nav item an
  examiner will click.
- **Booking has no backend** — the page says so plainly rather than faking a
  confirmation.
- **Urdu covers the chrome**, not page body copy.
