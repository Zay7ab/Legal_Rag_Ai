# Audit remediation — what changed and why

Covers every item in `legal_rag_fyp_audit.html`, plus **9 issues the audit
missed** (found while verifying its claims). Every fix was verified by running
it, not by inspection.

---

## ⚠️ Read this first: the audit was partly wrong

Three of its findings do not describe the running app, and one of its
recommendations was **actively dangerous**.

### The audit reviewed dead code

`src/index.js` renders **only `App.jsx`**. `App.jsx` imports nothing from
`src/pages/`, `src/components/`, `src/api/` or `src/context/` — verified with a
project-wide import scan. That entire parallel SPA was unreachable.

The audit read those files, so:

| Audit claim | Reality |
|---|---|
| "Streaming endpoint built but never used" (Critical) | `App.jsx` **already streamed** via `fetch` + `ReadableStream`. |
| "Chatbot doesn't persist history" (Warning) | `App.jsx` **already persisted** sessions to localStorage. |
| "Voice input not implemented" (Feature) | `App.jsx` **already had** SpeechRecognition. |
| "Documents.jsx swallows blob errors" (Critical) | Real bug — but in the **live `Docs()`** in `App.jsx`, not `pages/Documents.jsx`. |

The dead SPA wasn't harmless. Its `api/client.js` held the **only token-refresh
logic in the project** — and it never ran. See "Sessions died after 60 minutes"
below.

### The audit's admin fix would have handed out the admin panel

> "Remove the email check — rely solely on `role == 'admin'`."

`POST /api/auth/register` accepted a **client-supplied `role`**. The hardcoded
email was the only thing stopping `{"role": "admin"}` from working. Applying the
audit's fix alone = public admin access. **The escalation was closed first**,
then the email check removed.

---

## Critical (7/7)

| # | Issue | Status |
|---|---|---|
| 1 | Firebase keys hardcoded | **Fixed** — `REACT_APP_FIREBASE_*`; verified absent from the production bundle. |
| 2 | Admin guard hardcodes an email | **Fixed** — role-only, after closing the escalation. `ADMIN_EMAIL` bootstraps. |
| 3 | Monolithic `App.jsx` (2,674 lines) | **Partly fixed** — see note below. |
| 4 | Two frontends | **Fixed** — one frontend. Streamlit + dead SPA archived. |
| 5 | Streaming never used | **Was already done** — but its SSE parser was broken. Fixed (below). |
| 6 | Blob errors swallowed | **Fixed** in the live `Docs()`. |
| 7 | Law corpus is excerpts | **Measured, not faked** — see below. |

### 1. Firebase keys
Moved to env vars. **Be clear-eyed about what this does:** Firebase web API keys
are *public by design* — they ship in the JS bundle regardless. Moving them to
env vars does **not** hide them. The real wins: per-deployment projects, and
rotation without a code change. Actual protection must come from the console:
- Firebase → Authentication → Settings → **Authorised domains**
- GCP → Credentials → API key → **HTTP referrer restrictions**

**Still rotate the committed key** — it's in git history.

`FIREBASE_READY` was hardcoded `true`, so the Google button rendered and then
threw an opaque error when unconfigured. It now reflects real config.

### 3. App.jsx — honest status
Extracted the cleanly separable layers: `theme.js` (CSS), `lib/api.js` (API +
auth), `lib/hooks.js`. `App.jsx` is **2,674 → ~2,470 lines**.

The remaining bulk is 16 page components. I did **not** split them: it's a large
mechanical refactor with real regression risk and no behavioural benefit, and I
couldn't meaningfully test each page. The extracted pieces are the ones with
actual reuse/coupling value. Splitting the pages is a good next step — do it one
page at a time, with the build green after each.

### 7. Law corpus — measured, not fabricated
Added `backend/scripts/check_corpus.py`, which quantifies the gap:

