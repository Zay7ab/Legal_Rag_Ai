import { useState, useEffect } from "react";
import { Icon } from "../components/Icon";
import { Button, Card, Input, Badge, Skeleton, Empty, ErrorNote, cx } from "../components/ui";
import { apiFetch } from "../lib/api";
import { useLang } from "../lib/i18n";

const PAGE_SIZE = 10;

export default function Search() {
  const [q, setQ]           = useState("");
  const [res, setRes]       = useState([]);
  const [landmarks, setLm]  = useState([]);
  const [stats, setStats]   = useState(null);
  const [load, setLoad]     = useState(false);
  const [more, setMore]     = useState(false);
  const [done, setDone]     = useState(false);
  const [open, setOpen]     = useState(null);
  const [err, setErr]       = useState("");
  const [page, setPage]     = useState(1);
  const [pages, setPages]   = useState(1);
  const [total, setTotal]   = useState(0);

  const { t, rtl } = useLang();

  useEffect(() => {
    apiFetch("/api/search/landmarks?limit=8").then(setLm).catch(() => {});
    apiFetch("/api/search/stats").then(setStats).catch(() => {});
  }, []);

  const run = async (target, append) => {
    append ? setMore(true) : setLoad(true);
    setErr("");
    try {
      const d = await apiFetch(`/api/search/?q=${encodeURIComponent(q)}&limit=${PAGE_SIZE}&page=${target}`);
      setRes((prev) => (append ? [...prev, ...(d.results || [])] : d.results || []));
      setPage(d.page || target);
      setPages(d.pages || 1);
      setTotal(d.total || 0);
    } catch (e) {
      setErr(e.message || "Search failed.");
      if (!append) setRes([]);
    } finally {
      append ? setMore(false) : setLoad(false);
    }
  };

  const search = (e) => {
    e?.preventDefault();
    if (!q.trim()) return;
    setDone(true); setOpen(null); setPage(1);
    run(1, false);
  };

  const reset = () => {
    setDone(false); setRes([]); setQ(""); setErr("");
    setPage(1); setPages(1); setTotal(0); setOpen(null);
  };

  const list = done ? res : landmarks;

  return (
    <div className="mx-auto max-w-3xl animate-rise px-4 py-10 sm:px-6">
      <p className="eyebrow mb-3">{t("page.search", "Case law")}</p>
      <h1 className="font-display text-[30px] font-normal leading-tight">
        {t("search.title", "Search Pakistani judgments")}
      </h1>
      <p className="mt-2 max-w-lg text-[14px] leading-relaxed text-ink-2 dark:text-paper-2/80">
        {t("search.subtitle", "Describe what happened rather than hunting for a citation. Supreme Court and High Court decisions.")}
      </p>

      <form onSubmit={search} className="mt-6 flex gap-2">
        <div className="relative flex-1">
          <Icon n="srch" s={15} className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-ink-3" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("search.placeholder", "e.g. bail in narcotics case, dishonoured cheque…")}
            aria-label={t("search.aria_label", "Search judgments")}
            className="h-11 ps-9"
          />
        </div>
        <Button type="submit" size="lg" loading={load}>{t("a.search", "Search")}</Button>
        {done && <Button type="button" variant="quiet" size="lg" onClick={reset}>{t("a.clear", "Clear")}</Button>}
      </form>

      {stats && !done && (
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[12px] text-ink-3">
          {stats.total_cases > 0 && <span><strong className="text-ink dark:text-paper">{stats.total_cases}</strong> {t("search.indexed_cases", "judgments indexed")}</span>}
          {Object.keys(stats.courts_breakdown || {}).length > 0 && (
            <span><strong className="text-ink dark:text-paper">{Object.keys(stats.courts_breakdown).length}</strong> {t("search.courts", "courts")}</span>
          )}
          {stats.landmark_cases > 0 && <span><strong className="text-ink dark:text-paper">{stats.landmark_cases}</strong> {t("search.landmark", "landmark")}</span>}
        </div>
      )}

      <div className="mt-8">
        <p className="eyebrow mb-3">
          {done
            ? `${total} ${total === 1 ? t("search.result", "result") : t("search.results", "results")}${res.length < total ? ` · ${t("search.showing", "showing")} ${res.length}` : ""}`
            : t("search.landmark_title", "Landmark judgments")}
        </p>

        {err && <ErrorNote className="mb-3">{err}</ErrorNote>}

        {load && (
          <div className="space-y-2">
            {[0, 1, 2, 3].map((i) => (
              <Card key={i} className="p-4">
                <Skeleton className="mb-2 h-3.5 w-2/3" />
                <Skeleton className="h-2.5 w-1/3" />
              </Card>
            ))}
          </div>
        )}

        {!load && (
          <div className="space-y-2">
            {list.map((c, i) => (
              <Card key={i} className="overflow-hidden transition-colors hover:border-ink-3/40">
                <button
                  onClick={() => setOpen(open === i ? null : i)}
                  aria-expanded={open === i}
                  className="flex w-full items-start gap-3 p-4 text-start"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-display text-[15px] font-medium leading-snug">{c.title || c.case_title}</p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-ink-3">
                      {c.court && <span className="font-mono uppercase tracking-wider">{c.court}</span>}
                      {c.year && <span>{c.year}</span>}
                      {c.citation && <span className="font-mono">{c.citation}</span>}
                    </div>
                  </div>
                  {c.summary && (
                    <Icon n="dn" s={14} className={cx("mt-1 shrink-0 text-ink-3 transition-transform", open === i && "rotate-180")} />
                  )}
                </button>
                {open === i && c.summary && (
                  <div className="border-t border-paper-3 bg-paper-2/50 px-4 py-3 dark:border-well-3 dark:bg-well-3/40">
                    <p className="text-[13px] leading-relaxed text-ink-2 dark:text-paper-2/85">{c.summary}</p>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}

        {!load && done && !res.length && !err && (
          <Empty title={`${t("search.nothing_matched", "Nothing matched")} “${q}”`}>
            {t("search.empty_desc", "Try broader words — “bail” rather than a full citation, or describe the situation instead of naming the case.")}
          </Empty>
        )}

        {!load && done && page < pages && (
          <div className="mt-4 text-center">
            <Button variant="outline" onClick={() => run(page + 1, true)} loading={more}>
              {t("a.loadmore", "Load more")} ({Math.min(PAGE_SIZE, total - res.length)})
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
