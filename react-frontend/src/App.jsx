import { useState, useEffect, lazy, Suspense } from "react";

import Nav from "./components/Nav";
import DisclaimerModal from "./components/DisclaimerModal";
import BackgroundAnimation from "./components/BackgroundAnimation";
import { Icon } from "./components/Icon";
import { Spinner } from "./components/ui";
import { apiFetch, clearAuthStorage, AUTH_EVENT } from "./lib/api";

import Home from "./pages/Home";

/* Route-level code splitting. Home + the shell are what a first-time visitor
   needs; the other 15 pages shouldn't be in that download. The old build
   shipped all 16 in one 2,674-line bundle. */
const Chat      = lazy(() => import("./pages/Chat"));
const Search    = lazy(() => import("./pages/Search"));
const Statutes  = lazy(() => import("./pages/Statutes"));
const Docs      = lazy(() => import("./pages/Docs"));
const Auth      = lazy(() => import("./pages/Auth"));
const Rights    = lazy(() => import("./pages/Rights"));
const FAQ       = lazy(() => import("./pages/FAQ"));
const Glossary  = lazy(() => import("./pages/Glossary"));
const Penalty   = lazy(() => import("./pages/Penalty"));
const Finder    = lazy(() => import("./pages/Finder"));
const Scanner   = lazy(() => import("./pages/Scanner"));
const Booking   = lazy(() => import("./pages/Booking"));
const CaseTrack = lazy(() => import("./pages/CaseTrack"));
const News      = lazy(() => import("./pages/News"));
const Admin     = lazy(() => import("./pages/Admin"));
const Intake    = lazy(() => import("./pages/Intake"));

const PageLoader = () => (
  <div className="flex min-h-[60vh] items-center justify-center text-ink-3">
    <Spinner className="h-5 w-5" />
  </div>
);

export default function App() {
  const [page, setPage]   = useState("home");
  const [user, setUser]   = useState(null);
  const [intakeCompleted, setIntakeCompleted] = useState(true);

  useEffect(() => {
    if (user && user.role !== "admin") {
      apiFetch("/api/intake")
        .then((data) => {
          setIntakeCompleted(data.completed);
          if (!data.completed) {
            setPage("intake");
          }
        })
        .catch((e) => {
          console.error("Biography check failed:", e);
          alert("Biography check failed: " + e.message);
        });
    } else {
      setIntakeCompleted(true);
    }
  }, [user]);
  const [theme, setTheme] = useState(() => localStorage.getItem("theme") || "light");
  const [features, setFeatures] = useState({});
  const [sessionMsg, setSessionMsg] = useState("");
  const [showDisclaimer, setShowDisclaimer] = useState(
    () => !localStorage.getItem("disclaimer_accepted")
  );

  // Tailwind darkMode:"class" — the class on <html> is the single switch.
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("theme", theme);
  }, [theme]);

  useEffect(() => { apiFetch("/api/features").then(setFeatures).catch(() => {}); }, []);

  // Restore the session. apiFetch refreshes an expired access token
  // transparently, so this only fails if the refresh token is gone too.
  useEffect(() => {
    if (!localStorage.getItem("access_token")) return;
    apiFetch("/api/auth/me").then(setUser).catch(() => clearAuthStorage());
  }, []);

  // Session expiry is raised from the API layer, which has no React context.
  useEffect(() => {
    const onExpired = () => {
      setUser(null);
      setSessionMsg("Your session expired. Sign in to continue.");
      setPage("login");
    };
    window.addEventListener(AUTH_EVENT, onExpired);
    return () => window.removeEventListener(AUTH_EVENT, onExpired);
  }, []);

  useEffect(() => {
    if (!sessionMsg) return;
    const t = setTimeout(() => setSessionMsg(""), 8000);
    return () => clearTimeout(t);
  }, [sessionMsg]);

  useEffect(() => { window.scrollTo(0, 0); }, [page]);

  const acceptDisclaimer = () => {
    localStorage.setItem("disclaimer_accepted", "1");
    setShowDisclaimer(false);
  };

  const logout = () => {
    // Only auth keys. localStorage.clear() would also destroy saved chats,
    // theme and disclaimer state — which is what the old build did.
    clearAuthStorage();
    setUser(null);
    setPage("home");
  };

  const onAuth = (u) => {
    setUser(u);
    setSessionMsg("");
    let dest = "home";
    try {
      const saved = localStorage.getItem("post_login_redirect");
      if (saved) { dest = saved.replace(/^#\/?/, "") || "home"; localStorage.removeItem("post_login_redirect"); }
    } catch { /* storage disabled */ }
    setPage(dest);
  };

  const activePage = (user && user.role !== "admin" && !intakeCompleted) ? "intake" : page;

  return (
    <div className="min-h-screen text-ink dark:text-paper">
      {/* Full-viewport background texture. Uses the public asset and a real
          fixed layer (not body background-attachment:fixed, which is broken on
          mobile). bg-cover keeps it full-bleed; blend + opacity keep it a subtle
          texture over the gradient. Swap bg-cover -> bg-contain to show the
          whole image letterboxed instead of filling the screen. */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-10 bg-cover bg-center bg-no-repeat opacity-20 mix-blend-overlay dark:opacity-[0.14] dark:mix-blend-soft-light"
        style={{ backgroundImage: "url('/bg.jpg')" }}
      />
      <BackgroundAnimation />
      {showDisclaimer && <DisclaimerModal onAccept={acceptDisclaimer} />}

      {sessionMsg && (
        <div
          role="status"
          className="fixed left-1/2 top-4 z-[70] flex -translate-x-1/2 items-center gap-2.5 rounded-card border border-paper-3 bg-white px-4 py-2.5 text-[12.5px] shadow-lift dark:border-well-3 dark:bg-well-2"
        >
          <Icon n="warn" s={14} className="text-tape" />
          {sessionMsg}
          <button onClick={() => setSessionMsg("")} className="text-ink-3 hover:text-ink" aria-label="Dismiss">
            <Icon n="close" s={13} />
          </button>
        </div>
      )}

      <Nav
        page={activePage} go={setPage} user={user} logout={logout}
        theme={theme} toggleTheme={() => setTheme(theme === "dark" ? "light" : "dark")}
        features={features}
        intakeCompleted={intakeCompleted}
      />

      <main>
        <Suspense fallback={<PageLoader />}>
          {activePage === "home"     && <Home go={setPage} />}
          {activePage === "chat"     && <Chat user={user} go={setPage} />}
          {activePage === "search"   && <Search />}
          {activePage === "statutes" && <Statutes />}
          {activePage === "docs"     && <Docs />}
          {activePage === "rights"   && <Rights />}
          {activePage === "faq"      && <FAQ go={setPage} />}
          {activePage === "glossary" && <Glossary />}
          {activePage === "penalty"  && <Penalty />}
          {activePage === "finder"   && <Finder go={setPage} />}
          {activePage === "scanner"  && <Scanner />}
          {activePage === "booking"  && <Booking />}
          {activePage === "casetrack"&& <CaseTrack />}
          {activePage === "news"     && <News />}
          {activePage === "admin"    && <Admin user={user} />}
          {activePage === "intake"   && <Intake user={user} onComplete={(success) => { setIntakeCompleted(success); setPage("home"); }} />}
          {activePage === "login"    && <Auth mode="login"    onOk={onAuth} go={setPage} />}
          {activePage === "register" && <Auth mode="register" onOk={onAuth} go={setPage} />}
        </Suspense>
      </main>
    </div>
  );
}