```
FILE                           SIZE  SECTIONS  EXPECTED  COVERAGE
ppc.txt                         4KB         9       511      1.8%
crpc.txt                        4KB         5       565      0.9%
constitution_1973.txt           5KB        11       280      3.9%
peca_2016.txt                   3KB         6        57     10.5%
```

**I did not generate substitute legal text.** Fabricated statute text in a legal
advice tool is worse than a documented gap — a plausible-looking wrong section
number is exactly the failure a citation-based system must never have. The
script names the official source for each statute; sourcing them is a task for
you. It exits non-zero, so it works in CI.

---

## Warnings (9/9)

| # | Issue | Status |
|---|---|---|
| 1 | Login uses a different design system | **Resolved by deletion** — those files were the dead SPA. One system now. |
| 2 | Token expiry handled badly | **Fixed** — and it was worse than reported (below). |
| 3 | Rate limiter in-memory | **Fixed** — Redis + atomic `INCR`/`EXPIRE`, in-memory fallback. |
| 4 | FAISS pickle RCE | **Mitigated** — SHA-256 manifest verified before load. |
| 5 | No loading skeleton on Documents | **Fixed** — skeletons, no auto-select, unmount-safe. |
| 6 | Weak `JWT_SECRET_KEY` default | **Fixed** — refuses to boot in prod; random ephemeral key in dev. |
| 7 | Chat history not persisted | **Already done** — audit read dead code. |
| 8 | XSS via `dangerouslySetInnerHTML` | **Fixed** — DOMPurify with an allowlist. |
| 9 | No pagination on Case Search | **Fixed** — backend already had it; the UI ignored it. |

**#4 — honest scope:** this is tamper *detection*, not a sandbox. It stops a
swapped `index.pkl`; it can't stop someone who already owns the directory. The
realistic route in was path traversal on upload — now closed.

**#8** — allowlisted tags/attrs + `ALLOWED_URI_REGEXP` to block `javascript:`
inside `<a href>`.

**#9** — the backend already returned `{total, pages}`. The UI hardcoded
`limit=20` and dropped the rest, so results silently truncated.

---

## Features (11/11)

Implemented: **feedback** (`ChatFeedback` model + `/api/feedback`, with
`/stats` splitting satisfaction by whether RAG retrieved context — that's the
diagnostic that tells you if a bad answer was a *retrieval* or *generation*
failure); **evaluation metrics** (same endpoint + `check_corpus.py`).

Already present: streaming, chat history sidebar, voice input.

**Not implemented** (deliberate — each is a feature project, not a fix):
document preview, Urdu RTL UI, citation deep-linking, doc upload/"chat with your
document", bookmarks-on-dashboard, lawyer booking backend.

On **lawyer booking** the audit is right and worth acting on: the UI exists with
no backend. Either finish it or remove the nav link — half-built features cost
more marks than absent ones. The feature-flag system already lets you hide it:
set `booking: false` in `data/features.json`.

---

## Issues the audit missed

These were found while verifying its claims. Several are more severe than
anything in the report.

### 1. 🔴 A live Gmail App Password was committed
`backend/env.local` contained `SMTP_PASS=aekc ofjj fxyl midf` — a **working
credential**, not a placeholder. Unlike a Firebase web key, this is a real
secret: it sends mail as that account and bypasses 2FA.

**Root cause:** `.gitignore` had `.env` and `*.env`. `*.env` matches files
*ending* in `.env` — it never matched `env.local`.

**Fixed:** purged → `env.local.example`; `.gitignore` corrected and the patterns
verified with `git check-ignore`.

**→ Revoke that App Password now** at
https://myaccount.google.com/apppasswords. It is in git history. Rotating is the
only fix; deleting the file is not.

### 2. 🔴 Privilege escalation via `/api/auth/register`
`role` was accepted from the request body. Registering with `{"role": "admin"}`
was blocked only by a hardcoded email comparison — the exact check the audit told
you to delete.
**Fixed:** `role` removed from the schema; server forces `"user"`; attempts
logged. Verified: `register(role='admin')` → `role='user'`.

