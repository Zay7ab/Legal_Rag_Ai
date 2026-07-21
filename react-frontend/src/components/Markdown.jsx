import { useState } from "react";
import { marked } from "marked";
import DOMPurify from "dompurify";
import SectionSheet from "./SectionSheet";

marked.setOptions({ breaks: true, gfm: true });

/* SECURITY — do not remove or loosen.
   LLM output is untrusted: a hallucination or a prompt injection could emit
   <script>, an onerror= handler, or a javascript: href, which would run in the
   user's browser with their session. marked.parse() does NOT sanitize.
   DOMPurify strips anything executable while leaving real markdown intact. */
const SAFE_HTML = {
  ALLOWED_TAGS: [
    "p","br","hr","strong","em","b","i","u","s","code","pre","blockquote",
    "ul","ol","li","h1","h2","h3","h4","h5","h6",
    "table","thead","tbody","tr","th","td","a","span","div","button",
  ],
  // data-cite carries the citation to look up. It is an attribute we add
  // ourselves, AFTER sanitising the model's output, and it only ever holds text
  // matched by CITATION below — never anything the model wrote freely.
  ALLOWED_ATTR: ["href","title","target","rel","class","data-cite","type"],
  ALLOWED_URI_REGEXP: /^(?:https?|mailto|tel):/i,
};

/* Statutes we can actually open. A citation to something we don't hold stays
   plain text — a dead link that promises a source and delivers nothing is worse
   than no link. */
const LINKABLE = "PPC|CrPC|Cr\\.P\\.C|CPC|Constitution|QSO|Qanun-e-Shahadat|PECA|MFLO|DMMA|IRA|EOBI|NAB";

/* "Section 302 PPC", "s.489F PPC", "§302 PPC", "Article 10A of the Constitution" */
const CITATION = new RegExp(
  `(?:Section|Article|§|s\\.)\\s*(\\d+[A-Za-z\\-]*)\\s*(?:of\\s+the\\s+)?(${LINKABLE})\\b`,
  "gi",
);

export const renderMarkdown = (content) => {
  const html = DOMPurify.sanitize(marked.parse(String(content ?? "")), SAFE_HTML);

  /* Linkify AFTER sanitising, never before.
     Doing it first would mean DOMPurify strips our own markup; doing it after on
     the *sanitised* string means the only thing we inject is derived from a
     strict regex over text that has already been cleaned. */
  return html.replace(CITATION, (match, num, act) => {
    const cite = `${num} ${act}`.replace(/"/g, "");
    return `<button type="button" data-cite="${cite}" class="cite-link">${match}</button>`;
  });
};

/* Urdu is set in Nastaliq and RTL. The previous build returned Urdu *text* but
   rendered it LTR in a Latin face, which is close to unreadable. */
export const Markdown = ({ content, lang = "en", className = "" }) => {
  const [cite, setCite] = useState(null);

  // One listener on the container rather than per-citation React nodes: the HTML
  // comes from dangerouslySetInnerHTML, so there are no React nodes to bind to.
  const onClick = (e) => {
    const btn = e.target.closest?.("[data-cite]");
    if (btn) setCite(btn.getAttribute("data-cite"));
  };

  return (
    <>
      <div
        dir={lang === "ur" ? "rtl" : "ltr"}
        lang={lang}
        onClick={onClick}
        className={`answer ${lang === "ur" ? "answer-ur" : ""} ${className}`}
        dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
      />
      {cite && <SectionSheet cite={cite} onClose={() => setCite(null)} />}
    </>
  );
};

export default Markdown;
