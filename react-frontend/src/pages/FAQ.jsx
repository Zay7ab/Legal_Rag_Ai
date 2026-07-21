import { useState } from "react";
import { Icon } from "../components/Icon";
import { Button, Card, Input, Empty, cx } from "../components/ui";
import { FAQ_SECTIONS } from "../data/legal";
import { useLang } from "../lib/i18n";

export default function FAQ({ go }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(null);

  const { t, rtl } = useLang();

  const needle = q.trim().toLowerCase();
  
  // Filter questions by searching both English and Urdu versions
  const sections = FAQ_SECTIONS
    .map((s) => ({
      ...s,
      items: s.items.filter((i) => {
        if (!needle) return true;
        const textToSearch = `${i.q} ${i.a} ${i.q_ur || ""} ${i.a_ur || ""}`.toLowerCase();
        return textToSearch.includes(needle);
      })
    }))
    .filter((s) => s.items.length);
    
  const count = sections.reduce((n, s) => n + s.items.length, 0);

  return (
    <div className="mx-auto max-w-3xl animate-rise px-4 py-10 sm:px-6">
      <p className="eyebrow mb-3">{t("page.faq", "Help")}</p>
      <h1 className="font-display text-[30px] font-normal leading-tight">{t("page.faq.d", "Common questions")}</h1>
      <p className="mt-2 max-w-lg text-[14px] leading-relaxed text-ink-2 dark:text-paper-2/80">
        {t("faq.subtitle", "Short answers to what people ask most. For anything specific to your situation, ask directly.")}
      </p>

      <div className="relative mt-6">
        <Icon n="srch" s={15} className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-ink-3" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("faq.filter_placeholder", "Filter questions…")}
          aria-label={t("faq.filter_placeholder", "Filter questions")}
          className="h-11 ps-9"
        />
      </div>

      {needle && <p className="mt-3 text-[12px] text-ink-3">{count} {count === 1 ? t("faq.match", "match") : t("faq.matches", "matches")}</p>}

      <div className="mt-7 space-y-8">
        {sections.map((s) => (
          <section key={s.cat}>
            <div className="mb-3 flex items-center gap-2">
              <span className={cx("h-1.5 w-1.5 rounded-full", s.tone === "high" ? "bg-tape" : s.tone === "medium" ? "bg-seal" : "bg-ink-3")} />
              <h2 className="eyebrow">{rtl ? s.cat_ur || s.cat : s.cat}</h2>
            </div>
            <div className="space-y-1.5">
              {s.items.map((it, i) => {
                const id = s.cat + i;
                return (
                  <Card key={id} className="overflow-hidden">
                    <button
                      onClick={() => setOpen(open === id ? null : id)}
                      aria-expanded={open === id}
                      className="flex w-full items-start gap-3 p-4 text-start"
                    >
                      <span className="flex-1 text-[14px] font-medium leading-snug">{rtl ? it.q_ur || it.q : it.q}</span>
                      <Icon n="dn" s={14} className={cx("mt-0.5 shrink-0 text-ink-3 transition-transform", open === id && "rotate-180")} />
                    </button>
                    {open === id && (
                      <p className="border-t border-paper-3 bg-paper-2/50 px-4 py-3.5 text-[13px] leading-relaxed text-ink-2 dark:border-well-3 dark:bg-well-3/40 dark:text-paper-2/85">
                        {rtl ? it.a_ur || it.a : it.a}
                      </p>
                    )}
                  </Card>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      {!sections.length && (
        <Empty title={`${t("faq.nothing_matched", "Nothing matches")} “${q}”`} action={<Button onClick={() => go("chat")}>{t("faq.ask_directly", "Ask it directly")}</Button>}>
          {t("faq.empty_desc", "Your question might be too specific for this list — ask it and get an answer with the law cited.")}
        </Empty>
      )}

      <Card stamp className="mt-10 p-6 text-center">
        <p className="font-display text-[18px]">{t("faq.not_found_title", "Didn't find it?")}</p>
        <p className="mx-auto mt-1.5 max-w-sm text-[13px] leading-relaxed text-ink-3">
          {t("faq.not_found_desc", "Describe your situation and Legal Rag Ai will answer with the section it came from.")}
        </p>
        <Button className="mt-4" onClick={() => go("chat")}>{t("faq.ask_law", "Ask the law")} <Icon n="arr" s={13} data-flip={rtl ? "" : undefined} /></Button>
      </Card>
    </div>
  );
}
