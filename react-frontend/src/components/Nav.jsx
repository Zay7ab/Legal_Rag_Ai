import { useState, useEffect, useRef } from "react";
import { Icon } from "./Icon";
import { Button, cx } from "./ui";
import { isAdmin } from "../lib/api";
import { useLang } from "../lib/i18n";
import Logo from "./Logo";

/* Nav groups by intent, not by feature list. 16 destinations in one flat bar is
   a wall; the previous build had exactly that. People arrive with a question
   ("what happens now?"), a need for a document, or a need for a person. */
export const NAV_GROUPS = [
  {
    key: "nav.ask",
    label: "Ask",
    items: [
      { id: "chat", k: "page.chat",     icon: "msg",   label: "Ask the law",    desc: "Chat about your situation" },
      { id: "search", k: "page.search",   icon: "srch",  label: "Case law",       desc: "Search judgments" , flag: "search" },
      { id: "statutes", k: "page.statutes", icon: "book",  label: "Read the law",   desc: "Every statute, in full" },
      { id: "penalty", k: "page.penalty",  icon: "gavel", label: "Penalties",      desc: "Look up a section" },
      { id: "rights", k: "page.rights",   icon: "shld",  label: "Your rights",    desc: "Know where you stand" },
    ],
  },
  {
    key: "nav.documents",
    label: "Documents",
    items: [
      { id: "docs", k: "page.docs",     icon: "file",  label: "Draft",          desc: "Generate a document" },
      { id: "scanner", k: "page.scanner",  icon: "scan",  label: "Review",         desc: "Check a document" },
      { id: "glossary", k: "page.glossary", icon: "abc",   label: "Glossary",       desc: "Legal terms explained" },
    ],
  },
  {
    key: "nav.people",
    label: "People & cases",
    items: [
      { id: "finder", k: "page.finder",   icon: "map",   label: "Find a lawyer",  desc: "Browse by city" },
      { id: "booking", k: "page.booking",  icon: "cal",   label: "Book a consult", desc: "Request a slot", flag: "booking" },
      { id: "casetrack", k: "page.casetrack",icon: "brief", label: "Track a case",   desc: "Follow your matter" },
      { id: "news", k: "page.news",     icon: "news",  label: "Legal news",     desc: "What's changing" },
      { id: "faq", k: "page.faq",      icon: "faq",   label: "Help",           desc: "Common questions" },
    ],
  },
];

