import { useState, useEffect } from "react";
import { Icon } from "../components/Icon";
import { Card, Badge, Skeleton, Empty, ErrorNote, cx } from "../components/ui";
import { apiFetch } from "../lib/api";
import { useLang } from "../lib/i18n";

export default function Rights() {
  const [cats, setCats] = useState([]);
  const [sel, setSel]   = useState(null);
  const [det, setDet]   = useState(null);
  const [load, setLoad] = useState(false);
  const [listLoad, setListLoad] = useState(true);
  const [err, setErr]   = useState("");

  const { t, rtl } = useLang();

  useEffect(() => {
    let alive = true;
    apiFetch("/api/rights/categories")
      .then((d) => { if (alive) setCats(Array.isArray(d) ? d : d.categories || []); })
      .catch((e) => { if (alive) setErr(e.message); })
      .finally(() => { if (alive) setListLoad(false); });
    return () => { alive = false; };
  }, []);

  const pick = async (cat) => {
    setSel(cat.id); setLoad(true); setErr("");
    try { setDet(await apiFetch("/api/rights/" + cat.id)); }
    catch (e) { setErr(e.message || "Couldn't load that section."); setDet(null); }
    finally { setLoad(false); }
  };

  return (
    <div className="mx-auto max-w-4xl animate-rise px-4 py-10 sm:px-6">
      <p className="eyebrow mb-3">{t("page.rights", "Your rights")}</p>
      <h1 className="font-display text-[30px] font-normal leading-tight">{t("page.rights.d", "Know where you stand")}</h1>
      <p className="mt-2 max-w-xl text-[14px] leading-relaxed text-ink-2 dark:text-paper-2/80">
        {t("rights.subtitle", "What the law guarantees you, and what to do when it isn't honoured.")}
      </p>

      {err && <ErrorNote className="mt-5">{err}</ErrorNote>}

      <div className="mt-7 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {listLoad && [0, 1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-[5.5rem]" />)}
        {!listLoad && cats.map((cat) => (
          <button
            key={cat.id}
            onClick={() => pick(cat)}
            aria-pressed={sel === cat.id}
            className={cx(
              "rounded-card border p-4 text-start transition-colors",
              sel === cat.id
                ? "border-seal bg-seal-tint dark:border-seal-bright dark:bg-seal/15"
                : "border-paper-3 bg-white hover:border-ink-3/40 dark:border-well-3 dark:bg-well-2"
            )}
          >
            <span className="text-[22px] leading-none" aria-hidden>{cat.icon}</span>
            <span className="mt-2.5 block text-[12.5px] font-medium leading-snug">{t(cat.title, cat.title)}</span>
          </button>
        ))}
      </div>

      {load && (
        <div className="mt-6 space-y-3">
          <Skeleton className="h-16" />
          <div className="grid gap-3 sm:grid-cols-2"><Skeleton className="h-52" /><Skeleton className="h-52" /></div>
        </div>
      )}

      {det && !load && (
        <div className="mt-6 animate-rise">
          <Card className="p-5">
            <h2 className="font-display text-[20px] font-medium">{t(det.title, det.title)}</h2>
            {det.law_references?.length > 0 && (
              <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                <span className="eyebrow me-0.5">{t("g.grounded", "Grounded in")}</span>
                {det.law_references.map((r, i) => (
                  <Badge key={i} tone="seal"><Icon n="book" s={10} />{t(r, r)}</Badge>
                ))}
              </div>
            )}
          </Card>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Card className="p-5">
              <p className="eyebrow mb-3.5">{t("rights.entitled", "What you're entitled to")}</p>
              <ul className="space-y-2.5">
                {det.rights?.map((r, i) => (
                  <li key={i} className="flex gap-2.5">
                    <Icon n="chk" s={13} className="mt-1 shrink-0 text-seal dark:text-seal-bright" />
                    <span className="text-[13px] leading-relaxed text-ink-2 dark:text-paper-2/85">{t(r, r)}</span>
                  </li>
                ))}
              </ul>
            </Card>

            <Card stamp className="p-5">
              <p className="eyebrow mb-3.5">{t("rights.todo", "What to do, in order")}</p>
              <ol className="space-y-2.5">
                {det.what_to_do?.map((a, i) => (
                  <li key={i} className="flex gap-2.5">
                    <span className="mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[2px] bg-seal font-mono text-[10px] font-medium text-white">
                      {i + 1}
                    </span>
                    <span className="text-[13px] leading-relaxed text-ink-2 dark:text-paper-2/85">{t(a, a)}</span>
                  </li>
                ))}
              </ol>
            </Card>
          </div>
        </div>
      )}

      {!det && !load && !listLoad && (
        <Empty title={t("rights.pick_situation", "Pick a situation above")}>{t("rights.pick_situation_desc", "Each one lists your rights and the steps to take, with the law they come from.")}</Empty>
      )}
    </div>
  );
}
