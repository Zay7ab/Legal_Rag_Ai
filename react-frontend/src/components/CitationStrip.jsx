import { Icon } from "./Icon";
import { Badge } from "./ui";
import { useLang } from "../lib/i18n";

/* ── The product's honesty mechanism ──────────────────────────────────────────
   This app answers legal questions. The single most important thing a user
   needs to know is not the answer — it's whether the answer is grounded in
   an actual statute they can take to a lawyer, or whether the model is talking
   from general knowledge.

   The backend already returns `has_rag_context`. The old UI ignored it, so a
   grounded citation and an ungrounded guess looked identical. That is the
   worst possible failure for a legal tool.

   So grounding is stated, both ways:
     grounded  -> name the statutes it read
     ungrounded-> say plainly that no statute matched, and don't dress it up

   This is also why the corpus gap matters: at ~2% coverage most answers land
   in the ungrounded state, and now that is visible instead of hidden. */

const prettyName = (src) =>
  String(src)
    .replace(/\.(txt|pdf)$/i, "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\bPpc\b/, "Pakistan Penal Code")
    .replace(/\bCrpc\b/, "Code of Criminal Procedure")
    .replace(/\bPeca\b/, "PECA")
    .replace(/\bMflo\b/, "Muslim Family Laws Ordinance");

export const CitationStrip = ({ sources = [], grounded }) => {
  const { t } = useLang();
  if (!grounded) {
    return (
      <div className="mt-3 flex items-start gap-2 border-t border-dashed border-paper-3 pt-2.5 dark:border-well-3">
        <Icon n="warn" s={13} className="mt-px shrink-0 text-tape" />
        <p className="text-[11.5px] leading-relaxed text-ink-3">
          <span className="font-medium text-tape">{t("g.none", "No statute matched.")}</span>{" "}
          {/* Wording matters. This used to say "this is general guidance", which
              described behaviour the backend does not have — when retrieval finds
              nothing the LLM is never called and no guidance is produced at all
              (see backend/services/refusal.py). The UI must describe what the
              system actually did, or the honesty mechanism is itself dishonest. */}
          {t("g.none.d", "Nothing was answered from the law library, so no section is cited. Take this to a lawyer.")}
        </p>
      </div>
    );
  }

  return (
    <div className="mt-3 border-t border-paper-3 pt-2.5 dark:border-well-3">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="eyebrow me-0.5">{t("g.grounded", "Grounded in")}</span>
        {sources.map((s, i) => (
          <Badge key={i} tone="seal">
            <Icon n="book" s={10} />
            {prettyName(s)}
          </Badge>
        ))}
      </div>
    </div>
  );
};

export default CitationStrip;