### 3. 🔴 Path traversal in admin law upload/delete
`dest = LAWS_DIR / file.filename` with a client-supplied name.
`../../../etc/cron.d/x.txt` → arbitrary **file write**; `delete_law` → arbitrary
**file delete**. Admin-only — but before fix #2, anyone could be an admin. That's
a full RCE chain: register as admin → write a cron file.
**Fixed:** `_safe_law_path()` strips components and asserts containment; rejects
backslashes/NUL (the repo ships `.bat` files, so Windows is a real target).
Verified against 14 payloads — zero escapes.

### 4. 🔴 `pip install` produced a non-functional app
`passlib[bcrypt]` was unpinned. passlib 1.7.4 (last released 2020) reads
`bcrypt.__about__.__version__`, removed in bcrypt ≥ 4.1. A fresh install pulls
bcrypt 5.x → **every register and login crashes**. Nobody could run this project
today.
**Fixed:** dropped passlib, use `bcrypt` directly. Hash format unchanged (`$2b$`)
so existing hashes still verify. Also handles bcrypt's 72-byte limit, which would
otherwise 500 on long passwords.

### 5. 🔴 Streaming silently dropped tokens
The SSE reader did `decode(chunk).split("\n")` **per network chunk**. SSE frames
don't align to TCP boundaries, so a split `data:` line failed `JSON.parse` and was
swallowed by a bare `catch{}`.

Replayed a real stream at realistic chunk sizes:

```
chunk=7 bytes        OLD LOSS  NEW ok      old produced: ""
chunk=13 bytes       OLD LOSS  NEW ok      old produced: ""
chunk=64 bytes       OLD LOSS  NEW ok      old produced: "Under 302 قتلِ کی سزا"
chunk=one big chunk  OLD ok    NEW ok

OLD corrupted output in 4/5 splits; NEW in 0/5.
```

It only ever worked because localhost delivers the response in one chunk. Over a
real network it silently corrupts answers — dropping "Section" and "PPC" from
*"Under Section 302 PPC"*. In a legal citation tool that is a serious failure,
and worst in Urdu (multi-byte chars straddle boundaries).
**Fixed:** buffer across reads, consume only complete frames.

### 6. 🟠 Sessions died after 60 minutes
`App.jsx` **stored** `refresh_token` at login and never used it. The refresh
interceptor was in `api/client.js` — dead code. So access tokens expired after
`ACCESS_TOKEN_EXPIRE_MINUTES=60` and everything failed with "Not authenticated"
while a valid 30-day refresh token sat unused.
**Fixed:** rewrote 5 copy-pasted helpers into one `request()` with transparent
refresh + retry, **single-flight** (concurrent 401s share one refresh instead of
racing), path-saving redirect, and a "session expired" notice.

### 7. 🟠 Logging out deleted your chat history
`logout()` called `localStorage.clear()` — nuking saved chat sessions, theme, and
disclaimer state, not just auth.
**Fixed:** removes only auth keys.

### 8. 🟠 Deactivated users stayed logged in
`get_current_user()` never checked `is_active`, so an admin deactivating an
account did nothing until the token expired. It also **re-promoted the hardcoded
admin and `db.commit()`ed on every authenticated request** — a write on the hot
path.
**Fixed:** read-only; rejects inactive users. Promotion happens once, at login.

### 9. 🟠 Error handling hid every real error
`(await r.json()).detail` throws its own `SyntaxError` when the body isn't JSON
(nginx 502, empty 401) — so users saw *"Unexpected token < in JSON"* instead of
the actual problem. Unbounded `copyfileobj` on upload (disk-fill DoS) and an
immediate `revokeObjectURL` racing the download were fixed too.

---

## Found in the final end-to-end pass

Verified by running the real backend over HTTP, not by reading code.

