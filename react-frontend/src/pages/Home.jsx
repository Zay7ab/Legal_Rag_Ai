import { useState, useEffect } from "react";
import { Icon } from "../components/Icon";
import { Button, Card, Badge, cx } from "../components/ui";
import { SAMPLE_QUESTIONS } from "../lib/constants";
import { useLang } from "../lib/i18n";
import Logo from "../components/Logo";
import CourtBuilding from "../components/CourtBuilding";
import CircuitField from "../components/CircuitField";
import { apiFetch } from "../lib/api";

const PILLARS = [
  { icon: "msg",   to: "chat",   title: "Ask the law",  body: "Describe your situation in English or Urdu. Get an answer that names the section it came from." },
  { icon: "file",  to: "docs",   title: "Draft it",     body: "Affidavits, notices, agreements — filled in and ready to take to a stamp vendor." },
  { icon: "srch",  to: "search", title: "Read the cases", body: "Search Supreme Court and High Court judgments by what happened, not by citation." },
];

export default function Home({ go }) {
  const [q, setQ] = useState("");
  const [corpus, setCorpus] = useState(null);

  // Real numbers, fetched live. If the backend is down this section simply
  // doesn't render — better absent than fabricated.
  useEffect(() => { apiFetch("/api/corpus/").then(setCorpus).catch(() => {}); }, []);
  const { t, rtl } = useLang();

  const ask = (text) => {
    const t = (text ?? q).trim();
    if (!t) return go("chat");
    // Hand the question to Chat, which reads it on mount and sends it.
    try { sessionStorage.setItem("pending_question", t); } catch { /* private mode */ }
    go("chat");
  };

  return (
    <div className="animate-rise">
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        {/* User's uploaded background image with low opacity to preserve theme (Fix for cache) */}
        <div 
          className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat opacity-[0.15] dark:opacity-[0.25] mix-blend-multiply dark:mix-blend-overlay"
          style={{ backgroundImage: 'url("/hero_section.avif")' }}
        />
        
        <CircuitField className="absolute inset-x-0 top-0 h-[620px] w-full text-seal/80 dark:text-seal-bright/80" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-paper/80 to-paper dark:via-well/80 dark:to-well" />

        <div className="relative mx-auto grid max-w-6xl gap-12 px-4 pb-16 pt-16 sm:px-6 sm:pt-24 lg:grid-cols-[1.05fr_.95fr] lg:items-center lg:gap-14">
          <div className="animate-surface">
            <p className="eyebrow mb-4">{t("home.eyebrow", "Pakistani law · plain language")}</p>

            <h1 className="display font-display text-[clamp(2.1rem,6.5vw,4.2rem)] font-normal leading-[1.25] sm:leading-[1.3]">
              {t("home.h1a", "You have a legal problem.")}{" "}
              <span className="relative inline-block italic text-seal dark:text-seal-bright">
                {t("home.h1b", "Start by asking.")}
                <svg className="absolute -bottom-1 start-0 h-2.5 w-full text-seal/25 dark:text-seal-bright/25" viewBox="0 0 300 10" preserveAspectRatio="none" aria-hidden>
                  <path d="M2 7 Q75 2 150 6 T298 4" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
                </svg>
              </span>
            </h1>

            <p className="mt-7 max-w-xl text-[16.5px] leading-[1.7] text-ink-2 dark:text-paper-2/80">
              {t("home.sub", "Legal Rag Ai reads Pakistani statutes and answers in the language you ask in. Every answer names the law it came from — or tells you when it found none.")}
            </p>

            {/* The ask box: the product's front door. */}
            <form
              onSubmit={(e) => { e.preventDefault(); ask(); }}
              className="mt-8"
            >
              <div className="stamp flex items-center gap-2 p-2 ps-4 shadow-raise transition-all duration-300 focus-within:-translate-y-0.5 focus-within:shadow-deep">
                <Icon n="msg" s={17} className="shrink-0 text-seal dark:text-seal-bright" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder={t("home.ph", "What happened? Ask in English or Urdu…")}
                  aria-label="Your legal question"
                  dir={rtl ? "rtl" : "ltr"}
                  className={cx(
                    "h-12 flex-1 bg-transparent text-[15.5px] text-ink outline-none placeholder:text-ink-3/55 dark:text-paper",
                    rtl && "font-urdu"
                  )}
                />
                <Button type="submit" className="shrink-0">
                  {t("a.ask", "Ask")} <Icon n="arr" s={14} data-flip={rtl ? "" : undefined} />
                </Button>
              </div>
            </form>

            <div className="mt-5">
              <p className="eyebrow mb-2.5">{t("home.samples", "Or start from a real one")}</p>
              <div className="flex flex-wrap gap-1.5">
                {SAMPLE_QUESTIONS.map((s, idx) => (
                  <button
                    key={idx}
                    onClick={() => ask(t(`sample.q${idx + 1}`, s.q))}
                    className="group flex items-center gap-2 rounded-card border border-paper-3 bg-white px-2.5 py-1.5 text-start text-[12.5px] text-ink-2 transition-colors hover:border-seal hover:text-ink dark:border-well-3 dark:bg-well-2 dark:text-paper-2 dark:hover:border-seal-bright"
                  >
                    <span className="font-mono text-2xs uppercase tracking-wider text-ink-3">{t(`sample.tag${idx + 1}`, s.tag)}</span>
                    <span className="max-w-[15rem] truncate">{t(`sample.q${idx + 1}`, s.q)}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Specimen answer Card */}
          <div className="hidden lg:block relative rounded-card overflow-hidden group shadow-float border border-paper-3 bg-gradient-to-br from-paper-2 via-white to-seal-tint/40 dark:border-well-3 dark:from-well-2 dark:via-well dark:to-seal/20">
            <div className="relative p-6 min-h-[360px] flex flex-col justify-end">
              <div className="backdrop-blur-md bg-white/75 border border-paper-3/50 p-5 rounded-card shadow-lift dark:bg-well-2/75 dark:border-white/10">
                <div className="mb-3.5 flex justify-end">
                  <span className="max-w-[85%] rounded-card bg-seal px-2.5 py-1.5 text-[12px] leading-relaxed text-white shadow-seal font-medium">
                    {t("home.specimen_q", "Bhai ne larai mein kisi ko maar diya. 302 lagta hai?")}
                  </span>
                </div>

                <p className="text-[13px] leading-[1.7] text-ink-2 dark:text-paper-2">
                  {t("home.specimen_a1", "Section 302 PPC applies to ")}
                  <strong className="font-semibold text-ink dark:text-white">{t("home.specimen_a2", "qatl-i-amd")}</strong>
                  {t("home.specimen_a3", " — causing death with the intention of causing death. Whether it applies here turns on intention, which is decided on the facts.")}
                </p>
                <p className="mt-2 text-[13px] leading-[1.7] text-ink-2 dark:text-paper-2">
                  {t("home.specimen_a4", "If death followed a sudden fight without premeditation, the charge is more likely ")}
                  <span className="font-mono text-[11.5px] font-semibold text-seal dark:text-seal-bright">§304</span>
                  {t("home.specimen_a5", " (qatl shibh-i-amd), which carries a lesser sentence.")}
                </p>

                <div className="mt-3.5 border-t border-paper-3 dark:border-white/10 pt-2.5">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="eyebrow text-ink-3 dark:text-paper-3 text-[10px] me-0.5">{t("g.grounded", "Grounded in")}</span>
                    <span className="inline-flex items-center gap-1 rounded-[2px] bg-seal-tint/60 border border-seal-tint px-1.5 py-0.5 font-mono text-2xs uppercase tracking-[.1em] text-seal font-semibold dark:bg-seal-bright/20 dark:border-seal-bright/35 dark:text-seal-bright">
                      {t("PPC", "Pakistan Penal Code")}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── What it does ─────────────────────────────────────────────────── */}
      <section className="reveal border-t hairline">
        <div className="mx-auto grid max-w-5xl gap-px bg-paper-3 dark:bg-well-3 sm:grid-cols-3">
          {PILLARS.map((p) => (
            <button
              key={p.to}
              onClick={() => go(p.to)}
              className="group bg-paper p-6 text-start transition-colors hover:bg-white dark:bg-well dark:hover:bg-well-2 sm:p-8"
            >
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-card bg-seal-tint transition-transform duration-200 ease-crisp group-hover:scale-105 dark:bg-seal/15">
                <Icon n={p.icon} s={19} className="text-seal dark:text-seal-bright" />
              </span>
              <p className="mt-4 font-display text-[20px] font-medium">
                {t("home.pillar." + p.to + ".title", p.title)}
              </p>
              <p className="mt-1.5 text-[13px] leading-relaxed text-ink-3">
                {t("home.pillar." + p.to + ".body", p.body)}
              </p>
              <span className="mt-3.5 inline-flex items-center gap-1 text-[12.5px] font-medium text-seal opacity-0 transition-opacity group-hover:opacity-100 dark:text-seal-bright">
                {t("a.open", "Open")} <Icon n="arr" s={12} />
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* ── How grounding works ────────────────────────────────────────────── */}
      <section className="reveal border-t hairline px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-3xl">
          <p className="eyebrow mb-3">{t("home.read_answer_title", "How to read an answer")}</p>
          <h2 className="display font-display text-[clamp(1.7rem,3.6vw,2.4rem)] font-normal leading-[1.05]">
            {t("home.shows_working_title", "Every answer shows its working.")}
          </h2>
          <p className="mt-3 max-w-xl text-[14px] leading-relaxed text-ink-2 dark:text-paper-2/80">
            {t("home.shows_working_desc", "Legal Rag Ai searches the statute library before it answers. What it found — or didn't — is printed under every response.")}
          </p>

          <div className="mt-7 grid gap-4 sm:grid-cols-2">
            <Card className="p-5">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="eyebrow me-0.5">{t("g.grounded", "Grounded in")}</span>
                <Badge tone="seal"><Icon n="book" s={10} />{t("PPC", "Pakistan Penal Code")}</Badge>
              </div>
              <p className="mt-3 text-[13px] leading-relaxed text-ink-2 dark:text-paper-2/80">
                {t("home.grounded_desc", "The answer quotes real statute text. You can take the section number to a lawyer and they will know exactly what you mean.")}
              </p>
            </Card>

            <Card className="p-5">
              <div className="flex items-start gap-2">
                <Icon n="warn" s={13} className="mt-px shrink-0 text-tape" />
                <p className="text-[11.5px] leading-relaxed text-ink-3">
                  <span className="font-medium text-tape">{t("home.no_match_title", "No statute matched.")}</span>{" "}
                  {t("home.no_match_subtitle", "Nothing was answered from the law library, so no section is cited.")}
                </p>
              </div>
              <p className="mt-3 text-[13px] leading-relaxed text-ink-2 dark:text-paper-2/80">
                {t("home.no_match_desc", "Legal Rag Ai won't guess at a section number — a wrong citation is worse than none. It tells you it found nothing and stops. Being told is the point.")}
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* ── What's actually in the library ───────────────────────────────── */}
      <section className="reveal relative overflow-hidden border-t hairline">
        <CourtBuilding className="pointer-events-none absolute -bottom-6 start-1/2 w-[820px] -translate-x-1/2 text-seal/[0.07] dark:text-seal-bright/[0.06]" />

        <div className="relative mx-auto max-w-5xl px-4 py-16 sm:px-6">
          <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr] lg:items-start">
            <div>
              <p className="eyebrow mb-3">{t("home.library_title", "The library")}</p>
              <h2 className="display font-display text-[clamp(1.7rem,3.6vw,2.4rem)] font-normal leading-[1.05]">
                {t("home.statute_counted_title", "Every statute, counted.")}
              </h2>
              <p className="mt-3 text-[14px] leading-relaxed text-ink-2 dark:text-paper-2/80">
                {t("home.library_desc", "Fetched from the official Pakistan Code. Not summarised, not paraphrased — the enacted text. Where a statute is incomplete, it says so.")}
              </p>

              {corpus && (
                <>
                  <div className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-card border border-paper-3 bg-paper-3 dark:border-well-3 dark:bg-well-3 sm:grid-cols-4">
                    {[
                      [corpus.total_laws, t("home.statutes_unit", "statutes")],
                      [corpus.total_sections.toLocaleString(), t("home.sections_unit", "sections & articles")],
                      [corpus.total_kb.toLocaleString() + " KB", t("home.text_unit", "of statute text")],
                      [corpus.complete_laws + "/" + corpus.total_laws, t("home.complete_unit", "complete")],
                    ].map(([v, label]) => (
                      <div key={label} className="lift bg-paper p-4 dark:bg-well">
                        <p className="font-display text-[28px] font-medium leading-none tracking-tight">{v}</p>
                        <p className="mt-1 text-[11.5px] leading-snug text-ink-3">{label}</p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-3 overflow-hidden rounded-card border border-paper-3 dark:border-well-3">
                    <table className="w-full text-[13px]">
                      <tbody>
                        {corpus.laws.map((l) => (
                          <tr key={l.id} className="border-b border-paper-2 last:border-0 dark:border-well-3/60">
                            <td className="bg-white px-4 py-2.5 dark:bg-well-2">
                              <span className="font-medium">{l.name}</span>
                              <span className="ms-1.5 font-mono text-[11px] text-ink-3">{l.year}</span>
                            </td>
                            <td className="bg-white px-4 py-2.5 text-end font-mono text-[12px] text-ink-3 dark:bg-well-2">
                              {l.sections} {t(l.unit, l.unit)}
                            </td>
                            <td className="w-24 bg-white px-4 py-2.5 text-end dark:bg-well-2">
                              <Badge tone={l.complete ? "seal" : "tape"}>{l.coverage}</Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <Button variant="outline" size="sm" onClick={() => go("statutes")}>
                      <Icon n="book" s={13} /> {t("home.read_any", "Read any of them")}
                    </Button>
                    <p className="text-[11.5px] leading-relaxed text-ink-3">
                      {t("home.library_live_note", "Counted from disk, live, at /api/corpus/ — check it yourself. A question outside this library gets told so, not guessed at.")}
                    </p>
                  </div>
                </>
              )}
            </div>

            <div className="hidden lg:block relative rounded-card overflow-hidden border border-paper-3 dark:border-well-3 shadow-float group">
              <img 
                src="/scales.jpg" 
                alt="Scales of Justice" 
                className="w-full h-auto object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-ink/75 via-transparent to-transparent dark:from-well/75" />
              <div className="absolute bottom-4 start-4 end-4 p-4 backdrop-blur-sm bg-white/75 dark:bg-well-2/75 border border-paper-3 dark:border-well-3 rounded-card text-[12px] text-ink-2 dark:text-paper-2 font-medium">
                🏛️ **Supreme Court & High Courts**: Verified legal corpus and official laws.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="border-t border-paper-3 px-4 py-8 dark:border-well-3 sm:px-6">
        <div className="mx-auto flex max-w-5xl flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2">
            <Logo size={20} />
            <span className="text-[12.5px] text-ink-3">
              {t("footer.note", "Legal Rag Ai — legal information, not legal advice.")}
            </span>
          </div>
          <button onClick={() => go("faq")} className="text-[12.5px] text-ink-3 underline underline-offset-2 hover:text-ink dark:hover:text-paper">
            {t("home.faq_btn", "Questions about how this works")}
          </button>
        </div>
      </footer>
    </div>
  );
}
