import { useState } from "react";
import { Icon } from "../components/Icon";
import { Card, Input, Badge, Empty, Cite, cx } from "../components/ui";
import { PENALTY_LAWS, CORPUS_BACKED } from "../data/legal";
import { useLang } from "../lib/i18n";

export default function Penalty() {
  const [tab, setTab] = useState(0);
  const [q, setQ] = useState("");

  const { t, rtl } = useLang();

  const SEV = {
    high:   { bar: "bg-tape",   label: t("penalty.high", "Severe") },
    medium: { bar: "bg-seal",   label: t("penalty.medium", "Serious") },
    low:    { bar: "bg-ink-3",  label: t("penalty.low", "Lesser") },
  };

  const law = PENALTY_LAWS[tab];
  const verified = CORPUS_BACKED.includes(law.short);
  const needle = q.trim().toLowerCase();
  
  // Filter penalties searching both English and Urdu values
  const rows = law.penalties.filter((p) => {
    if (!needle) return true;
    const textToSearch = `${p.offence} ${p.section} ${p.punishment} ${p.offence_ur || ""} ${p.punishment_ur || ""}`.toLowerCase();
    return textToSearch.includes(needle);
  });

  return (
    <div className="mx-auto max-w-4xl animate-rise px-4 py-10 sm:px-6">
      <p className="eyebrow mb-3">{t("page.penalty", "Reference")}</p>
      <h1 className="font-display text-[30px] font-normal leading-tight">
        {t("penalty.title", "Offences and punishments")}
      </h1>
      <p className="mt-2 max-w-xl text-[14px] leading-relaxed text-ink-2 dark:text-paper-2/80">
        {t("penalty.subtitle", "Quick guide to punishments under Pakistani law. Always check the actual section for exceptions and detail.")}
      </p>

      <div className="mt-6 flex flex-wrap gap-1" role="tablist" aria-label="Statute">
        {PENALTY_LAWS.map((l, i) => (
          <button
            key={l.short}
            role="tab"
            aria-selected={tab === i}
            onClick={() => { setTab(i); setQ(""); }}
            className={cx(
              "rounded-card px-3 py-1.5 font-mono text-[12px] uppercase tracking-wider transition-colors",
              tab === i ? "bg-seal text-white" : "text-ink-3 hover:bg-paper-2 hover:text-ink dark:hover:bg-well-3"
            )}
          >
            {rtl ? l.short_ur || l.short : l.short}
          </button>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <p className="text-[13px] text-ink-3">{rtl ? law.full_ur || law.full : law.full}</p>
        {verified ? (
          <Badge tone="seal"><Icon n="chk" s={10} />{t("penalty.checked", "Checked against the statute")}</Badge>
        ) : (
          <Badge tone="tape"><Icon n="warn" s={10} />{t("penalty.unchecked", "Not in our law library")}</Badge>
        )}
      </div>
      {!verified && (
        <p className="mt-2 max-w-xl text-[11.5px] leading-relaxed text-ink-3">
          {t("penalty.disclaimer", "This statute isn't in the corpus, so these entries are hand-written reference that we cannot check against the enacted text. Treat them as a starting point — the tabs marked checked are verified section by section.")}
        </p>
      )}

      <div className="relative mt-4">
        <Icon n="srch" s={15} className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-ink-3" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={`${t("a.search", "Search")} ${rtl ? law.short_ur || law.short : law.short}…`}
          aria-label={`${t("a.search", "Search")} ${rtl ? law.short_ur || law.short : law.short}`}
          className="h-11 ps-9"
        />
      </div>

      <div className="mt-5 space-y-1.5">
        {rows.map((p, i) => {
          const sev = SEV[p.sev] || SEV.low;
          return (
            <Card key={i} className="flex overflow-hidden">
              <span className={cx("w-[3px] shrink-0", sev.bar)} aria-hidden />
              <div className="flex-1 p-4">
                <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                  <Cite>{t("penalty.section", "Section")} {p.section}</Cite>
                  <p className="text-[14px] font-medium">{rtl ? p.offence_ur || p.offence : p.offence}</p>
                  <Badge tone={p.sev === "high" ? "tape" : "neutral"} className="ms-auto">{sev.label}</Badge>
                </div>
                <p className="mt-1.5 text-[13px] leading-relaxed text-ink-2 dark:text-paper-2/80">
                  {rtl ? p.punishment_ur || p.punishment : p.punishment}
                </p>
              </div>
            </Card>
          );
        })}
      </div>

      {!rows.length && (
        <Empty title={`${t("penalty.nothing_matched", "Nothing matched")} in ${rtl ? law.short_ur || law.short : law.short} “${q}”`}>
          {t("penalty.empty_desc", "Try the offence name rather than the section number.")}
        </Empty>
      )}
    </div>
  );
}
