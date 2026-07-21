import { forwardRef } from "react";

const cx = (...c) => c.filter(Boolean).join(" ");

/* ── Button ────────────────────────────────────────────────────────────────
   Labels say what happens ("Ask", "Download"), never "Submit". */
const VARIANTS = {
  primary: "bg-seal text-white shadow-seal hover:bg-seal-hover hover:shadow-float active:translate-y-px disabled:hover:bg-seal disabled:shadow-none",
  quiet:   "bg-transparent text-ink-2 hover:bg-paper-2 dark:text-paper-2 dark:hover:bg-well-3",
  outline: "border border-paper-3 bg-white/60 text-ink shadow-flat hover:border-seal hover:shadow-raise active:translate-y-px dark:border-well-3 dark:bg-well-2/60 dark:text-paper dark:hover:border-seal-bright",
  danger:  "bg-tape text-white hover:brightness-95",
};
const SIZES = {
  sm: "h-8 px-3 text-[12.5px]",
  md: "h-10 px-4 text-[13.5px]",
  lg: "h-12 px-6 text-[14.5px]",
};

export const Button = forwardRef(function Button(
  { variant = "primary", size = "md", className, loading, children, ...p }, ref
) {
  return (
    <button
      ref={ref}
      disabled={loading || p.disabled}
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-card font-medium",
        "transition-all duration-200 ease-crisp disabled:opacity-45 disabled:cursor-not-allowed",
        VARIANTS[variant], SIZES[size], className
      )}
      {...p}
    >
      {loading && <Spinner />}
      {children}
    </button>
  );
});

export const Spinner = ({ className }) => (
  <span
    role="status"
    aria-label="Loading"
    className={cx("inline-block h-3.5 w-3.5 rounded-full border-2 border-current border-t-transparent animate-spin", className)}
  />
);

/* ── Card ─────────────────────────────────────────────────────────────────
   `stamp` opts into the signature frame. Reserved for instruments of record
   (AI answers, generated documents) — not applied to every surface, or it
   stops meaning anything. */
export const Card = ({ stamp, glass, className, children, ...p }) => {
  const cardClass = stamp
    ? (glass ? "stamp bg-white/50 dark:bg-well-2/50 backdrop-blur-md" : "stamp")
    : (glass ? "glass" : "rounded-card border border-paper-3 bg-white shadow-raise dark:border-well-3 dark:bg-well-2");
  return (
    <div className={cx(cardClass, className)} {...p}>
      {children}
    </div>
  );
};

/* ── Input / Textarea / Select ─────────────────────────────────────────── */
const FIELD =
  "w-full bg-white dark:bg-well-2 border border-paper-3 dark:border-well-3 rounded-card " +
  "px-3 text-[13.5px] text-ink dark:text-paper placeholder:text-ink-3/60 " +
  "transition-colors focus:border-seal dark:focus:border-seal-bright";

export const Input = forwardRef(function Input({ className, ...p }, ref) {
  return <input ref={ref} className={cx(FIELD, "h-10", className)} {...p} />;
});

export const Textarea = forwardRef(function Textarea({ className, ...p }, ref) {
  return <textarea ref={ref} className={cx(FIELD, "py-2.5 resize-none scroll-thin", className)} {...p} />;
});

export const Select = ({ className, children, ...p }) => (
  <select className={cx(FIELD, "h-10 cursor-pointer", className)} {...p}>{children}</select>
);

export const Field = ({ label, hint, required, children }) => (
  <label className="block">
    <span className="mb-1.5 flex items-baseline gap-1.5">
      <span className="text-[12.5px] font-medium text-ink-2 dark:text-paper-2">{label}</span>
      {required && <span className="text-tape text-[11px]" aria-hidden>required</span>}
    </span>
    {children}
    {hint && <span className="mt-1 block text-[11.5px] text-ink-3">{hint}</span>}
  </label>
);

/* ── Badge ────────────────────────────────────────────────────────────── */
const TONES = {
  seal:    "bg-seal-tint text-seal dark:bg-seal/20 dark:text-seal-bright",
  neutral: "bg-paper-2 text-ink-3 dark:bg-well-3 dark:text-paper-3/70",
  tape:    "bg-tape-tint text-tape dark:bg-tape/20 dark:text-tape-tint",
};
export const Badge = ({ tone = "neutral", className, children }) => (
  <span className={cx("inline-flex items-center gap-1 rounded-[2px] px-1.5 py-0.5 font-mono text-2xs uppercase tracking-[.1em]", TONES[tone], className)}>
    {children}
  </span>
);

/* ── Section citation ─────────────────────────────────────────────────────
   The atomic unit of this domain is the section number: §302, §420. Setting
   it in mono states that it's an identifier, not prose — and it's the one
   thing a user must be able to carry to a lawyer. */
export const Cite = ({ children, className }) => (
  <span className={cx("font-mono text-[12px] font-medium text-seal dark:text-seal-bright", className)}>
    §{children}
  </span>
);

/* ── Skeleton ─────────────────────────────────────────────────────────── */
export const Skeleton = ({ className }) => (
  <div className={cx("animate-pulse rounded-[2px] bg-paper-2 dark:bg-well-3", className)} />
);

/* ── Empty / Error states ─────────────────────────────────────────────────
   An empty screen is an invitation to act; an error says what happened and
   what to do. Neither apologises or gets vague. */
export const Empty = ({ title, children, action }) => (
  <div className="px-6 py-16 text-center">
    <p className="font-display text-[17px] text-ink dark:text-paper">{title}</p>
    {children && <p className="mx-auto mt-1.5 max-w-sm text-[13px] leading-relaxed text-ink-3">{children}</p>}
    {action && <div className="mt-5">{action}</div>}
  </div>
);

export const ErrorNote = ({ children, className }) => (
  <p role="alert" className={cx("flex items-start gap-2 rounded-card border border-tape/30 bg-tape-tint/50 px-3 py-2 text-[12.5px] text-tape dark:bg-tape/10", className)}>
    {children}
  </p>
);

export { cx };
