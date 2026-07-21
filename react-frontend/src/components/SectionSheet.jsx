import { useState, useEffect } from "react";
import { Icon } from "./Icon";
import { Spinner, Badge, ErrorNote } from "./ui";
import { apiFetch } from "../lib/api";

/* The other half of a citation link.
   Opens the enacted text of one section, over whatever you were reading.

   This is the point of the whole product. Until now an answer said "Grounded in
   Pakistan Penal Code" and the reader had to take it on faith — which is a claim,
   not an audit trail. Now the section number in the answer opens the statute. */
export const SectionSheet = ({ cite, onClose }) => {
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!cite) return;
    setData(null); setErr("");
    apiFetch(`/api/statutes/resolve/citation?text=${encodeURIComponent(cite)}`)
      .then(setData)
      .catch((e) => setErr(e.message || "Couldn't find that section."));
  }, [cite]);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [onClose]);

  if (!cite) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-ink/50 backdrop-blur-sm" onClick={onClose} />
      <div className="stamp relative max-h-[86vh] w-full max-w-2xl animate-rise overflow-hidden">
        <div className="flex items-start justify-between gap-4 border-b border-paper-3 p-5 dark:border-well-3">
          <div className="min-w-0">
            {data ? (
              <>
                <p className="eyebrow mb-1">{data.statute} · {data.year}</p>
                <p className="font-display text-[19px] font-medium leading-tight">
                  <span className="font-mono text-seal dark:text-seal-bright">
                    {data.unit === "article" ? "Article" : "§"}{data.number}
                  </span>{" "}
                  {data.title}
                </p>
              </>
            ) : (
              <p className="eyebrow">Looking up {cite}</p>
            )}
          </div>
          <button onClick={onClose} className="shrink-0 rounded-card p-1.5 text-ink-3 hover:text-ink dark:hover:text-paper" aria-label="Close">
            <Icon n="close" s={17} />
          </button>
        </div>

        <div className="max-h-[58vh] overflow-y-auto scroll-thin p-5">
          {!data && !err && <div className="flex justify-center py-10"><Spinner className="h-5 w-5 text-ink-3" /></div>}
          {err && <ErrorNote>{err}</ErrorNote>}
          {data && (
            /* Statute text is pre-formatted: sub-clauses are indented in the
               enacted text and that structure is meaningful, so it is preserved
               rather than reflowed into prose. */
            <pre className="whitespace-pre-wrap font-sans text-[13.5px] leading-[1.75] text-ink-2 dark:text-paper-2/90">
              {data.text}
            </pre>
          )}
        </div>

        {data && (
          <div className="flex flex-wrap items-center gap-2 border-t border-paper-3 bg-paper-2/50 p-4 dark:border-well-3 dark:bg-well-3/30">
            <Badge tone="seal"><Icon n="chk" s={10} />Enacted text</Badge>
            <span className="text-[11.5px] text-ink-3">{data.source}</span>
            <button
              onClick={() => navigator.clipboard?.writeText(`${data.statute} ${data.unit} ${data.number} — ${data.title}\n\n${data.text}`)}
              className="ms-auto flex items-center gap-1.5 text-[12px] text-seal dark:text-seal-bright"
            >
              <Icon n="copy" s={12} /> Copy
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SectionSheet;