### 🔴 `.env` was being ignored entirely — my bug
`core.config` instantiates `Settings()` at import, reading `os.environ`. But
`main.py` imports routers *above* its `load_dotenv()` call, and those routers
pull in `core.config` transitively. Import order was literally
`['core.config', 'dotenv', 'core.config']` — settings were frozen from a
pre-dotenv environment.

Every value in `.env` was silently ignored: `JWT_SECRET_KEY`, `ADMIN_EMAIL`,
`REDIS_URL`, `CORS_ORIGINS`, `RATE_LIMIT_*`. The symptom is vicious — you set
`JWT_SECRET_KEY` correctly and **production still refuses to boot claiming it is
unset**. My own comment asserting the order was correct was wrong.

**Fixed:** `core/config.py` loads `.env` itself, before `Settings()` is built.
Impossible to get wrong however it is imported. `override=False`, so a real
environment variable (compose/CI/systemd) still wins.

### 🔴 The rate limiter never engaged
Same root cause. `RATE_LIMIT_CALLS` never left its default of 120, so no
realistic test ever hit it. Now verified: limit=6 → 6×200, 4×429, with
`Retry-After` and `X-RateLimit-*` headers, `/health` exempt, and `X-Forwarded-For`
correctly bucketed per client.

### 🟠 Case Law was a working UI over an empty table
`/api/search/stats` returned `total_cases: 0`. `main.py` only calls
`seed_lawyers()`; cases and topics live in `scripts/seed_db.py`, which nothing
runs. Every search returned "Nothing matched" — reads as broken, not empty.

**Fixed:** documented as a required setup step, and the app now logs a warning at
startup when the case table is empty. After seeding: 21 cases, 10 landmarks,
6 courts.

## Also cleaned up

- **9 unused npm deps** removed (axios, react-router-dom, react-query, framer-motion, lucide-react, react-markdown, remark-gfm, clsx, react-hot-toast). `firebase` **kept** — it's a *dynamic* `import("firebase/app")` that naive grep misses.
- **`redis`** added to compose (healthchecked) and requirements. Streamlit service removed.
- `JWT_SECRET_KEY` in compose is now `${JWT_SECRET_KEY:?...}` — fails loudly instead of shipping the placeholder.
- Rate limiter honours `X-Forwarded-For` (behind nginx every user shared one bucket), exempts `/health`, returns `Retry-After` + `X-RateLimit-*`, bounds its memory, and fails **open**.
- `python-multipart` was declared twice.

---

## What you must do

1. **Revoke the Gmail App Password.** https://myaccount.google.com/apppasswords
2. **Rotate the Firebase key** and add authorised-domain + referrer restrictions.
3. **Purge git history** — both secrets are in past commits. `git filter-repo` or BFG. Rotating matters more than purging.
4. **Set `JWT_SECRET_KEY` and `ADMIN_EMAIL`** in `.env`.
5. **Source the real statute texts** — run `python backend/scripts/check_corpus.py`.
6. `npm install` (deps changed) and `pip install -r requirements.txt` (passlib → bcrypt).

## Verification performed

- `npm run build` → **Compiled successfully**; leaked key confirmed **absent** from the bundle; DOMPurify confirmed present.
- Security suite → **10/10** (escalation ×2, bootstrap, role-only guard ×2, token revocation, bcrypt ×3).
- Path traversal → **14 payloads, 0 escapes**, 4/4 legitimate names allowed.
- SSE → old parser corrupted **4/5** splits, new **0/5**.
- FAISS integrity → tampered pickle refused.
- All backend modules import; `compileall` clean; all 16 UI routes resolve.

---

## The grounding guard (asked for, and it was a good question)

> *"mera project law sa related hai aur RAG bhi hai — so why out of document answer dega?"*

Correct instinct, and investigating it found three real problems.

