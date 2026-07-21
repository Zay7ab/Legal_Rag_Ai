import { useState, useEffect, useCallback } from "react";
import { Icon } from "../components/Icon";
import SectionSheet from "../components/SectionSheet";
import CourtBuilding from "../components/CourtBuilding";
import { Button, Card, Input, Badge, Skeleton, Empty, ErrorNote, cx } from "../components/ui";
import { apiFetch } from "../lib/api";
import { useLang } from "../lib/i18n";

export default function Statutes() {
  const [library, setLibrary] = useState(null);
  const [sel, setSel] = useState(null);
  const [data, setData] = useState(null);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [open, setOpen] = useState(null);

  const { t, rtl } = useLang();

  useEffect(() => {
    apiFetch("/api/statutes/")
      .then(setLibrary)
      .catch((e) => setErr(e.message || "Couldn't load the library."));
  }, []);

  const load = useCallback((id, query) => {
    setLoading(true); setErr("");
    apiFetch(`/api/statutes/${id}${query ? `?q=${encodeURIComponent(query)}` : ""}`)
      .then(setData)
      .catch((e) => { setErr(e.message); setData(null); })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!sel) return;
    const t = setTimeout(() => load(sel, q), q ? 300 : 0);
    return () => clearTimeout(t);
  }, [sel, q, load]);

  const pick = (id) => { setSel(id); setQ(""); setData(null); };

  return (
    <div className="relative overflow-hidden">
      <CourtBuilding className="pointer-events-none absolute -top-10 start-1/2 w-[760px] -translate-x-1/2 text-seal/[0.05] dark:text-seal-bright/[0.05]" />

      <div className="relative mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <p className="eyebrow mb-3">{t("home.library_title", "The library")}</p>
        <h1 className="font-display text-[30px] font-normal leading-tight">
          {t("statutes.title", "Read the law itself")}
        </h1>
        <p className="mt-2 max-w-xl text-[14px] leading-relaxed text-ink-2 dark:text-paper-2/80">
          {t("statutes.subtitle", "The enacted text of Pakistan's statutes — not summarised, not paraphrased. Free, searchable, and readable on a phone. Fetched from the official Pakistan Code.")}
        </p>

        {err && !library && <ErrorNote className="mt-5">{err}</ErrorNote>}

        {/* ── Pick a statute ─────────────────────────────────────────────── */}
        {!library && !err && (
          <div className="mt-8 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {[0,1,2,3,4,5].map(i => <Skeleton key={i} className="h-[4.5rem]" />)}
          </div>
        )}

        {library && (
          <div className="mt-8 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {library.map((l) => (
              <button
                key={l.id}
                onClick={() => pick(l.id)}
                aria-pressed={sel === l.id}
                className={cx(
                  "rounded-card border p-4 text-start transition-colors",
                  sel === l.id
                    ? "border-seal bg-seal-tint dark:border-seal-bright dark:bg-seal/15"
                    : "border-paper-3 bg-white hover:border-ink-3/40 dark:border-well-3 dark:bg-well-2"
                )}
              >
                <p className="text-[13.5px] font-medium leading-snug">{l.name}</p>
                <p className="mt-1 flex items-center gap-2 text-[11.5px] text-ink-3">
                  <span className="font-mono">{l.year}</span>
                  <span>·</span>
                  <span>{l.count} {t(l.unit, l.unit)}</span>
                </p>
              </button>
            ))}
          </div>
        )}

        {/* ── Browse one ─────────────────────────────────────────────────── */}
        {sel && (
          <div className="mt-8 animate-rise">
            <div className="relative">
              <Icon n="srch" s={15} className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-ink-3" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={data ? `${t("a.search", "Search")} ${data.short} — ${t("statutes.search_placeholder", "a word, or a section number")}` : `${t("a.search", "Search")}…`}
                aria-label={t("statutes.search_aria", "Search this statute")}
                className="h-11 ps-9"
              />
            </div>

            {data && (
              <p className="mt-3 text-[12px] text-ink-3">
                {q
                  ? <>{data.matched} {t("statutes.of", "of")} {data.total} {t(data.unit, data.unit)} {t("statutes.match", "match")} “{q}”</>
                  : <>{data.total} {t(data.unit, data.unit)} · {data.name} {data.year}</>}
              </p>
            )}

            {loading && (
              <div className="mt-3 space-y-1.5">
                {[0,1,2,3,4].map(i => <Skeleton key={i} className="h-14" />)}
              </div>
            )}

            {!loading && data && (
              <div className="mt-3 space-y-1.5">
                {data.sections.map((s) => (
                  <Card key={s.number} className="overflow-hidden transition-colors hover:border-ink-3/40">
                    <button
                      onClick={() => setOpen(`${s.number} ${data.short}`)}
                      className="flex w-full items-start gap-3 p-4 text-start"
                    >
                      <span className="mt-0.5 shrink-0 font-mono text-[12px] font-medium text-seal dark:text-seal-bright">
                        {data.unit === "articles" ? t("Art", "Art") : "§"}{s.number}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[13.5px] font-medium leading-snug">{s.title}</span>
                        <span className="mt-1 block line-clamp-2 text-[12px] leading-relaxed text-ink-3">
                          {s.preview}
                        </span>
                      </span>
                      <Icon n="arr" s={13} className="mt-1 shrink-0 text-ink-3" data-flip={rtl ? "" : undefined} />
                    </button>
                  </Card>
                ))}
              </div>
            )}

            {!loading && data && !data.sections.length && (
              <Empty title={`${t("statutes.nothing_matched", "Nothing matched")} in ${data.short} “${q}”`}>
                {t("statutes.empty_desc", "Try a single word, or the section number on its own.")}
              </Empty>
            )}
          </div>
        )}

        {!sel && library && (
          <Empty title={t("statutes.pick_title", "Pick a statute to read it")}>
            {t("statutes.pick_desc", "Every section, in the words Parliament enacted. Search by keyword or jump to a section number.")}
          </Empty>
        )}
      </div>

      {open && <SectionSheet cite={open} onClose={() => setOpen(null)} />}
    </div>
  );
}
