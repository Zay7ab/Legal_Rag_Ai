import { useState, useEffect, useCallback } from "react";
import { Icon } from "../components/Icon";
import { Button, Card, Input, Badge, Skeleton, Empty, ErrorNote, cx } from "../components/ui";
import { BASE } from "../lib/api";
import { useLang } from "../lib/i18n";

export default function News() {
  const [items, setItems] = useState([]);
  const [cats, setCats]   = useState([]);
  const [sources, setSources] = useState([]);
  const [cat, setCat] = useState("all");
  const [src, setSrc] = useState("all");
  const [q, setQ]     = useState("");
  const [load, setLoad] = useState(true);
  const [err, setErr]   = useState("");
  const [cachedAt, setCachedAt] = useState(null);

  const { t, rtl } = useLang();

  const fetchNews = useCallback(async (refresh = false) => {
    setLoad(true); setErr("");
    try {
      let url = `${BASE}/api/news/?limit=60`;
      if (cat !== "all") url += `&category=${encodeURIComponent(cat)}`;
      if (src !== "all") url += `&source=${encodeURIComponent(src)}`;
      if (q.trim())      url += `&q=${encodeURIComponent(q.trim())}`;
      if (refresh)       url += `&refresh=true`;
      const r = await fetch(url);
      if (!r.ok) throw new Error(`Couldn't load news (HTTP ${r.status})`);
      const d = await r.json();
      setItems(Array.isArray(d.items) ? d.items : []);
      if (Array.isArray(d.categories)) setCats(d.categories.filter((c) => typeof c === "string"));
      if (Array.isArray(d.sources)) setSources(d.sources.filter((x) => x && typeof x === "object" && x.id));
      setCachedAt(d.cached_at || null);
    } catch (e) { setErr(e.message); setItems([]); }
    finally { setLoad(false); }
  }, [cat, src, q]);

  useEffect(() => {
    const t_ref = setTimeout(() => fetchNews(false), q ? 350 : 0);
    return () => clearTimeout(t_ref);
  }, [fetchNews, q]);

  const when = (iso) => {
    if (!iso) return null;
    const mins = Math.floor((Date.now() - new Date(iso)) / 60000);
    if (mins < 1) return t("news.just_now", "just now");
    if (mins < 60) return `${mins}${t("news.m_ago", "m ago")}`;
    if (mins < 1440) return `${Math.floor(mins / 60)}${t("news.h_ago", "h ago")}`;
    return `${Math.floor(mins / 1440)}${t("news.d_ago", "d ago")}`;
  };

  return (
    <div className="mx-auto max-w-4xl animate-rise px-4 py-10 sm:px-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="eyebrow mb-3">{t("page.news", "Legal news")}</p>
          <h1 className="font-display text-[30px] font-normal leading-tight">{t("news.title", "What's changing")}</h1>
          <p className="mt-2 max-w-lg text-[14px] leading-relaxed text-ink-2 dark:text-paper-2/80">
            {t("news.subtitle", "Judgments, legislation and legal affairs from Pakistani outlets.")}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => fetchNews(true)} disabled={load} className="shrink-0">
          <Icon n="rf" s={13} /> {t("a.refresh", "Refresh")}
        </Button>
      </div>

      <div className="mt-6 space-y-2.5">
        <div className="relative">
          <Icon n="srch" s={15} className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-ink-3" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("news.search_placeholder", "Search headlines…")}
            aria-label={t("news.search_placeholder", "Search news")}
            className="h-11 ps-9"
          />
        </div>

        {cats.length > 0 && (
          <div className="flex flex-wrap gap-1" role="group" aria-label={t("rental", "Category")}>
            {["all", ...cats].map((c) => (
              <button
                key={c}
                onClick={() => setCat(c)}
                aria-pressed={cat === c}
                className={cx(
                  "rounded-card px-2.5 py-1 text-[12px] capitalize transition-colors",
                  cat === c ? "bg-seal text-white" : "text-ink-3 hover:bg-paper-2 hover:text-ink dark:hover:bg-well-3"
                )}
              >
                {c === "all" ? t("finder.all_cities", "all") : t(c, c)}
              </button>
            ))}
          </div>
        )}

        {sources.length > 0 && (
          <div className="flex flex-wrap gap-1" role="group" aria-label={t("a.contact", "Source")}>
            <button
              onClick={() => setSrc("all")}
              aria-pressed={src === "all"}
              className={cx(
                "rounded-[2px] border px-2 py-0.5 font-mono text-2xs uppercase tracking-wider transition-colors",
                src === "all" ? "border-seal text-seal dark:border-seal-bright dark:text-seal-bright" : "border-paper-3 text-ink-3 dark:border-well-3"
              )}
            >
              {t("finder.all_cities", "all")}
            </button>
            {sources.map((s) => (
              <button
                key={s.id}
                onClick={() => setSrc(s.id)}
                aria-pressed={src === s.id}
                title={s.name}
                className={cx(
                  "flex items-center gap-1 rounded-[2px] border px-2 py-0.5 text-2xs tracking-wider transition-colors",
                  src === s.id ? "border-seal text-seal dark:border-seal-bright dark:text-seal-bright" : "border-paper-3 text-ink-3 dark:border-well-3"
                )}
              >
                {s.logo && <span aria-hidden>{s.logo}</span>}
                <span className="max-w-[10rem] truncate">{s.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {cachedAt && !load && (
        <p className="mt-3 text-[11.5px] text-ink-3">{t("news.updated", "Updated")} {when(cachedAt)}</p>
      )}

      {err && <ErrorNote className="mt-4">{err}</ErrorNote>}

      <div className="mt-5 space-y-2">
        {load && [0, 1, 2, 3, 4].map((i) => (
          <Card key={i} className="p-4"><Skeleton className="mb-2 h-3.5 w-3/4" /><Skeleton className="h-2.5 w-1/4" /></Card>
        ))}

        {!load && items.map((it, i) => (
          <Card key={i} className="transition-colors hover:border-ink-3/40">
            <a href={it.url} target="_blank" rel="noopener noreferrer" className="block p-4">
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-display text-[15px] font-medium leading-snug">{it.title}</p>
                  {it.summary && (
                    <p className="mt-1.5 line-clamp-2 text-[12.5px] leading-relaxed text-ink-3">{it.summary}</p>
                  )}
                  <div className="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1">
                    {it.source && <Badge tone="neutral">{it.source}</Badge>}
                    {it.category && <span className="text-[11px] capitalize text-ink-3">{t(it.category, it.category)}</span>}
                    {it.date && <span className="text-[11px] text-ink-3">{when(it.date)}</span>}
                  </div>
                </div>
                <Icon n="arr" s={14} className="mt-1 shrink-0 text-ink-3" data-flip={rtl ? "" : undefined} style={{ transform: rtl ? "rotate(45deg)" : "rotate(-45deg)" }} />
              </div>
            </a>
          </Card>
        ))}
      </div>

      {!load && !items.length && !err && (
        <Empty
          title={q ? `${t("news.nothing_matched", "Nothing matches")} “${q}”` : t("news.no_stories", "No stories right now")}
          action={<Button variant="outline" onClick={() => { setQ(""); setCat("all"); setSrc("all"); }}>{t("finder.clear_filters", "Clear filters")}</Button>}
        >
          {q ? t("news.broad_term", "Try a broader term.") : t("news.try_refresh", "Try refreshing, or check back shortly.")}
        </Empty>
      )}
    </div>
  );
}