### The refusal was a request, not a guarantee
`routers/chat.py` called the LLM on **every** query. When retrieval found nothing,
the only protection was a prompt saying *"You MUST respond with exactly this... DO
NOT make up section numbers."*

Instruction-following is probabilistic. A leading follow-up ("but surely 302
covers this?") can walk a model past that, especially a small fast one. The
failure mode is this product's worst: an invented section number, in the register
of legal advice, to someone who cannot tell the difference.

**Fixed** (`services/refusal.py`): when `has_rag_context` is false the LLM is
never called. No prompt to jailbreak, no sampling to get unlucky with, no token
spend. Deterministic — on both `/api/chat/` and `/api/chat/stream` (the UI only
uses the latter, so guarding one would have been cosmetic).

Verified with no GROQ key set, so any LLM call is detectable:

```
QUESTION                                REACHED LLM   EXPECTED
What is the punishment for murder?            YES        YES    PPC 302 in corpus
Someone gave me a cheque that bounced         YES        YES    PPC 489F in corpus
Do I have a right to a fair trial?            YES        YES    Art 10A in corpus
How do I bake a chocolate cake?                NO         NO
What is the capital of France?                 NO         NO
Write me a poem about the sea                  NO         NO
```

### The prompt claimed laws that don't exist
It told the model: *"Your knowledge covers ... Industrial Relations Act 2012 &
Factories Act 1934, Consumer Protection Act 2019."* **None of those are in the
corpus.** Telling a model it knows labour law, when retrieval can never surface
labour law, is a standing invitation to invent it.

**Fixed:** the list is generated from the files actually in `data/laws/`, plus an
explicit *"You have NO other legal knowledge."*

### The UI described behaviour that didn't exist
`CitationStrip` said *"No statute matched. This is general guidance."* But the
backend gives no guidance at all in that case. The honesty mechanism was itself
inaccurate. Now: *"Nothing was answered from the law library, so no section is
cited. Take this to a lawyer."*

### Worth knowing
An empty/missing FAISS index means **every** query is refused. That is the right
failure direction — silence over invention — but it does mean
`scripts/ingest_laws.py` is not optional. See SETUP.md.

Note also that "What does the Indian IPC say about theft?" *does* reach the LLM:
retrieval correctly surfaces PPC §378, since the PPC derives from the IPC. It
answers about Pakistani law, which is right. The hard guard is for "no relevant
law at all"; country nuance is the prompt's job.

---

## "It isn't full RAG — I can get outsourced stuff"

Correct, and the chat guard was only half the job. Two more LLM paths existed:

| Path | Verdict |
|---|---|
| `POST /api/documents/ai-suggest` | **Fine.** Extracts field values from the user's own description into a JSON map. No legal reasoning, no citations. |
| `POST /api/documents/scan` | **Was the hole.** |

### The scan endpoint was pure LLM

Its prompt said *"You are a Pakistani legal document analyst"* and asked for
"Important Clauses" and "Red Flags" — **with no retrieval whatsoever**. The model
would write *"this clause violates Section 420 PPC"* straight from training data:
a legal citation with nothing behind it, on the page where someone decides
whether to sign a contract.

**Fixed:** the document now queries the corpus, retrieved law is passed as
context, and the prompt states those are the only statutes it may cite —
otherwise describe the document plainly and cite nothing.

Verified against the real index:

```
rent agreement   grounded=True   -> Rented Premises Ordinance, Qanun-e-Shahadat, PPC
FIR              grounded=True   -> PPC, Criminal Procedure Code
cake recipe      grounded=False  -> []
```

Retrieval uses the document's opening plus its legal-vocabulary sentences, not
the whole file — embedding 12,000 characters of contract returns noise.

The Scanner UI now shows the same `CitationStrip` as chat.

### Also found: the paste-text tab was broken

`ScanRequest` only accepted `file_data` (base64), but the UI's "Paste text" tab
sent `{text}` — **every paste 422'd**. It now takes either.

### Where the LLM can be reached now

- **grounded** — chat and scan, with retrieved statute attached
- **never called** — any question with no corpus match
- **no legal reasoning** — ai-suggest, which only reads the user's own words

---

## "Confirm my project is 100% RAG"

**It isn't, and it shouldn't be — but the honest audit found something serious.**

### What is and isn't grounded

| Surface | Grounded? |
|---|---|
| `/api/chat/` + `/api/chat/stream` | **Yes** — retrieval, or a code-level refusal |
| `/api/documents/scan` | **Yes** — now retrieves law for the document |
| `/api/documents/ai-suggest` | N/A — extracts fields from the user's own words |
| Case search | No — SQL over a seeded table. Legitimately a database, not RAG. |
| **Penalty table** (42 sections) | **No — hand-typed** |
| **Rights page** (7 citation sets) | **No — hand-written** |
| **FAQ** (30), **Glossary** (38) | **No — hand-written** |

Static reference content is fine; a glossary doesn't need retrieval. What is
**not** fine is a section number nobody ever checked.

### Two were the Indian Penal Code

Checking the hardcoded table against the enacted text:

| The table said | The PPC actually says |
|---|---|
| §307 — Attempt to murder | §307 — *Cases in which Qisas for qatl-e-amd shall not be enforced* |
| §304 — Culpable homicide | §304 — *Proof of qatl-i-amd liable to qisas* |

Both are **IPC** numbers. In Pakistan, attempted murder is **§324** and the
nearest equivalent of culpable homicide is *qatl shibh-i-amd*, **§315–316**.

The PPC and IPC began as the same 1860 statute, but Pakistan renumbered Chapter
XVI wholesale in the **Qisas and Diyat Ordinance 1990**. Any source trained
mostly on Indian law — which is most of them, and every general-purpose LLM —
hands you the IPC number for a Pakistani offence with total confidence.

That is precisely the failure this product exists to prevent, and it was sitting
in our own hardcoded data, rendered as fact on a page titled *"Offences and
punishments"*. **Fixed:** §307 → §324, §304 → §316.

> This is the single best piece of evidence the FYP has. It is not a hypothetical
> risk — the IPC/PPC confusion actually happened, in this codebase, and only
> checking against the enacted text caught it.

### Now enforced

`backend/scripts/verify_static_law.py` checks every hardcoded section against the
corpus and exits non-zero on failure. Current: **26 verified, 15 unverifiable**
(Labour, NAB and Consumer statutes aren't in the corpus).

The Penalty page now states this per tab — *"Checked against the statute"* vs
*"Not in our law library"* — the same honesty mechanism as the chat citation
strip. A hand-written claim is not presented with the confidence of a verified one.

---

## "100% real, no fakes" — the full purge

Asked to guarantee nothing fake remained. Auditing that found the worst content
in the project.

### The entire case database was fabricated

21 seeded "judgments". The party names give it away:

| Citation | "Case name" |
|---|---|
| 2022 PLC 78 | **XYZ Corporation** vs Labour Tribunal Karachi |
| 2022 PLJ 44 | State vs **Accused** (Murder) |
| 2021 SCMR 890 | State vs **Accused** (Domestic Violence) |
| 2021 CLC 88 | **Tenant vs Landlord** |
| 2022 Consumer Court 14 | **Consumer vs Mobile Company** |
| 2020 YLR 500 | Fatima Bibi vs **Brothers** |
| 2023 CLC 55 | Ali Ahmed vs **"Federation of Landlords"** — not a real body |
| 2021 SCMR **1234** | placeholder citation number |
| 2018 **PLD SC** 112 | citation inverted; Pakistani citations read "PLD 2018 SC 112" |

No case is called *"State vs Accused"*. No company is called *"XYZ Corporation"*.
These were LLM placeholders that were never replaced — sitting in a legal product
as **searchable case law**. Someone could have cited one in court.

A few were real (Benazir Bhutto v Federation **PLD 1988 SC 416** and Sindh High
Court Bar Association v Federation **PLD 2009 SC 879** — both verified against the
Supreme Court's own judgments). **Removed anyway**, because their *summaries* came
from the same process and were never checked. A real citation attached to an
invented holding is worse than a fake one: it survives a spot-check.

**All 21 deleted.** `search` is now `false` in `DEFAULT_FEATURES`, so the nav item
hides itself. Restore it from a real source — supremecourt.gov.pk publishes
judgments free — with verified citation, verified parties, and a summary derived
from the judgment text.

### Two more wrong sections, in the NAB tab

| The table said | The Ordinance actually says |
|---|---|
| §9(a)(ix) — Wilful default on bank loan | §9(a)(ix) — *cheating as defined in **s.415 PPC*** |
| §9(a)(xii) — Cheating by public official | §9(a)(xii) — *aids, assists, abets... conspiracy* |

Both corrected from the enacted text.

### Rather than delete the rest, six statutes were fetched

The Rights and Penalty pages cited 11 statutes the corpus didn't hold — an
uncheckable citation is the same problem as an invented one. So they were fetched:

- Industrial Relations Act **2012**
- Minimum Wages Ordinance 1961
- Employees' Old-Age Benefits Act 1976
- Protection Against Harassment of Women at the Workplace Act 2010
- National Accountability Ordinance 1999
- (Dissolution of Muslim Marriages Act 1939, earlier)

**The corpus caught a trap doing it.** The index's first match for "industrial
relations act" is the **2008 Act — repealed by Act X of 2012**. Shipping a
repealed statute as current law is exactly the failure being fixed, so
`fetch_laws.py` now refuses titles marked repealed/omitted and takes the 2012 Act.

**This made a headline feature actually work.** The homepage sample question
*"Company ne 3 mahine se salary nahi di"* previously retrieved nothing — there was
no labour law. Now:

```
Company ne 3 mahine se salary nahi di  -> industrial_relations_2012
minimum wage in Pakistan               -> minimum_wages_1961
workplace harassment complaint         -> harassment_2010
old age pension EOBI                   -> eobi_1976
```

### Deleted, because it could not be made real

- **Consumer tab** — consumer protection in Pakistan is *provincial* (Punjab 2005,
  Sindh 2014). No federal Act exists to check against.
- **Labour rows** citing Child Employment 1991, Bonded Labour 1992, IRESE 1969,
  Payment of Wages 1936, Factories Act 1934 — not in the corpus. The tab was
  rewritten around the three labour statutes we now hold, with real section
  numbers (and **Minimum Wages §11 → §9**, since §11 is "Protection of
  proceedings", not the wage prohibition).
- **"Denying women their inheritance"** — cited the Prevention of Anti-Women
  Practices Act 2011, not held.

### Where it stands

```
Corpus                     14 statutes, ~2.5 MB, official text
Static legal claims        33 verified · 0 failed · 0 unverifiable
Fabricated cases           0
Retrieval                  recall@5 15/17 · junk 0/6
```

`scripts/verify_static_law.py` enforces it and exits non-zero on failure.
Every remaining legal claim in the product is either retrieved from the corpus at
request time, or checked against the enacted text by that script.

---

## The news filter was letting almost everything through

The Legal News page was showing *"GTA 6: Release date, price, map, protagonists
and everything confirmed so far"* and PSL cricket coverage.

`_is_legal()` did `keyword.lower() in text` — **substring** matching. Short legal
abbreviations are substrings of very common English:

```
"FIR"    ->  con(fir)med, (fir)st, (fir)m, (fir)e
"NAB"    ->  (nab)bed, kid(nap)ping
"bail"   ->  (bail)out
"court"  ->  (court)esy, (court)ship
```

*"everything **confirmed** so far"* contains "fir", so GTA 6 was legal news.
Five of seven sample headlines were false positives — the filter was barely a
filter.

**Fixed:** whole-word matching (`\b` boundaries, compiled once per keyword list
rather than per article — this runs over 5 feeds × 40 entries per cache miss),
plus an exclusion list for sport/entertainment, which is the same RSS as news on
most Pakistani outlets.

```
GTA 6 ... everything confirmed so far      drop
PSL 11 draft: full list of players         drop
Pakistan confirms squad for first Test     drop
Man nabbed for kidnapping                  drop
Bailout package approved by IMF            drop
Courtesy visit by the ambassador           drop
Supreme Court rules on Article 63A         KEEP
LHC grants bail to suspect in murder case  KEEP
NAB files reference against former minister KEEP
Senate passes new ordinance on cybercrime  KEEP
```

10/10. Verified against live feeds: the page now returns things like *"Islamabad
ATC initiates proclamation proceedings against KP CM"*.

**Remaining nit:** the feeds are national, so some foreign legal stories get
through (an Australian graffiti prosecution). A Pakistan-only filter would be a
further refinement.

---

## The documents people actually execute

This was never audited, and it is the highest-stakes surface in the product. The
reference pages misinform a reader; **these are instruments** — a Talaq Nama taken
to a Union Council, a rent agreement printed on stamp paper, a Power of Attorney
relied on to sell property.

### The Talaq Nama had an invented deadline

```
printed:    "Notice of this Talaq shall be submitted to the Chairman ...
             within 7 days as required under Section 7(1) of the MFLO 1961"

MFLO 7(1):  "...shall, AS SOON AS MAY BE after the pronouncement of talaq ...
             give the Chairman notice in writing"
```

**There is no 7-day deadline in the Ordinance.** It was invented.

The same block also implied the 90 days run from pronouncement. Section 7(3) runs
them **from the day the notice is delivered to the Chairman** — a different date,
and the one that decides when a divorce is actually final.

Rewritten from the enacted text, and it now also states what the old version
omitted: Section 7(2) makes failing to give notice an offence (simple
imprisonment up to one year, or fine up to five thousand rupees, or both), and
Section 7(4) requires the Chairman to constitute an Arbitration Council within
thirty days.

### Templates cited statutes the corpus didn't hold

Partnership Act 1932, Transfer of Property Act 1882, Powers-of-Attorney Act 1882,
Factories Act 1934 — all fetched. The Sindh Rented Premises Ordinance 1979 is
provincial and not on the federal Pakistan Code, so the template now flags it as
unverified rather than citing it silently.

### Enforced

`backend/scripts/verify_documents.py` — every "Section N of <Act>" and every Act
named in a template body is looked up in the corpus. **11 verified, 0
unverifiable.** Known gaps are listed explicitly with reasons, because an
unexplained CI failure gets ignored, and an ignored check is worse than none.

It also refuses to pass when it finds *zero* claims — the first version's regex
broke on line-wrapped citations and reported a clean sweep of nothing.

**It does not verify the drafting is legally sound.** That needs a Pakistani
lawyer. It verifies every statute and section named is real and says what the
template says it says.

---

## Final state

```
Corpus                     21 statutes · 2,473 sections · 2,971 KB · 18 complete
Static legal claims        44 verified · 0 failed · 0 unverifiable
Generated documents        11 statutory claims verified · 0 unverifiable
Fabricated cases           0
Backend HTTP suite         37/37
Retrieval                  4,379 chunks · recall@5 15/17 · junk 0/6
Frontend                   compiles · 12/12 pages · 0 JS errors
```

Three verifiers, all CI-gateable:

```
python backend/scripts/check_corpus.py        # is the statute text complete?
python backend/scripts/verify_static_law.py   # do the reference pages match it?
python backend/scripts/verify_documents.py    # do generated documents match it?
python backend/scripts/eval_retrieval.py      # does retrieval actually work?
```
