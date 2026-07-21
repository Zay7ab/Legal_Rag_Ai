/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: ["./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // Palette derives from Pakistani legal artifacts, not a generic theme:
        //   ink   — iron-gall ink, the near-black every court document is written in
        //   paper — judicial stamp paper: a COOL, faintly green white (deliberately
        //           not the warm cream that every AI-generated design reaches for)
        //   seal  — deepened stamp-paper green; the primary voice of the product
        //   tape  — "red tape", the literal cloth tape binding court files.
        //           Used only for real urgency, never decoration.
        // Deepened across the board. The first pass was too polite: everything sat
        // in a narrow value band, so nothing had presence and the whole page read
        // as unfinished rather than restrained. Restraint needs contrast to read
        // as a choice.
        ink:   { DEFAULT: "#0A0F0D", 2: "#2C3833", 3: "#5A6862" },
        paper: { DEFAULT: "#EDF1EC", 2: "#DFE6DE", 3: "#C7D2C8" },
        seal:  {
          DEFAULT: "#0B5341",   // richer, less grey
          hover:   "#083F31",
          deep:    "#052A21",   // for large fills that need to feel solid
          tint:    "#D5E6DD",
          bright:  "#46C79E",   // dark-mode lift, more saturated
          glow:    "#6FE3BC",   // accents only, never text
        },
        tape:  { DEFAULT: "#B03D28", tint: "#F6DCD6" },
        brass: { DEFAULT: "#EBB542", deep: "#C58834" },   // from the logo
        // Dark mode: an ink-well, not a generic near-black.
        well:  { DEFAULT: "#070D0B", 2: "#0E1613", 3: "#16211C", 4: "#1E2B25" },
      },
      fontFamily: {
        // Newsreader: editorial authority with an optical-size axis. Chosen over
        // Cormorant/Playfair, which are the reflexive "serif = legal" picks.
        display: ['Newsreader', 'Georgia', 'serif'],
        // Public Sans: literally designed for government/civic services. The
        // product IS civic legal information, so the face is on-subject.
        sans:    ['"Public Sans"', 'system-ui', 'sans-serif'],
        // Section numbers are identifiers, so they're set as data, not prose.
        mono:    ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
        urdu:    ['"Noto Nastaliq Urdu"', 'serif'],
      },
      fontSize: {
        "2xs": ["0.6875rem", { lineHeight: "1rem", letterSpacing: "0.06em" }],
      },
      borderRadius: { card: "3px" },   // documents have crisp edges, not pills
      // A real elevation scale. Two shadows wasn't a system, it was two shadows —
      // so nothing could sit convincingly above anything else. Each level pairs a
      // tight contact shadow with a wide ambient one, which is what makes a
      // surface look lifted rather than outlined.
      boxShadow: {
        flat:  "0 1px 2px rgba(10,15,13,.04)",
        raise: "0 1px 2px rgba(10,15,13,.05), 0 6px 16px -8px rgba(10,15,13,.14)",
        lift:  "0 2px 5px rgba(10,15,13,.07), 0 16px 32px -12px rgba(10,15,13,.22)",
        float: "0 4px 10px rgba(10,15,13,.08), 0 32px 60px -20px rgba(10,15,13,.30)",
        // Tinted, so the mark reads as lit rather than dropped on a shadow.
        seal:  "0 8px 28px -10px rgba(11,83,65,.42)",
      },
      transitionTimingFunction: {
        // Fast out, settle in. Linear easing is what makes cheap UI feel cheap.
        crisp: "cubic-bezier(.2,.8,.2,1)",
      },
      keyframes: {
        rise:   { "0%": { opacity: 0, transform: "translateY(6px)" }, "100%": { opacity: 1, transform: "none" } },
        reveal: { "0%": { opacity: 0, transform: "translateY(18px)" }, "100%": { opacity: 1, transform: "none" } },
        caret:  { "0%,100%": { opacity: 1 }, "50%": { opacity: 0 } },
        // A slow sheen across the stamp frame. Deliberately ~7s and very low
        // contrast: it should be noticed on the second look, not the first.
        sheen:  { "0%": { transform: "translateX(-120%)" }, "100%": { transform: "translateX(220%)" } },
      },
      animation: {
        rise:   "rise .34s cubic-bezier(.2,.8,.2,1) both",
        reveal: "reveal .6s cubic-bezier(.2,.8,.2,1) both",
        caret:  "caret 1.1s steps(1) infinite",
        sheen:  "sheen 7s cubic-bezier(.4,0,.2,1) infinite",
      },
    },
  },
  plugins: [],
};
