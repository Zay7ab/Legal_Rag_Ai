# Design notes

## Brand

**Legal Rag Ai.** The mark is the supplied icon rebuilt as vector
(`public/logo.svg`, ~8KB): brass scales on a circuit board, mint documents and
speech bubbles, deep green ground.

Palette was **sampled from the original**, not reinterpreted — `#04332E` ground,
`#EBB542`/`#C58834` brass, `#85D6A8`/`#72C499` mint, `#3F7165` traces. It already
harmonises with the design system: the ground sits between `seal` (#0F5D4A) and
`well` (#0C1310), and the mint is close to `seal-bright` (#3FA88A). Gold is the
one addition and it earns its place — these are brass scales, not a decorative
metallic accent.

Vector rather than upscaled because a 600px raster is soft above native size and
illegible at 16px. One file now drives the favicon (.ico, multi-resolution),
Apple touch icon, PWA 192/512, and the 1200x630 link-preview card. Geometry is
redrawn on a 512 grid — true verticals, symmetric beam, real chain strings —
not traced.

Why the frontend looks the way it does. Useful for your FYP report — examiners
ask "why this colour, why this font", and "it looked nice" is not an answer.

---

## The problem with the old design

It wasn't just dated. It was **generic in a specific, recognisable way**:
cream ground (`#f5f0e8`), gold accent (`#c9a84c`), high-contrast serif
(Cormorant Garamond). That exact combination — warm cream + serif + warm metallic
accent — is the house style AI design tools produce for *any* brief. It said
"premium template", not "Pakistani legal platform". Nothing about it was
specific to law, or to Pakistan.

Three looks are the current defaults, and all three were avoided:
1. cream + high-contrast serif + terracotta *(what this app had)*
2. near-black + a single acid-green/vermilion accent
3. broadsheet: hairline rules, zero radius, dense columns

---

## Where the new design comes from

Grounded in the artifacts of Pakistani legal practice, not in a mood board.

| Token | Value | Why |
|---|---|---|
| `paper` | `#EDF1EC` | Judicial stamp paper — a **cool, faintly green** white. Deliberately not warm cream. |
| `ink` | `#101418` | Iron-gall ink: the near-black every court document is written in. |
| `seal` | `#0F5D4A` | Deepened stamp-paper green. The primary voice. Not flag green — that would be nationalist decoration, not a legal signal. |
| `tape` | `#A33A28` | **Red tape** — the literal cloth tape binding Pakistani court files. Reserved for genuine urgency. |
| `well` | `#0C1310` | Dark mode as an ink-well, not a generic near-black. |

### Typography

| Role | Face | Why this one |
|---|---|---|
| Display | **Newsreader** | Editorial authority with an optical-size axis. Chosen *against* Cormorant/Playfair, the reflexive "serif = legal" picks. |
| Body | **Public Sans** | Designed for government/civic services. The product **is** civic legal information — the face is on-subject, not just legible. |
| Data | **IBM Plex Mono** | Section numbers are *identifiers*, not prose. Setting `§302` in mono says so. |
| Urdu | **Noto Nastaliq Urdu** | Loaded separately so it doesn't block first paint for English users. |

---

## The signature: the stamp-paper rule

Pakistani legal instruments are executed on judicial stamp paper, which carries
a fine double rule with ticked corners. That frame (`.stamp` in `index.css`) is
the one memorable mark, and it is **rationed**: it appears only on things that
are instruments of record — an AI answer, a generated document, the specimen in
the hero. Everything else stays quiet. Applied to every card it would stop
meaning anything.

## Structure encodes content

Numbering is used **only where order is real information** — the "what to do, in
order" steps on the Rights page. It is deliberately *not* used as decorative
`01 / 02 / 03` eyebrows on the homepage pillars, which are a set, not a sequence.

The section number (`§`) is the atom of this domain — it's the wordmark, the
`<Cite>` component, and the structural spine of the Penalty page.

---

## The design decision that matters most

**Every answer states whether it is grounded in a statute.**

The backend has always returned `has_rag_context`. The old UI ignored it, so a
grounded citation and an ungrounded guess **looked identical**. For a legal
tool that is the worst possible failure — it's exactly the case where a user
can't tell whether to trust what they're reading.

`CitationStrip.jsx` says it both ways:

- grounded → names the statutes it read
- ungrounded → *"No statute matched. This is general guidance…"*, in red tape

This is also why the corpus gap is a design issue, not just a data one: at ~2%
coverage most answers land in the ungrounded state. That is now **visible**
rather than hidden. Being told is the point.

The homepage teaches this before the user ever asks a question ("How to read an
answer"), so the ungrounded state reads as an honest outcome, not a bug.

### The same principle on Booking

The old booking wizard ended in a green **"Booking confirmed!"** — but there is
no bookings API, and nothing was ever sent anywhere. Someone with a court
deadline could have waited for a call that was never coming.

It now drafts a request, says plainly *"Nothing is booked from this page"*, and
hands over the lawyer's real contact details. When `routers/bookings.py` exists,
swap the local save for a POST and delete the notice.

---

## Structure

```
src/
  App.jsx            148 lines — shell + routing only (was 2,674)
  index.css          design tokens, .stamp signature, answer prose
  theme.js           (legacy CSS-in-JS, retained during migration)
  lib/
    api.js           request() + token refresh + session events
    hooks.js         useIsMobile
    sessions.js      per-user chat history
    constants.js     sample questions
  data/legal.js      30 FAQs · 38 glossary terms · 42 penalties
  components/
    ui/index.jsx     Button Card Input Field Badge Cite Skeleton Empty ErrorNote
    Icon.jsx         44 icons, ported
    Markdown.jsx     DOMPurify-sanitised renderer
    CitationStrip.jsx
    Nav.jsx          grouped: Ask / Documents / People & cases
    DisclaimerModal.jsx
  pages/             16 pages, lazy-loaded
```

**Nav grouping:** 16 flat destinations is a wall. People arrive with a question,
a document need, or a need for a person — so: **Ask / Documents / People & cases**.

**Code splitting:** main bundle **116.65 kB → 57.08 kB gzipped (−51%)**. Home
and the shell are all a first-time visitor downloads.

---

## Quality floor

Not announced in the UI, just done:

- Responsive to 390px, verified: zero horizontal overflow
- Visible keyboard focus everywhere (`:focus-visible`, never removed)
- `prefers-reduced-motion` respected
- Semantics: `aria-pressed`, `aria-expanded`, `role="alert"`, `role="switch"`; icons `aria-hidden` with names on the controls
- Severity never encoded by colour alone — the word is always present too
- Escape and outside-click close menus; body scroll locks behind the drawer
- Empty and error states explain what to do, and don't apologise

## Verified

- `npm run build` → **Compiled successfully**
- **12/12 pages render, zero JS errors**
- Firebase key **absent** from the bundle; DOMPurify **present**
- Light + dark reviewed visually at 1440px; mobile at 390px

## Imagery — and what was deliberately not used

**No flag.** It would say "Pakistani", which the content already says louder
(PPC, FIR, khula, Roman Urdu on the homepage). Every second Pakistani site puts
one in the header; it reads as generic decoration, not authority.

**No stock photo of a courthouse.** Copyrighted, ~500KB, and a photo of a court
says *institution* to someone who is frightened. The user arrived because
something went wrong; the page shouldn't intimidate them.

**Instead: the Supreme Court of Pakistan, drawn** (`components/CourtBuilding.jsx`,
~4KB). Its swept colonnade is genuinely distinctive, so it carries the same
meaning while being *specific*. Original line work, no licensing question. Uses
`currentColor`, so one asset serves both themes. Sits at ~7% opacity behind the
corpus section: a watermark, not a hero image. The flagstaff is the single nod to
national identity, and it is a real feature of the building.

## The corpus receipts

Every competitor claims "Pakistan-focused legal intelligence". AI Attorney's
homepage advertises *"0K+ Records Indexed, 0+ Courts & Tribunals, 0.0% Uptime,
Consumers 0"* — placeholders never filled in.

So this homepage prints receipts instead: 9 statutes, 1,833 sections, 2,278 KB,
6 of 9 complete — counted from disk at request time, served from a **public**
`/api/corpus/` endpoint. The Punjab Rent Act shows 12%, because a coverage claim
is only worth something if it admits its gaps. A number anyone can check beats a
number that sounds good.

## "Make it look high-end / futuristic"

Fair pressure, and acted on — with one thing refused.

### Added

- **The circuit field** (`components/CircuitField.jsx`). The logo already sets
  the scales on a circuit board; that motif was doing nothing at 28px. It is now
  the hero's atmosphere: traces at 4-8% opacity, pulses running *inward* toward
  the content on a 4.5s cycle, faded out before they reach the words.
- **Bigger type.** The headline was polite; it is now ~4.6rem with tighter
  tracking. A hero should be able to carry a room.
- **Real depth.** `shadow-deep` is layered — a tight contact shadow plus a wide
  ambient one tinted seal-green. One blur reads as "div with a box-shadow"; two
  read as an object on a surface.
- **Motion with intent.** The specimen answer reveals left-to-right on load,
  because the product *streams* its answers — it should look like one arriving,
  not a screenshot. All of it behind `prefers-reduced-motion`.

### Refused, and why

The reference was a law-firm landing page. That genre's playbook: hero photo of
lawyers, **"20+ Years · 500+ Cases Won · 98% Success Rate"**, "Book a Free
Consultation", gradients.

Those are **sales-page trust signals**, and this is not a sales page. A law firm
claims authority because it wants your retainer. This product's authority comes
from something better: every claim is checkable, and it says so when it has none.

Concretely, adopting that playbook means re-introducing invented statistics one
day after purging 21 fabricated judgments and two Indian Penal Code section
numbers — and inventing a "Book a Free Consultation" button over a booking
feature that has no backend and honestly says so. AI Attorney ran that playbook;
their live homepage reads *"0K+ Records Indexed · 0.0% Platform Uptime ·
Consumers 0"*. Placeholders never filled in.

Gradient meshes and blob fields also date. A circuit board that came out of your
own logo does not — it was never borrowed.

**Restraint is a decision here, not timidity.** The reader is frequently
frightened and wants to know whether they are going to prison. A page can be
beautiful without being busy.

## Urdu / RTL

Implemented (`lib/i18n.js`). `LangProvider` sets `dir`, `lang` and a `.urdu`
class on `<html>`; everything else follows from that.

- **Two separate languages, deliberately.** Interface language (nav, buttons) is
  independent of answer language in Chat. A user may want Urdu chrome with
  English answers, or the reverse.
- **Logical CSS properties throughout.** All 15 component/page files were
  converted from physical (`ml-`, `pl-`, `left-0`, `text-left`, `border-l`) to
  logical (`ms-`, `ps-`, `start-0`, `text-start`, `border-s`). They mirror
  automatically under `dir="rtl"` — no second stylesheet, no manual flipping.
  Directional icons carry `data-flip` and are mirrored by a single CSS rule.
- **Nastaliq needs room.** Deep descenders and long ligatures, so `.urdu` raises
  line-height to ~2.05. The mono eyebrow (wide letter-spacing) is meaningless in
  Nastaliq and falls back to the normal face.
- **Verified:** `dir=rtl`, `lang=ur`, `.urdu` set; zero horizontal overflow; no
  JS errors; LTR unaffected.

**Scope, honestly:** this covers the **chrome** — navigation, buttons, headings,
the disclaimer, and the grounding line ("کوئی قانون نہیں ملا۔"), which matters
most because it is the product's honesty mechanism. Long-form page body copy is
still English. `t(key, english)` always falls back to English, so nothing renders
blank. Translating the body copy of a legal product should be done by someone who
writes Urdu natively — a clumsy translation of legal guidance is worse than an
honest English fallback.

## Known gaps

- Page body copy is English in Urdu mode (see above) — deliberate.
- The specimen answer in the hero stays English; it demonstrates the answer
  *format*, and the real Chat answers do render RTL + Nastaliq.
