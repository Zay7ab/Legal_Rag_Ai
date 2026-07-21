import { useEffect, useState } from "react";

/* ── The circuit field ────────────────────────────────────────────────────────
   Taken from the logo, which already puts the scales on a circuit board. That
   motif was doing nothing but sitting in a 28px mark; here it becomes the
   page's atmosphere.

   Why this and not a gradient mesh / particle field / animated blobs — the
   things "futuristic" usually means on Dribbble:

     - it is derived from THIS brand, not from a trend. In six months the
       gradient look will date; a circuit board that came out of your own logo
       won't, because it isn't borrowed.
     - it says something true. The claim is that Pakistani law is being
       *computed* — retrieved, matched, cited. A pulse travelling a trace toward
       the content is that claim, drawn.
     - it is ~3KB of SVG with no images and no library.

   Restraint is deliberate: traces sit at 4-8% opacity and pulses take 4.5s.
   The reader is often frightened and here to find out whether they're going to
   prison. The page can be beautiful without being busy.
*/

const TRACES = [
  "M0 120 H180 L220 80 H420",
  "M0 260 H120 L170 310 H380",
  "M0 400 H240 L280 360 H520",
  "M1440 120 H1260 L1220 80 H1020",
  "M1440 260 H1320 L1270 310 H1060",
  "M1440 400 H1200 L1160 360 H920",
  "M0 540 H300 L340 500 H600",
  "M1440 540 H1140 L1100 500 H840",
];

const NODES = [
  [180, 120], [220, 80], [120, 260], [170, 310], [240, 400], [280, 360],
  [1260, 120], [1220, 80], [1320, 260], [1270, 310], [1200, 400], [1160, 360],
  [300, 540], [340, 500], [1140, 540], [1100, 500],
];

export const CircuitField = ({ className = "", animate = true }) => {
  // Respect the OS setting. Someone who has asked the system to stop moving
  // things has asked us too.
  const [motion, setMotion] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: no-preference)");
    setMotion(mq.matches);
    const on = () => setMotion(mq.matches);
    mq.addEventListener?.("change", on);
    return () => mq.removeEventListener?.("change", on);
  }, []);

  const live = animate && motion;

  return (
    <svg
      viewBox="0 0 1440 620"
      preserveAspectRatio="xMidYMid slice"
      className={`pointer-events-none select-none ${className}`}
      aria-hidden="true"
      focusable="false"
    >
      {/* static board */}
      <g stroke="currentColor" fill="none" strokeWidth="1.25" strokeLinecap="round"
         strokeLinejoin="round" className="opacity-[.07] dark:opacity-[.10]">
        {TRACES.map((d, i) => <path key={i} d={d} />)}
      </g>

      <g fill="currentColor" className="opacity-[.10] dark:opacity-[.14]">
        {NODES.map(([cx, cy], i) => (
          <circle key={i} cx={cx} cy={cy} r="3"
                  style={live ? { animation: `node 3s ease-in-out ${(i % 6) * 0.4}s infinite` } : undefined} />
        ))}
      </g>

      {/* pulses travelling toward the centre, where the content is */}
      {live && (
        <g stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round"
           strokeDasharray="26 214" className="opacity-60">
          {TRACES.map((d, i) => (
            <path key={i} d={d} style={{ animation: `trace 4.5s cubic-bezier(.4,0,.2,1) ${i * 0.85}s infinite` }} />
          ))}
        </g>
      )}
    </svg>
  );
};

export default CircuitField;
