import { useState, useMemo } from "react";
import { Icon } from "../components/Icon";
import { Card, Input, Empty, cx } from "../components/ui";
import { GLOSSARY_TERMS } from "../data/legal";
import { useLang } from "../lib/i18n";

export default function Glossary() {
  const [q, setQ] = useState("");
  const [letter, setLetter] = useState("all");

  const { t, rtl } = useLang();

  const letters = useMemo(
    () => ["all", ...[...new Set(GLOSSARY_TERMS.map((t) => t.t[0].toUpperCase()))].sort()],
    []
  );

  const needle = q.trim().toLowerCase();
  
  // Search through both English and Urdu fields
  const list = GLOSSARY_TERMS
    .filter((term) => (letter === "all" || term.t[0].toUpperCase() === letter))
    .filter((term) => {
      if (!needle) return true;
      const textToSearch = `${term.t} ${term.d} ${term.t_ur || ""} ${term.d_ur || ""}`.toLowerCase();
      return textToSearch.includes(needle);
    })
    .sort((a, b) => a.t.localeCompare(b.t));

  return (
    <div className="mx-auto max-w-3xl animate-rise px-4 py-10 sm:px-6">
      <p className="eyebrow mb-3">{t("page.glossary", "Reference")}</p>
      <h1 className="font-display text-[30px] font-normal leading-tight">{t("glossary.title", "Legal terms, explained")}</h1>
      <p className="mt-2 max-w-lg text-[14px] leading-relaxed text-ink-2 dark:text-paper-2/80">
        {t("glossary.subtitle", "Common Urdu and English legal terms, explained in plain language.")}
      </p>

      <div className="relative mt-6">
        <Icon n="srch" s={15} className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-ink-3" />
        <Input
          value={q}
          onChange={(e) => { setQ(e.target.value); setLetter("all"); }}
          placeholder={t("glossary.search_placeholder", "Search terms…")}
          aria-label={t("glossary.search_placeholder", "Search terms")}
          className="h-11 ps-9"
        />
      </div>

      <div className="mt-4 flex flex-wrap gap-1" role="group" aria-label="Filter by letter">
        {letters.map((l) => (
          <button
            key={l}
            onClick={() => setLetter(l)}
            aria-pressed={letter === l}
            className={cx(
              "h-7 min-w-[1.75rem] rounded-[2px] px-1.5 font-mono text-[11.5px] uppercase transition-colors",
              letter === l ? "bg-seal text-white" : "text-ink-3 hover:bg-paper-2 hover:text-ink dark:hover:bg-well-3"
            )}
          >
            {l}
          </button>
        ))}
      </div>

      <p className="mt-4 text-[12px] text-ink-3">
        {list.length} {list.length === 1 ? t("glossary.term", "term") : t("glossary.terms", "terms")}
      </p>

      <div className="mt-3 space-y-1.5">
        {list.map((term) => (
          <Card key={term.t} className="p-4">
            <p className="font-display text-[15px] font-medium">{rtl ? term.t_ur || term.t : term.t}</p>
            <p className="mt-1 text-[13px] leading-relaxed text-ink-2 dark:text-paper-2/80">
              {rtl ? term.d_ur || term.d : term.d}
            </p>
          </Card>
        ))}
      </div>

      {!list.length && (
        <Empty title={`${t("glossary.nothing_matched", "Nothing matches")} “${q}”`}>
          {t("glossary.empty_desc", "Try typing another legal term or check the spelling.")}
        </Empty>
      )}
    </div>
  );
}
