import { useState, useRef } from "react";
import { Icon } from "../components/Icon";
import Markdown from "../components/Markdown";
import CitationStrip from "../components/CitationStrip";
import { Button, Card, Textarea, Empty, ErrorNote, cx } from "../components/ui";
import { apiPost } from "../lib/api";
import { useLang } from "../lib/i18n";

const MAX_BYTES = 10 * 1024 * 1024;

const toB64 = (f) =>
  new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result).split(",")[1]);
    r.onerror = () => rej(new Error("Couldn't read that file."));
    r.readAsDataURL(f);
  });

export default function Scanner() {
  const [mode, setMode] = useState("upload");   // upload | paste
  const [file, setFile] = useState(null);
  const [text, setText] = useState("");
  const [result, setResult] = useState(null);
  const [grounding, setGrounding] = useState(null);   // {sources, has_rag_context}
  const [load, setLoad] = useState(false);
  const [err, setErr] = useState("");
  const [drag, setDrag] = useState(false);
  const inputRef = useRef(null);

  const { t, rtl } = useLang();

  const accept = (f) => {
    setErr("");
    if (!f) return;
    if (f.size > MAX_BYTES) { setErr(t("scanner.err_size", "That file is over 10 MB. Upload a smaller PDF.")); return; }
    if (f.type !== "application/pdf") {
      setErr(t("scanner.err_format", "Only PDFs can be read directly. For a photo or scan, copy the text and use Paste text."));
      return;
    }
    setFile(f); setResult(null);
  };

  const analyseFile = async () => {
    if (!file) return;
    setLoad(true); setErr(""); setResult(null); setGrounding(null);
    try {
      const b64 = await toB64(file);
      const d = await apiPost("/api/documents/scan", { file_data: b64, file_type: file.type, file_name: file.name });
      setResult(d.analysis);
      setGrounding({ sources: d.sources || [], grounded: !!d.has_rag_context });
    } catch (e) { setErr(e.message || "Couldn't analyse that document."); }
    finally { setLoad(false); }
  };

  const analyseText = async () => {
    if (!text.trim()) return;
    setLoad(true); setErr(""); setResult(null); setGrounding(null);
    try {
      const d = await apiPost("/api/documents/scan", { text: text.trim() });
      setResult(d.analysis);
      setGrounding({ sources: d.sources || [], grounded: !!d.has_rag_context });
    } catch (e) { setErr(e.message || "Couldn't analyse that text."); }
    finally { setLoad(false); }
  };

  return (
    <div className="mx-auto max-w-3xl animate-rise px-4 py-10 sm:px-6">
      <p className="eyebrow mb-3">{t("page.docs", "Documents")}</p>
      <h1 className="font-display text-[30px] font-normal leading-tight">{t("scanner.title", "Check a document")}</h1>
      <p className="mt-2 max-w-xl text-[14px] leading-relaxed text-ink-2 dark:text-paper-2/80">
        {t("scanner.subtitle", "Upload a contract, notice, or agreement and Legal Rag Ai will explain what it says and flag clauses worth a second look. It's a reading aid, not a legal review.")}
      </p>

      <div className="mt-6 flex gap-1" role="tablist">
        {[["upload", t("scanner.upload_pdf", "Upload a PDF"), "up2"], ["paste", t("scanner.paste_text", "Paste text"), "note"]].map(([m, label, ic]) => (
          <button
            key={m}
            role="tab"
            aria-selected={mode === m}
            onClick={() => { setMode(m); setErr(""); setResult(null); }}
            className={cx(
              "flex items-center gap-1.5 rounded-card px-3 py-1.5 text-[12.5px] transition-colors",
              mode === m ? "bg-seal text-white" : "text-ink-3 hover:bg-paper-2 hover:text-ink dark:hover:bg-well-3"
            )}
          >
            <Icon n={ic} s={13} /> {label}
          </button>
        ))}
      </div>

      {mode === "upload" && (
        <div className="mt-4">
          <div
            onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => { e.preventDefault(); setDrag(false); accept(e.dataTransfer.files?.[0]); }}
            onClick={() => inputRef.current?.click()}
            className={cx(
              "cursor-pointer rounded-card border border-dashed p-10 text-center transition-colors",
              drag ? "border-seal bg-seal-tint/50 dark:bg-seal/10" : "border-paper-3 hover:border-ink-3/50 dark:border-well-3"
            )}
          >
            <input
              ref={inputRef} type="file" accept="application/pdf" className="hidden"
              onChange={(e) => accept(e.target.files?.[0])}
            />
            <Icon n="up2" s={22} className="mx-auto text-ink-3" />
            <p className="mt-3 text-[13.5px] font-medium">{file ? file.name : t("scanner.drop_placeholder", "Drop a PDF here, or click to choose")}</p>
            <p className="mt-1 text-[11.5px] text-ink-3">
              {file ? `${(file.size / 1024).toFixed(0)} KB · ${t("scanner.ready", "ready")}` : t("scanner.formats", "PDF only, up to 10 MB")}
            </p>
          </div>
          <Button className="mt-3 w-full sm:w-auto" onClick={analyseFile} loading={load} disabled={!file}>
            {t("scanner.review_btn", "Read this document")}
          </Button>
        </div>
      )}

      {mode === "paste" && (
        <div className="mt-4">
          <Textarea
            rows={9}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t("scanner.paste_placeholder", "Paste the text of the document here…")}
            aria-label="Document text"
          />
          <div className="mt-2 flex items-center gap-3">
            <Button onClick={analyseText} loading={load} disabled={!text.trim()}>{t("scanner.review_btn", "Read this text")}</Button>
            <span className="text-[11.5px] text-ink-3">{text.length.toLocaleString()} {t("scanner.characters", "characters")}</span>
          </div>
        </div>
      )}

      {err && <ErrorNote className="mt-4">{err}</ErrorNote>}

      {load && (
        <Card className="mt-6 p-8 text-center">
          <p className="text-[13px] text-ink-3">{t("scanner.reading", "Reading the document…")}</p>
        </Card>
      )}

      {result && !load && (
        <Card stamp className="mt-6 animate-rise p-5 sm:p-6">
          <p className="eyebrow mb-3">{t("scanner.results_title", "What this document says")}</p>
          <Markdown content={typeof result === "string" ? result : JSON.stringify(result, null, 2)} />

          {grounding && <CitationStrip sources={grounding.sources} grounded={grounding.grounded} />}

          <p className="mt-3 border-t border-dashed border-paper-3 pt-2.5 text-[11.5px] leading-relaxed text-ink-3 dark:border-well-3">
            {t("scanner.disclaimer", "A reading aid, not a legal review. Have a lawyer check anything you're about to sign.")}
          </p>
        </Card>
      )}

      {!result && !load && !err && (
        <Empty title={t("scanner.empty_title", "Nothing read yet")}>
          {t("scanner.empty_desc", "Upload a PDF or paste text above. Legal Rag Ai will summarise it and point out clauses worth attention.")}
        </Empty>
      )}
    </div>
  );
}
