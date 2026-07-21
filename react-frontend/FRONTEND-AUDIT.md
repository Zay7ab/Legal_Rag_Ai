# Frontend completion — what I found by actually looking

Previously I'd only *seen* 3 of 16 screens; the rest were verified as "renders,
no errors", which is not the same as "works". So I ran the real backend, proxied
`/api` like nginx does, and walked every page with live data.

That found things static checks could not.

---

## Bugs found and fixed

### 1. 🔴 The News page crashed outright
React error #31 — *"objects are not valid as a React child"*. The API returns
`sources` as objects `{id, name, logo}`; the component rendered them as strings.
**The whole page white-screened.** It passed every earlier check because with no
backend the fetch failed and the filter row never rendered.

Fixed, plus defensive shape guards — a backend change should degrade a filter
row, not take down a page.

### 2. 🔴 Every news story linked to nothing
`it.link` → the API returns `url`. `href={undefined}`, so clicking a headline did
nothing. `it.published` → the API returns `date`, so no timestamp ever rendered.

### 3. 🟠 The lawyer directory threw away most of its data
`l.experience` → the field is `exp`. That line never rendered once.

Worse, **9 fields the backend had been serving all along were unused**:
`fee`, `verified`, `languages`, `courts`, `about`, `whatsapp`, `chamber`, `edu`.
For a "find a lawyer" page, fee and verification are the two things people
actually want. Cards showed a name and a city.

Now shown: verified badge, experience, languages, about, court badges, fee, and
a WhatsApp link — which is how most people in Pakistan actually contact a lawyer.

### 4. 🟠 A stat that could never render
Search read `stats.courts`; the API returns `courts_breakdown` (an object).
Always undefined, so the line was dead. Now derives the count, and adds
`landmark_cases`.

---

## Urdu / RTL — implemented

Was the honest gap. Now `lib/i18n.js` + `LangProvider`.

- Interface language **separate** from answer language — a user may want Urdu
  chrome with English answers, or the reverse
- `dir`, `lang`, `.urdu` set on `<html>`; everything follows from that
- **All 15 component/page files converted from physical to logical CSS**
  (`ml-`→`ms-`, `pl-`→`ps-`, `left-0`→`start-0`, `text-left`→`text-start`,
  `border-l`→`border-s`). They mirror automatically — no second stylesheet
- Nastaliq line-height (~2.05); the mono eyebrow falls back (wide tracking is
  meaningless in Nastaliq)
- The grounding line is translated — *"کوئی قانون نہیں ملا۔"* — because that's
  the product's honesty mechanism and it must exist in both languages

**Verified:** `dir=rtl`, `lang=ur`, zero horizontal overflow, no JS errors, and
LTR unaffected by the conversion.

**Scope, stated plainly:** chrome only — nav, buttons, headings, disclaimer,
grounding. Page body copy stays English and `t()` always falls back to it.
Translating a legal product's body copy needs a native Urdu writer; a clumsy
translation of legal guidance is worse than an honest English fallback.

---

## Not a frontend bug — but you should know

**Your news feed is not legal news.** Live output included *"GTA 6: Release date,
price, map"* and PSL cricket coverage. The RSS filter in `backend/routers/news.py`
is pulling general headlines from ARY/Geo rather than their law sections. The
page renders it faithfully — the filter is the problem. Worth 20 minutes before
a demo, since it's on a nav item an examiner will click.

---

## Verified this pass

- Real backend running, `/api` proxied, **live data on every page**
- 10/10 nav destinations render · **zero JS errors**
- Detail views exercised: Docs form, Rights detail, Penalty, Glossary, Booking
- Urdu RTL and English LTR both clean, no overflow at 1340px or 390px
- `npm run build` compiles

## Still not verified

- **Chat with a real answer streaming.** Needs a live GROQ key — the stamp frame
  and citation strip together are still unseen by me.
- Admin's live tabs (needs an admin login)
- Real browsers. Everything here is Chromium via Puppeteer; Safari/Firefox
  untested.
