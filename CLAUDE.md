# Pakistan LegalAI — Claude Code Rules

## Project Overview

AI-powered legal assistance platform for Pakistani citizens. Backend: FastAPI + SQLite + FAISS/Groq. Frontend: React 18 SPA.

**Author:** Antigravity | **Version:** 5.0.0

---

## Start Commands

```powershell
# Backend (from backend/)
cd backend
.\venv\Scripts\Activate.ps1
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Frontend (from react-frontend/)
cd react-frontend
npm start   # http://localhost:3000
```

---

## Stack

| Layer | Technology |
|---|---|
| Backend | FastAPI, SQLAlchemy, SQLite, Uvicorn |
| LLM | Groq LLaMA-3.3-70b via `llm_service.py` |
| RAG | FAISS + sentence-transformers (`all-MiniLM-L6-v2`) |
| Frontend | React 18 (Create React App), custom SPA navigation |
| Styling | CSS-in-JS — `getCSS(theme)` injected via `<style>` tag |
| Icons | Custom `Ico` SVG component in `App.jsx` |
| HTTP | `apiFetch` / `apiPost` / `apiBlob` wrappers in `App.jsx` |
| Auth | JWT (FastAPI) + Firebase Google OAuth |
| Documents | ReportLab + Jinja2 (PDFs), pypdf (parsing) |

---

## Critical File Locations

```
react-frontend/src/App.jsx          ← ALL frontend pages + styles (~2100 lines, single file)
react-frontend/src/components/      ← Layout.jsx (used by some pages)
react-frontend/src/pages/           ← Dashboard.jsx only

backend/main.py                     ← FastAPI app entry, router registration
backend/routers/                    ← auth.py, chat.py, search.py, documents.py, rights.py, news.py
backend/services/llm_service.py     ← Groq LLaMA-3.3-70b calls
backend/services/rag_service.py     ← FAISS retrieval (threshold 0.85)
backend/services/doc_service.py     ← Jinja2 templates + ReportLab PDF generation
backend/db/models.py                ← Case, Topic SQLAlchemy models
backend/db/auth_models.py           ← User model
backend/db/database.py              ← Engine, SessionLocal, get_db
backend/data/laws/                  ← Law PDFs for RAG ingestion (currently empty)
backend/data/faiss_index/           ← index.faiss + index.pkl

skills/                             ← Claude Code skills for this project
```

---

## Frontend Rules

### Architecture — Single File
All pages, styles, routing, and components live in **`react-frontend/src/App.jsx`**. This is intentional.
- New pages = function components defined in `App.jsx`, added to the `links` array in `Nav` and handled in the main `App` render switch.
- Do **not** create new files in `src/pages/` unless explicitly asked to split the file.

### Navigation
The app uses a **custom `useState`-based navigation** (not React Router DOM).
- `const [page, setPage] = useState("home")` in the root `App` component.
- `go(id)` is the navigate function passed down as a prop.
- To add a new page: add `{id:"mypage", l:"My Page"}` to the `links` array in `Nav`, then handle `page === "mypage"` in the main render block.

### Styling — CSS-in-JS
All styles are defined in **`getCSS(theme)`** at the top of `App.jsx` and injected via a `<style>` tag. CSS custom properties (`--gold`, `--ink`, `--surface`, etc.) are the design tokens.
- Add new styles inside `getCSS(theme)`.
- Do **not** create separate `.css` files.
- Do **not** use Tailwind utility classes — the project does not use Tailwind in JSX.

**Brand palette (CSS variables):**
```
--gold:    #c9a84c   buttons, highlights, active borders
--ink:     #e8e0cc / #1a1a2e   body text (dark/light)
--bg:      #09090b / #f5f0e8   page backgrounds
--surface: #111116 / #ffffff   card backgrounds
--teal:    #2a9d8f   accents, streaming cursor
```

### Icons
Use the built-in **`<Ico n="..." s={18} c="currentColor"/>`** component — do not add Lucide React or any other icon library.

