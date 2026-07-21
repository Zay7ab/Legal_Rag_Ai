import { useLang } from "../lib/i18n";

/* ── Supreme Court of Pakistan ────────────────────────────────────────────────
   Line drawing, not a photograph.

   Why drawn rather than sourced:
     - stock photos of the building are copyrighted; this is original work
     - ~4KB versus ~500KB, and crisp at any size
     - a photo of a courthouse says "institution" to someone who is frightened;
       a line drawing says "this is about the law" without the intimidation

   Why this building and not a flag: the flag would say "Pakistani", which the
   content already says louder (PPC, FIR, khula, Roman Urdu). It adds nothing a
   user doesn't know and reads as decoration. The Supreme Court's swept colonnade
   is genuinely distinctive — no other building looks like it — so it carries the
   same meaning while being specific rather than generic.

   currentColor throughout, so it inherits the surrounding text colour and works
   in both themes without a second asset. */
export const CourtBuilding = ({ className = "", strokeWidth = 1.5 }) => (
  <svg
    viewBox="0 0 640 220"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
    focusable="false"
  >
    {/* ground line */}
    <path d="M20 206 H620" opacity="0.5" />

    {/* ── the sweep: the building's actual signature ────────────────────── */}
    <path d="M96 132 Q320 46 544 132" />
    <path d="M96 142 Q320 56 544 142" opacity="0.7" />

    {/* colonnade — arches thin out toward the ends, matching the perspective */}
    <g>
      <path d="M118 206 V150 Q118 138 130 138 Q142 138 142 150 V206" />
      <path d="M158 206 V143 Q158 131 170 131 Q182 131 182 143 V206" />
      <path d="M198 206 V137 Q198 125 210 125 Q222 125 222 137 V206" />
      <path d="M238 206 V131 Q238 119 250 119 Q262 119 262 131 V206" />
      <path d="M278 206 V126 Q278 114 290 114 Q302 114 302 126 V206" />
      <path d="M318 206 V124 Q318 112 330 112 Q342 112 342 124 V206" />
      <path d="M358 206 V126 Q358 114 370 114 Q382 114 382 126 V206" />
      <path d="M398 206 V131 Q398 119 410 119 Q422 119 422 131 V206" />
      <path d="M438 206 V137 Q438 125 450 125 Q462 125 462 137 V206" />
      <path d="M478 206 V143 Q478 131 490 131 Q502 131 502 143 V206" />
      <path d="M518 206 V150 Q518 138 530 138 Q542 138 542 150 V206" />
    </g>

    {/* plinth */}
    <path d="M78 206 H562" opacity="0.9" />
    <path d="M92 196 H548" opacity="0.45" />

    {/* steps */}
    <g opacity="0.5">
      <path d="M258 206 H402" />
      <path d="M248 214 H412" />
    </g>

    {/* wings */}
    <path d="M46 206 V166 H96" opacity="0.6" />
    <path d="M594 206 V166 H544" opacity="0.6" />
    <path d="M46 166 Q46 156 58 156 H84" opacity="0.4" />
    <path d="M594 166 Q594 156 582 156 H556" opacity="0.4" />

    {/* flagstaff — the one nod to national identity, and it is a real feature
        of the building rather than a graphic pasted on top */}
    <path d="M320 46 V18" opacity="0.55" />
    <path d="M320 20 h22 l-6 7 6 7 h-22 z" opacity="0.55" />
  </svg>
);

export default CourtBuilding;