export function Nav({ page, go, user, logout, theme, toggleTheme, features = {}, intakeCompleted = true }) {
  const { t, lang, setLang, rtl } = useLang();
  const [open, setOpen] = useState(null);      // desktop dropdown
  const [drawer, setDrawer] = useState(false); // mobile
  const navRef = useRef(null);

  const enabled = (it) => !it.flag || features[it.flag] !== false;

  // Close on outside click and on Escape — basic, and previously missing.
  useEffect(() => {
    const onDown = (e) => { if (navRef.current && !navRef.current.contains(e.target)) setOpen(null); };
    const onKey  = (e) => { if (e.key === "Escape") { setOpen(null); setDrawer(false); } };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, []);

  useEffect(() => { setDrawer(false); setOpen(null); }, [page]);
  // Don't let the page scroll behind an open drawer.
  useEffect(() => {
    document.body.style.overflow = drawer ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [drawer]);

  const nav = (id) => {
    if (user && user.role !== "admin" && !intakeCompleted) {
      return;
    }
    go(id);
    setOpen(null);
    setDrawer(false);
  };

  return (
    <>
      <header
        ref={navRef}
        className="sticky top-0 z-40 border-b border-paper-3/80 bg-paper/70 backdrop-blur-xl backdrop-saturate-150 dark:border-well-3/80 dark:bg-well/70"
      >
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-1 px-4 sm:px-6">
        {/* Wordmark: the § is the product's atom, so it is the mark. */}
        <button
          onClick={() => nav("home")}
          className={cx("flex items-center gap-2 rounded-card py-1 text-start", rtl ? "ms-2 ps-2" : "me-2 pe-2")}
          aria-label="Legal Rag Ai — home"
        >
          <Logo size={46} className="shrink-0" />
          <span className="hidden font-display text-[17px] font-semibold tracking-tight sm:block">
            Legal Rag Ai
          </span>
        </button>

        {/* Desktop groups */}
        <nav className="hidden items-center gap-0.5 lg:flex" aria-label="Main">
          {NAV_GROUPS.map((g) => {
            const items = g.items.filter(enabled);
            if (!items.length) return null;
            const active = items.some((i) => i.id === page);
            return (
              <div key={g.label} className="relative">
                <button
                  onClick={() => setOpen(open === g.label ? null : g.label)}
                  aria-expanded={open === g.label}
                  aria-haspopup="true"
                  className={cx(
                    "flex items-center gap-1 rounded-card px-2.5 py-1.5 text-[13px] transition-colors",
                    active || open === g.label
                      ? "text-ink dark:text-paper"
                      : "text-ink-3 hover:text-ink dark:hover:text-paper"
                  )}
                >
                  {t(g.key, g.label)}
                  <Icon n="dn" s={13} className={cx("transition-transform", open === g.label && "rotate-180")} />
                </button>

                {open === g.label && (
                  <div className="absolute start-0 top-full mt-1.5 w-[19rem] animate-rise rounded-card border border-paper-3 bg-white p-1.5 shadow-lift dark:border-well-3 dark:bg-well-2">
                    {items.map((it) => (
                      <button
                        key={it.id}
                        onClick={() => nav(it.id)}
                        className={cx(
                          "flex w-full items-start gap-2.5 rounded-[2px] px-2.5 py-2 text-start transition-colors",
                          page === it.id ? "bg-seal-tint dark:bg-seal/15" : "hover:bg-paper-2 dark:hover:bg-well-3"
                        )}
                      >
                        <Icon n={it.icon} s={15} className="mt-0.5 shrink-0 text-seal dark:text-seal-bright" />
                        <span>
                          <span className="block text-[13px] font-medium text-ink dark:text-paper">{t(it.k, it.label)}</span>
                          <span className="block text-[11.5px] text-ink-3">{t(it.k + ".d", it.desc)}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          {isAdmin(user) && (
            <button
              onClick={() => nav("admin")}
              className={cx(
                "rounded-card px-2.5 py-1.5 text-[13px] transition-colors",
                page === "admin" ? "text-ink dark:text-paper" : "text-ink-3 hover:text-ink dark:hover:text-paper"
              )}
            >
              {t("nav.admin", "Admin")}
            </button>
          )}
        </nav>

        <div className="flex-1" />

        {/* Interface language. Separate from the answer language in Chat — a
            user may want Urdu chrome with English answers, or the reverse. */}
        <button
          onClick={() => setLang(lang === "ur" ? "en" : "ur")}
          className="rounded-card px-2 py-1.5 text-[12px] text-ink-3 transition-colors hover:bg-paper-2 hover:text-ink dark:hover:bg-well-3 dark:hover:text-paper"
          aria-label={lang === "ur" ? "Switch interface to English" : "انٹرفیس اردو میں"}
        >
          <span className={lang === "ur" ? "" : "font-urdu"}>{lang === "ur" ? "EN" : "اردو"}</span>
        </button>

        <button
          onClick={toggleTheme}
          className="rounded-card p-2 text-ink-3 transition-colors hover:bg-paper-2 hover:text-ink dark:hover:bg-well-3 dark:hover:text-paper"
          aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
        >
          <Icon n={theme === "dark" ? "sun" : "moon"} s={16} />
        </button>

        {user ? (
          <div className="ms-1 flex items-center gap-2">
            <span className="hidden max-w-[9rem] truncate text-[12.5px] text-ink-3 sm:block">
              {user.full_name || user.email}
            </span>
            <Button variant="quiet" size="sm" onClick={logout}>
              <Icon n="out" s={14} /> <span className="hidden sm:inline">{t("nav.signout", "Sign out")}</span>
            </Button>
          </div>
        ) : (
          <Button size="sm" className="ms-1" onClick={() => nav("login")}>{t("nav.signin", "Sign in")}</Button>
        )}

        <button
          onClick={() => setDrawer(true)}
          className="ms-1 rounded-card p-2 text-ink-3 lg:hidden"
          aria-label="Open menu"
        >
          <Icon n="menu" s={18} />
        </button>
      </div>
      </header>

      {/* Mobile drawer */}
      {drawer && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={() => setDrawer(false)} />
          <div className="absolute end-0 top-0 h-full w-full sm:w-[20rem] animate-rise overflow-y-auto scroll-thin bg-paper p-4 dark:bg-well">
            <div className="mb-5 flex items-center justify-between border-b border-paper-3 pb-3 dark:border-well-3">
              <div className="flex items-center gap-2">
                <Logo size={42} className="shrink-0" />
                <span className="font-display text-[16px] font-semibold text-ink dark:text-paper">Legal Rag Ai</span>
              </div>
              <button onClick={() => setDrawer(false)} className="rounded-card p-2 text-ink-3 hover:bg-paper-2 hover:text-ink dark:hover:bg-well-3" aria-label={t("a.close", "Close menu")}>
                <Icon n="close" s={18} />
              </button>
            </div>
            {NAV_GROUPS.map((g) => {
              const items = g.items.filter(enabled);
              if (!items.length) return null;
              return (
                <div key={g.label} className="mb-4">
                  <p className="eyebrow mb-1.5">{t(g.key, g.label)}</p>
                  {items.map((it) => (
                    <button
                      key={it.id}
                      onClick={() => nav(it.id)}
                      className={cx(
                        "flex w-full items-center gap-2.5 rounded-card px-2.5 py-2.5 text-start",
                        page === it.id ? "bg-seal-tint dark:bg-seal/15" : ""
                      )}
                    >
                      <Icon n={it.icon} s={16} className="text-seal dark:text-seal-bright" />
                      <span className="text-[13.5px] text-ink dark:text-paper">{t(it.k, it.label)}</span>
                    </button>
                  ))}
                </div>
              );
            })}
            {isAdmin(user) && (
              <div className="mt-2 border-t border-paper-3 pt-2 dark:border-well-3">
                <button
                  onClick={() => nav("admin")}
                  className={cx(
                    "flex w-full items-center gap-2.5 rounded-card px-2.5 py-2.5 text-start text-[13.5px]",
                    page === "admin" ? "bg-seal-tint dark:bg-seal/15" : ""
                  )}
                >
                  <Icon n="shld" s={16} className="text-seal dark:text-seal-bright" />
                  <span className="text-ink dark:text-paper">{t("nav.admin", "Admin")}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

export default Nav;