Available icon names: `scale`, `msg`, `srch`, `file`, `shld`, `send`, `user`, `out`, `spk`, `chk`, `arr`, `dn`, `up`, `dl`, `book`, `faq`, `map`, `gavel`, `abc`, `warn`, `copy`, `star`, `note`, `phone`, `close`, `sun`, `moon`, `verify`, `mic`, `micoff`, `tup`, `tdn`, `hist`, `plus`, `trash`, `scan`, `cam`, `cal`, `clk`, `brief`, `tag`, `rf`, `up2`, `news`.

### API Calls
All HTTP calls use the three wrappers at the top of `App.jsx`:
```js
const BASE = "";  // proxy forwards /api/... → :8000

apiFetch(path)           // GET with auth header
apiPost(path, body)      // POST JSON with auth header
apiBlob(path, body)      // POST, returns Blob (for PDF download)
```
- **Never** hardcode `http://localhost:8000` — `BASE` is `""` and the proxy handles it.
- **Never** call Anthropic, Groq, or any LLM API directly from the browser.

### Auth
- JWT stored in `localStorage` as **`"access_token"`**.
- Refresh token stored as `"refresh_token"`.
- All three wrappers automatically include `Authorization: Bearer <access_token>`.
- On logout: `localStorage.clear()`.

### Animations
CSS keyframe animations defined in `getCSS()`: `fadeUp`, `blink`, `pulse`, `float`, `spin`, `modalIn`.
- Apply with class names: `className="fu"` (fadeUp), or via inline `style={{animation:"..."}}`
- Do **not** add Framer Motion — the project uses CSS animations.

---

## Backend Rules

1. **Venv** — Always activate `backend/venv` before running Python. IDE "cannot find module" errors are false positives from system Python (pyrefly ignores are already applied).
2. **Router pattern** — Each feature = one file in `backend/routers/`. Register in `main.py` with `app.include_router(...)`.
3. **DB sessions** — Always use `db: Session = Depends(get_db)` in route functions. Never instantiate `SessionLocal()` directly in a router.
4. **LLM calls** — Use `llm_service.py` (`call_groq_llm` / `llm_service.chat` / `llm_service.stream`). Do not call Groq SDK directly from routes.
5. **Streaming** — SSE endpoint uses `StreamingResponse` with `media_type="text/event-stream"`.
6. **Logging** — Use `logging.getLogger(__name__)` in each module. No `print()` in routers or services.
7. **Secrets** — All in `backend/.env`. Never hardcode API keys.
8. **Type hints** — All function signatures must have type hints. All schemas are Pydantic models.

---

## Known Issues / Gaps

| Gap | Detail |
|---|---|
| FAISS RAG inactive | `backend/data/laws/` is empty — no PDFs ingested yet |
| Rate limiter | In-memory only — not production-safe (needs Redis) |
| JWT storage | In `localStorage` (should be HttpOnly cookies for production) |
| No tests | No unit or integration tests exist |
| Vision | Document Scanner image mode unsupported (Groq has no vision API) |

---

## Available Skills

| Skill | Purpose |
|---|---|
| `legal-frontend` | React pages, CSS-in-JS styles, API wiring, Ico icons |
| `legal-db-manage` | Database setup, migrations, seeding court cases |
| `legal-doc-generate` | PDF templates, Jinja2, ReportLab styling |
| `legal-rag-ingest` | FAISS index build, law PDF ingestion |

---

## Claude Code Behavior Rules

- **Do not** add comments explaining what code does — only add comments for non-obvious WHY.
- **Do not** create `README.md` or documentation files unless explicitly asked.
- **Do not** refactor or clean up code beyond what the task requires.
- **Do not** add error handling for impossible scenarios.
- **Do not** introduce abstractions for hypothetical future requirements.
- **Do** use `const`/`let` (JS) and type hints (Python) throughout.
- **Do** ask before running destructive operations (dropping tables, deleting files, force-pushing).
- **Do** run the dev server and verify UI changes in a browser before reporting done.
