---
name: legal-frontend
description: "Build, modify, and style React pages and components for Pakistan LegalAI — custom CSS-in-JS styles, Ico icons, API wiring, and SPA navigation."
argument-hint: "[page_or_component]"
license: MIT
metadata:
  author: Antigravity
  version: "1.0.0"
---

# Legal Frontend Skill

Use this skill to add pages, fix components, update styles, wire API calls, and build UI features inside the React 18 frontend of Pakistan LegalAI.

## When to Activate

- When a new page or route needs to be added to the React app.
- When an existing component (Chatbot, DocumentScanner, LawyerFinder, etc.) needs UI or logic changes.
- When CSS-in-JS styles, animations, or design tokens need to be updated.
- When frontend ↔ backend API integration needs to be added or debugged.
- When a new FAQ category, Glossary term, Penalty law entry, or Lawyer profile is required.
- When new icon paths need to be added to the `Ico` component.

## Architecture Overview

The frontend is a **React 18 SPA** using a custom `useState`-based navigation system. There is **no React Router DOM, no Tailwind CSS, no Framer Motion** in this project.

### Critical Rule: Single-File Architecture
All pages, styles, components, and navigation logic live in **one file**:
`react-frontend/src/App.jsx` (~2100 lines)

- **Do not** create new page files under `src/pages/` unless explicitly asked to refactor.
- All new pages go inside `App.jsx` as exported or inline function components.
- Layout shell (`src/components/Layout.jsx`) is used by a few pages but most pages render standalone inside `App.jsx`.

### Dev Server
```powershell
cd react-frontend
npm start   # Runs on http://localhost:3000
```
The `proxy` field in `package.json` forwards all `/api/...` calls to `http://localhost:8000` automatically.

## Tech Stack

| Library | Purpose |
|---|---|
| React 18 | Component rendering |
| Custom SPA nav | `useState` for `page`, `go(id)` to navigate |
| CSS-in-JS (`getCSS`) | All styles via `<style>` injection |
| `marked` | Parse LLM markdown responses |
| Axios / `fetch` | HTTP — via `apiFetch`/`apiPost`/`apiBlob` wrappers |
| Firebase 12 | Google OAuth sign-in |
| `react-hot-toast` | Toast notifications |

## Design Tokens (CSS Custom Properties)

All defined in `getCSS(theme)` — use them as `var(--name)` in inline styles:

| Variable | Value (dark) | Usage |
|---|---|---|
| `--gold` | `#c9a84c` | Buttons, highlights, active borders |
| `--gold-d` | `#a8882e` | Gold hover |
| `--gold-l` | `rgba(201,168,76,0.10)` | Gold tint backgrounds |
| `--ink` | `#e8e0cc` | Primary text |
| `--ink2` | `#b8a98a` | Secondary text |
| `--muted` | `#5a5a6e` | Placeholder / disabled text |
| `--bg` | `#09090b` | Page background |
| `--surface` | `#111116` | Card background |
| `--surface2` | `#16161c` | Input background |
| `--teal` | `#2a9d8f` | Accents, streaming cursor |
| `--border` | `rgba(201,168,76,0.12)` | Card borders on hover |
| `--border2` | `rgba(255,255,255,0.05)` | Default card borders |

The light theme overrides these automatically — always use `var(--name)`.

## Workflow

### Step 1: Add a New Page

