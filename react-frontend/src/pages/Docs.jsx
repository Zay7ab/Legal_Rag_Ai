import { useState, useEffect } from "react";
import { Icon } from "../components/Icon";
import { Button, Card, Input, Textarea, Field, Badge, Skeleton, Empty, ErrorNote, cx } from "../components/ui";
import { apiFetch, apiPost, apiBlob } from "../lib/api";
import { useLang } from "../lib/i18n";

/* Defer revokeObjectURL: calling it synchronously after .click() races the
   download in Firefox/Safari and can produce an empty file. */
const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

export default function Docs() {
  const [tmpls, setTmpls] = useState([]);
  const [sel, setSel]     = useState(null);
  const [flds, setFlds]   = useState({});
  const [sugg, setSugg]   = useState({});
  const [aiDesc, setAiDesc] = useState("");
  const [aiLoad, setAiLoad] = useState(false);
  const [genLoad, setGenLoad] = useState(false);
  const [done, setDone]   = useState(false);
  const [fellBack, setFellBack] = useState(false);
  const [err, setErr]     = useState("");
  const [loading, setLoading] = useState(true);

  const { t, rtl } = useLang();

  useEffect(() => {
    let alive = true;
    apiFetch("/api/documents/templates")
      .then((d) => { if (alive) setTmpls(Array.isArray(d) ? d : d.templates || []); })
      .catch((e) => { if (alive) setErr("Couldn't load templates: " + e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  const pick = (t) => { setSel(t); setFlds({}); setSugg({}); setDone(false); setErr(""); setFellBack(false); setAiDesc(""); };

  const autofill = async () => {
    if (!aiDesc.trim()) return;
    setAiLoad(true); setErr("");
    try {
      const d = await apiPost("/api/documents/ai-suggest", { template_id: sel.id, description: aiDesc });
      setSugg(d.suggestions || {});
      setFlds((f) => ({ ...f, ...d.suggestions }));
    } catch (e) { setErr(e.message || "Couldn't draft the fields."); }
    finally { setAiLoad(false); }
  };

  const generate = async () => {
    const missing = sel.fields.filter((f) => f.required && !String(flds[f.id] || "").trim()).map((f) => t(f.label, f.label));
    if (missing.length) { setErr(t("docs.fill_fields", "Fill in") + ": " + missing.join(", ")); return; }
    setErr(""); setGenLoad(true); setDone(false);
    try {
      const blob = await apiBlob("/api/documents/generate", { template_id: sel.id, fields: flds, format: "pdf" });
      downloadBlob(blob, sel.id + ".pdf");
      setDone(true); setFellBack(false);
    } catch (e) {
      const retryable = e.status === 500 || e.status === undefined;
      if (!retryable) { setErr(e.message); setGenLoad(false); return; }
      try {
        const blob = await apiBlob("/api/documents/generate", { template_id: sel.id, fields: flds, format: "txt" });
        downloadBlob(blob, sel.id + ".txt");
        setDone(true); setFellBack(true);
      } catch (e2) { setErr(e2.message || "Couldn't generate the document."); }
    } finally { setGenLoad(false); }
  };

  const cats = [...new Set(tmpls.map((t) => t.category))];

  return (
    <div className="mx-auto max-w-6xl animate-rise px-4 py-10 sm:px-6">
      <p className="eyebrow mb-3">{t("page.docs", "Documents")}</p>
      <h1 className="font-display text-[30px] font-normal leading-tight">{t("docs.title", "Draft a legal document")}</h1>
      <p className="mt-2 max-w-lg text-[14px] leading-relaxed text-ink-2 dark:text-paper-2/80">
        {t("docs.subtitle", "Fill in the details and download a ready document. Print it on stamp paper where the law requires it.")}
      </p>

      <div className="mt-8 grid gap-6 lg:grid-cols-[17rem_1fr]">
        {/* ── Template list ─────────────────────────────────────────────── */}
        <div>
          <p className="eyebrow mb-2.5">{t("docs.templates", "Templates")}</p>
          {loading && (
            <div className="space-y-2">
              {[0, 1, 2, 3, 4].map((i) => (
                <Card key={i} className="p-3"><Skeleton className="mb-1.5 h-3 w-3/4" /><Skeleton className="h-2 w-1/3" /></Card>
              ))}
            </div>
          )}
          {!loading && cats.map((cat) => (
            <div key={cat} className="mb-4">
              <p className="mb-1.5 font-mono text-2xs uppercase tracking-[.12em] text-ink-3">{t(cat, cat)}</p>
              <div className="space-y-1">
                {tmpls.filter((t) => t.category === cat).map((tmpl) => (
                  <button
                    key={tmpl.id}
                    onClick={() => pick(tmpl)}
                    className={cx(
                      "w-full rounded-card border px-3 py-2.5 text-start transition-colors",
                      sel?.id === tmpl.id
                        ? "border-seal bg-seal-tint dark:border-seal-bright dark:bg-seal/15"
                        : "border-paper-3 hover:border-ink-3/40 dark:border-well-3"
                    )}
                  >
                    <span className="block text-[13px] font-medium">{t(tmpl.name, tmpl.name)}</span>
                    {tmpl.description && <span className="mt-0.5 block text-[11.5px] leading-snug text-ink-3">{t(tmpl.description, tmpl.description)}</span>}
                  </button>
                ))}
              </div>
            </div>
          ))}
          {!loading && !tmpls.length && !err && <Empty title={t("docs.no_templates", "No templates yet")} />}
        </div>

        {/* ── Form ──────────────────────────────────────────────────────── */}
        <div>
          {!sel && (
            <Card className="flex min-h-[22rem] items-center justify-center">
              <Empty title={t("docs.pick_template_title", "Pick a template to start")}>
                {t("docs.pick_template_desc", "Choose from the list. You can describe your situation and let Legal Rag Ai draft the fields, then correct anything it gets wrong.")}
              </Empty>
            </Card>
          )}

          {sel && (
            <Card stamp className="p-5 sm:p-7">
              <div className="mb-5">
                <p className="font-display text-[19px] font-medium">{t(sel.name, sel.name)}</p>
                {sel.description && <p className="mt-1 text-[13px] text-ink-3">{t(sel.description, sel.description)}</p>}
              </div>

              {/* AI autofill */}
              <div className="mb-6 rounded-card border border-dashed border-paper-3 p-3.5 dark:border-well-3">
                <div className="mb-2 flex items-center gap-1.5">
                  <Icon n="spk" s={13} className="text-seal dark:text-seal-bright" />
                  <span className="eyebrow">{t("docs.draft_for_me", "Draft it for me")}</span>
                </div>
                <Textarea
                  rows={2}
                  value={aiDesc}
                  onChange={(e) => setAiDesc(e.target.value)}
                  placeholder={t("docs.ai_placeholder", "Describe your situation in plain words — Legal Rag Ai fills in what it can.")}
                />
                <Button size="sm" variant="outline" className="mt-2" onClick={autofill} loading={aiLoad} disabled={!aiDesc.trim()}>
                  {t("docs.fill_fields", "Fill the fields")}
                </Button>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {sel.fields?.map((f) => {
                  const long = f.type === "textarea";
                  return (
                    <div key={f.id} className={cx(long && "sm:col-span-2")}>
                      <Field label={t(f.label, f.label)} required={f.required} hint={sugg[f.id] ? t("docs.drafted_hint", "Drafted for you — check it.") : undefined}>
                        {long ? (
                          <Textarea
                            rows={3}
                            value={flds[f.id] || ""}
                            onChange={(e) => setFlds({ ...flds, [f.id]: e.target.value })}
                            placeholder={t(f.placeholder || f.label, f.placeholder || f.label)}
                          />
                        ) : (
                          <Input
                            type={f.type === "date" ? "date" : "text"}
                            value={flds[f.id] || ""}
                            onChange={(e) => setFlds({ ...flds, [f.id]: e.target.value })}
                            placeholder={t(f.placeholder || f.label, f.placeholder || f.label)}
                          />
                        )}
                      </Field>
                    </div>
                  );
                })}
              </div>

              {err && <ErrorNote className="mt-4">{err}</ErrorNote>}

              {done && !fellBack && (
                <p className="mt-4 flex items-center gap-1.5 text-[12.5px] text-seal dark:text-seal-bright">
                  <Icon n="chk" s={13} /> {t("docs.downloaded", "Downloaded.")}
                </p>
              )}
              {done && fellBack && (
                <p className="mt-4 flex items-center gap-1.5 text-[12.5px] text-tape">
                  <Icon n="warn" s={13} /> {t("docs.downloaded_txt", "Downloaded as .txt — the server couldn't render a PDF.")}
                </p>
              )}

              <Button size="lg" className="mt-5 w-full sm:w-auto" onClick={generate} loading={genLoad}>
                <Icon n="dl" s={14} /> {t("docs.download_doc", "Download document")}
              </Button>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