1. Open [react-frontend/src/App.jsx](file:///e:/Projects/pakistan-legalai/pakistan-legalai/react-frontend/src/App.jsx).
2. Add a nav entry in the `Nav` component's `links` array:
   ```js
   {id:"mypage", l:"My Page"}
   ```
3. Define the page component as a function in `App.jsx` (near the bottom, before the main `App` function):
   ```jsx
   function MyPage({ go }) {
     return (
       <div className="page"><div className="wrap">
         ...
       </div></div>
     );
   }
   ```
4. Handle it in the main `App` render block:
   ```jsx
   {page==="mypage" && <MyPage go={go}/>}
   ```

### Step 2: API Integration

All backend calls use the three wrappers at the top of `App.jsx`:

```js
const BASE = "";  // proxy handles routing to :8000

// GET with auth header
const data = await apiFetch("/api/rights");

// POST JSON with auth header
const result = await apiPost("/api/search", { query: "bail conditions" });

// POST, get back a Blob (e.g. PDF download)
const blob = await apiBlob("/api/documents/generate", { template_id: "rent", fields: {...} });
```

For SSE streaming (Chatbot):
```js
const resp = await fetch(`${BASE}/api/chat/stream`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ message, history }),
});
const reader = resp.body.getReader();
const decoder = new TextDecoder();
// ... read chunks and parse data: {...}\n\n SSE events
```

### Step 3: Styles

Add new CSS classes inside `getCSS(theme)`:

```js
const getCSS = (theme) => `
  ... existing styles ...
  
  .my-new-class {
    background: var(--surface);
    border: 1px solid var(--border2);
    color: var(--ink);
    transition: all .25s;
  }
  .my-new-class:hover {
    border-color: var(--border);
    background: var(--gold-l);
  }
`;
```

For theme-dependent values, use a conditional block like the navbar pattern already in the file.

### Step 4: Icons

Use `<Ico n="..." s={18} c="var(--gold)"/>` for any icon:

```jsx
<Ico n="scale" s={20} c="var(--gold)"/>    // scales of justice
<Ico n="file" s={16} c="var(--muted)"/>    // file document
<Ico n="srch" s={14} c="currentColor"/>    // search magnifier
```

To add a new icon, add an entry to the `p` object in the `Ico` component:
```jsx
myicon: <><path d="..."/></>,
```

## Key Components Reference

| Component | Location | Notes |
|---|---|---|
| `DisclaimerModal` | `App.jsx` | First-time legal disclaimer (localStorage flag) |
| `Nav` | `App.jsx` | Fixed navbar with theme toggle and mobile hamburger |
| `Chatbot` (streaming) | `App.jsx` | SSE streaming from `/api/chat/stream` |
| `DocumentScanner` | `App.jsx` | POST to `/api/documents/scan`, "Paste Text" tab |
| `LawyerFinder` | `App.jsx` | Static list of 16 lawyers with filter |
| `LawyerBooking` | `App.jsx` | Booking form per lawyer |
| `CaseTracker` | `App.jsx` | localStorage-persisted case tracking |
| `FAQPage` | `App.jsx` | 34 Q&As across 6 legal categories |
| `GlossaryPage` | `App.jsx` | 38 terms, alphabetically grouped |
| `PenaltyLookup` | `App.jsx` | 6 laws (PPC, PECA, Labour, MFLO, NAB, Consumer) |
| `LoginPage` | `App.jsx` | JWT + Google OAuth, token in `localStorage.access_token` |
| `LegalNews` | `App.jsx` | Live RSS news from `/api/news/` |
| `Spin` | `App.jsx` | Inline spinner `<Spin/>` |
| `MarkdownBubble` | `App.jsx` | Renders LLM markdown with `marked` |

## Built-in CSS Classes

```
Layout:   .page  .wrap  .wrap-sm  .chat-wrap  .chat-body  .chat-ft
Cards:    .card  .card-gold  .card-purple
Buttons:  .btn-primary  .btn-gold  .btn-outline  .btn-ghost
Inputs:   .inp  (textarea.inp  select.inp)
Badges:   .badge .bt(teal) .bg(gold) .bb(blue) .bp(purple) .br(red) .bgr(green) .bverified
Chat:     .bu .ba .bub .bub-u .bub-a
Tabs:     .tabs  .tab  .tab.active
Misc:     .divider  .section-label  .gold-line  .gold-line-center  .ticker  .prog-bar  .prog-fill
Anim:     .fu (fadeUp)  .stream-cursor  .d1 .d2 .d3 (typing dots)
Decorators: .ctl .tl .br2 (corner accent lines)
```

## What to Avoid

- **Do not** call Anthropic or external AI APIs directly from the browser.
- **Do not** create separate `.css` files — all styles go in `getCSS()`.
- **Do not** use Tailwind utility classes.
- **Do not** add `react-router-dom`, `framer-motion`, or `lucide-react` — they are not installed.
- **Do not** store sensitive data (API keys, secrets) in frontend code.
- **Do not** use `var` — use `const` / `let` throughout.
- **Do not** add new npm packages without confirming with the user.
- **Do not** hardcode `http://localhost:8000` — use `BASE + path` where `BASE = ""`.
- **Do not** store auth token under any key other than `"access_token"`.
