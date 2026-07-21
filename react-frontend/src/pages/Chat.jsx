import { useState, useEffect, useRef, useCallback } from "react";
import { Icon } from "../components/Icon";
import Markdown from "../components/Markdown";
import CitationStrip from "../components/CitationStrip";
import { Button, Card, Empty, ErrorNote, cx } from "../components/ui";
import { BASE, apiFetch, apiPost, refreshAccessToken, readError, onSessionExpired } from "../lib/api";
import { loadSessions, saveSessions, newSession } from "../lib/sessions";
import { LANGS, SAMPLE_QUESTIONS } from "../lib/constants";
import { useLang } from "../lib/i18n";

export default function Chat({ user }) {
  const { t, rtl } = useLang();
  const uid = user?.id || null;
  const [sessions, setSessions] = useState(() => {
    const s = loadSessions(uid);
    return s.length ? s : [newSession()];
  });
  const [activeId, setActiveId] = useState(() => {
    const s = loadSessions(uid);
    return s.length ? s[0].id : null;
  });
  const [inp, setInp]   = useState("");
  const [load, setLoad] = useState(false);
  const [lang, setLang] = useState("en");
  const [err, setErr]   = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const [listening, setListening] = useState(false);
  const [intake, setIntake] = useState(null);

  useEffect(() => {
    if (user) {
      apiFetch("/api/intake")
        .then((res) => {
          if (res.completed && res.intake) {
            setIntake(res.intake);
          }
        })
        .catch(() => {});
    }
  }, [user]);

  const voiceSupported = useRef(
    typeof window !== "undefined" && !!(window.SpeechRecognition || window.webkitSpeechRecognition)
  ).current;
  const recogRef = useRef(null);
  const bottomRef = useRef(null);
  const taRef = useRef(null);

  const active = sessions.find((s) => s.id === activeId) || sessions[0];

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [active?.msgs, load]);
  useEffect(() => { saveSessions(uid, sessions); }, [uid, sessions]);

  const updateActive = useCallback((updater) => {
    setSessions((prev) => prev.map((s) => (s.id === activeId ? updater(s) : s)));
  }, [activeId]);

  /* ── Send ──────────────────────────────────────────────────────────────── */
  const send = useCallback(async (text) => {
    const t = (text ?? inp).trim();
    if (!t || load) return;
    setErr("");

    updateActive((s) => ({
      ...s,
      title: s.msgs.length === 0 ? t.slice(0, 40) + (t.length > 40 ? "…" : "") : s.title,
      msgs: [...s.msgs, { r: "user", c: t }],
      hist: [...s.hist, { role: "user", content: t }],
    }));
    setInp("");
    setLoad(true);

    // Placeholder so the answer streams into a stable slot.
    updateActive((s) => ({
      ...s,
      msgs: [...s.msgs, { r: "ai", c: "", s: [], rag: false, rating: null, streaming: true }],
    }));

    const acc = { text: "", sources: [], rag: false };

    try {
      const curHist = (sessions.find((s) => s.id === activeId) || active).hist.slice(-8);

      const doStream = (tok) =>
        fetch(BASE + "/api/chat/stream", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...(tok ? { Authorization: "Bearer " + tok } : {}) },
          body: JSON.stringify({ message: t, history: curHist, language: lang, session_id: active?.id, session_title: active?.title }),
        });

      let resp = await doStream(localStorage.getItem("access_token"));
      if (resp.status === 401 && localStorage.getItem("refresh_token")) {
        const fresh = await refreshAccessToken();
        if (fresh) resp = await doStream(fresh);
        else { onSessionExpired(); throw new Error("Your session expired. Sign in to continue."); }
      }
      if (!resp.ok) throw await readError(resp);

      const reader = resp.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      let streamErr = null;

      const handleFrame = (raw) => {
        const payload = raw
          .split("\n")
          .filter((l) => l.startsWith("data:"))
          .map((l) => l.slice(5).trimStart())
          .join("\n");
        if (!payload) return;
        let ev;
        try { ev = JSON.parse(payload); } catch { return; }

        if (ev.type === "meta") {
          acc.sources = ev.sources || [];
          acc.rag = !!ev.has_rag_context;
        } else if (ev.type === "chunk") {
          acc.text += ev.text;
          const snap = acc.text, srcs = acc.sources, rag = acc.rag;
          setSessions((prev) => prev.map((s) => {
            if (s.id !== activeId) return s;
            const msgs = [...s.msgs];
            msgs[msgs.length - 1] = { ...msgs[msgs.length - 1], c: snap, s: srcs, rag, streaming: true };
            return { ...s, msgs };
          }));
        } else if (ev.type === "error") {
          streamErr = ev.text;
        }
      };

      // Consume only COMPLETE frames; keep the partial tail for the next read.
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        let i;
        while ((i = buf.indexOf("\n\n")) !== -1) {
          handleFrame(buf.slice(0, i));
          buf = buf.slice(i + 2);
          if (streamErr) throw new Error(streamErr);
        }
      }
      buf += dec.decode();
      if (buf.trim()) handleFrame(buf.trim());
      if (streamErr) throw new Error(streamErr);

      const final = acc.text;
      setSessions((prev) => prev.map((s) => {
        if (s.id !== activeId) return s;
        const msgs = [...s.msgs];
        msgs[msgs.length - 1] = { ...msgs[msgs.length - 1], c: final, s: acc.sources, rag: acc.rag, streaming: false };
        return { ...s, msgs, hist: [...s.hist, { role: "assistant", content: final }] };
      }));
    } catch (e) {
      setErr(e.message || "Couldn't reach the server.");
      setSessions((prev) => prev.map((s) => {
        if (s.id !== activeId) return s;
        const msgs = [...s.msgs];
        if (msgs[msgs.length - 1]?.r === "ai" && !msgs[msgs.length - 1].c) msgs.pop();
        return { ...s, msgs };
      }));
    } finally {
      setLoad(false);
    }
  }, [inp, load, sessions, activeId, active, lang, updateActive]);

  const handoffDone = useRef(false);
  useEffect(() => {
    if (handoffDone.current) return;
    handoffDone.current = true;
    let pending = null;
    try {
      pending = sessionStorage.getItem("pending_question");
      sessionStorage.removeItem("pending_question");
    } catch { /* private mode */ }
    if (pending) send(pending);
  }, [send]);

  const rate = (idx, rating) => {
    const cur = active?.msgs?.[idx];
    if (!cur) return;
    const next = cur.rating === rating ? null : rating;
    updateActive((s) => ({ ...s, msgs: s.msgs.map((m, i) => (i === idx ? { ...m, rating: next } : m)) }));
    if (!next) return;

    const question = [...(active.msgs || [])].slice(0, idx).reverse().find((m) => m.r === "user")?.c || "";
    apiPost("/api/feedback/", {
      rating: next === "up" ? 1 : -1,
      question,
      answer: cur.c || "",
      sources: cur.s || [],
      has_rag_context: !!cur.rag,
      language: lang,
      session_id: activeId ? String(activeId) : null,
    }).catch(() => {});
  };

  const toggleVoice = () => {
    if (!voiceSupported) return;
    if (listening) { recogRef.current?.stop(); setListening(false); return; }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const r = new SR();
    r.lang = lang === "ur" ? "ur-PK" : "en-PK";
    r.interimResults = false;
    r.onresult = (e) => setInp(e.results[0][0].transcript);
    r.onerror = () => { setListening(false); setErr("Couldn't hear that. Check microphone access and try again."); };
    r.onend = () => setListening(false);
    recogRef.current = r;
    r.start();
    setListening(true);
  };
  useEffect(() => () => { try { recogRef.current?.stop(); } catch {} }, []);

  const createSession = () => { const s = newSession(); setSessions((p) => [s, ...p]); setActiveId(s.id); setShowHistory(false); };
  const deleteSession = (id) => {
    setSessions((prev) => {
      const next = prev.filter((s) => s.id !== id);
      if (!next.length) { const ns = newSession(); setActiveId(ns.id); return [ns]; }
      if (id === activeId) setActiveId(next[0].id);
      return next;
    });
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  };

  return (
    <div className="mx-auto flex h-[calc(100vh-3.5rem)] max-w-7xl">
      {/* ── History rail ──────────────────────────────────────────────────── */}
      <aside
        className={cx(
          "w-64 shrink-0 border-r border-paper-3 dark:border-well-3",
          "hidden lg:flex lg:flex-col",
          showHistory && "!flex fixed inset-y-0 start-0 z-50 bg-paper dark:bg-well lg:relative"
        )}
      >
        <div className="flex items-center justify-between p-3">
          <span className="eyebrow">{t("chat.yours", "Your chats")}</span>
          <button onClick={createSession} className="rounded-card p-1.5 text-ink-3 hover:bg-paper-2 hover:text-ink dark:hover:bg-well-3" aria-label={t("chat.new", "New chat")}>
            <Icon n="plus" s={15} />
          </button>
        </div>
        <div className="flex-1 space-y-0.5 overflow-y-auto scroll-thin px-2 pb-3">
          {sessions.map((s) => (
            <div
              key={s.id}
              className={cx(
                "group flex items-center gap-1 rounded-card px-2.5 py-2 transition-colors",
                s.id === activeId ? "bg-seal-tint dark:bg-seal/15" : "hover:bg-paper-2 dark:hover:bg-well-3"
              )}
            >
              <button onClick={() => { setActiveId(s.id); setShowHistory(false); }} className="min-w-0 flex-1 text-start">
                <span className="block truncate text-[12.5px] text-ink dark:text-paper">{s.title}</span>
                <span className="block truncate text-[10.5px] text-ink-3">{s.ts}</span>
              </button>
              <button
                onClick={() => deleteSession(s.id)}
                className="shrink-0 rounded p-1 text-ink-3 opacity-0 transition-opacity hover:text-tape focus-visible:opacity-100 group-hover:opacity-100"
                aria-label={`${t("chat.delete_label", "Delete chat")}: ${s.title}`}
              >
                <Icon n="trash" s={12} />
              </button>
            </div>
          ))}
        </div>
      </aside>
      {showHistory && <div className="fixed inset-0 z-40 bg-ink/40 lg:hidden" onClick={() => setShowHistory(false)} />}

      {/* ── Conversation ──────────────────────────────────────────────────── */}
      <div className="flex min-w-0 flex-1 flex-col relative overflow-hidden bg-white/30 dark:bg-well-2/30 backdrop-blur-md">
        {/* Animated background logo/watermark */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.70] dark:opacity-[0.35] z-0 overflow-hidden">
          <div className="chat-bg-loader">
            <div className="loader">
              <svg width={100} height={100} viewBox="0 0 100 100">
                <defs>
                  <mask id="clipping">
                    <polygon points="0,0 100,0 100,100 0,100" fill="black" />
                    <polygon points="25,25 75,25 50,75" fill="white" />
                    <polygon points="50,25 75,75 25,75" fill="white" />
                    <polygon points="35,35 65,35 50,65" fill="white" />
                    <polygon points="35,35 65,35 50,65" fill="white" />
                    <polygon points="35,35 65,35 50,65" fill="white" />
                    <polygon points="35,35 65,35 50,65" fill="white" />
                  </mask>
                </defs>
              </svg>
              <div className="box" />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 border-b border-paper-3 px-4 py-2 dark:border-well-3 relative z-10 bg-white/20 dark:bg-well-2/20 backdrop-blur-sm">
          <button onClick={() => setShowHistory(true)} className="rounded-card p-1.5 text-ink-3 lg:hidden" aria-label={t("chat.show_chats", "Show chats")}>
            <Icon n="hist" s={16} />
          </button>
          <p className="min-w-0 flex-1 truncate font-display text-[15px] font-medium">{active?.title}</p>

          <div className="flex rounded-card border border-paper-3 p-0.5 dark:border-well-3" role="group" aria-label={t("chat.ans_lang", "Answer language")}>
            {LANGS.map((l) => (
              <button
                key={l.id}
                onClick={() => setLang(l.id)}
                aria-pressed={lang === l.id}
                className={cx(
                  "rounded-[2px] px-2.5 py-1 text-[12px] transition-colors",
                  lang === l.id ? "bg-seal text-white" : "text-ink-3 hover:text-ink dark:hover:text-paper",
                  l.id === "ur" && "font-urdu"
                )}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto scroll-thin px-4 py-6 relative z-10">
          <div className="mx-auto max-w-[760px] w-full flex flex-col gap-5">
            {!active?.msgs?.length && (
              <div className="flex flex-col gap-8 w-full items-center my-auto justify-center min-h-[50vh]">
                <Empty title={t("chat.empty_title", "What happened?")}>
                  {t("chat.empty_body", "Describe your situation in your own words — English or Urdu. Legal Rag Ai will tell you which law applies, and say so plainly when it can't find one.")}
                </Empty>
                
                <div className="w-full max-w-xl text-center">
                  <p className="eyebrow mb-3.5">{t("home.samples", "Or start from a real one")}</p>
                  <div className="grid gap-2.5 grid-cols-1 sm:grid-cols-2">
                    {SAMPLE_QUESTIONS.map((s, idx) => (
                      <button
                        key={idx}
                        onClick={() => send(t(`sample.q${idx + 1}`, s.q))}
                        className="group flex items-center gap-3 rounded-card border border-paper-3 bg-white/40 backdrop-blur-md px-3.5 py-2.5 text-start text-[12.5px] text-ink-2 transition-all hover:border-seal hover:bg-white/80 hover:text-ink dark:border-well-3 dark:bg-well-2/40 dark:backdrop-blur-md dark:text-paper-2 dark:hover:border-seal-bright dark:hover:bg-well-2/80 hover:-translate-y-0.5 hover:shadow-lift"
                      >
                        <span className="font-mono text-2xs uppercase tracking-wider text-ink-3 group-hover:text-seal dark:group-hover:text-seal-bright shrink-0">{t(`sample.tag${idx + 1}`, s.tag)}</span>
                        <span className="truncate">{t(`sample.q${idx + 1}`, s.q)}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {active?.msgs?.map((m, i) =>
              m.r === "user" ? (
                <div key={i} className="flex justify-end w-full animate-rise">
                  <div className="max-w-[85%] rounded-card bg-seal/75 backdrop-blur-sm border border-seal/20 px-3.5 py-2.5 text-[14px] leading-relaxed text-white shadow-seal">
                    {m.c}
                  </div>
                </div>
              ) : (
                <div key={i} className="flex justify-start w-full animate-rise">
                  <div className="max-w-[90%] w-full">
                    <Card stamp glass className="p-4 shadow-lift sm:p-5 w-full break-words">
                      {m.c ? (
                        <Markdown content={m.c} lang={lang} />
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-[13px] text-ink-3">
                          {t("chat.reading", "Reading the law")}
                          <span className="animate-caret">▍</span>
                        </span>
                      )}

                      {!m.streaming && m.c && <CitationStrip sources={m.s} grounded={m.rag} />}

                      {!m.streaming && m.c && (
                        <div className="mt-3 flex items-center gap-1">
                          <span className="eyebrow me-1">{t("g.useful", "Was this useful?")}</span>
                          {[["up", "tup"], ["down", "tdn"]].map(([k, ic]) => (
                            <button
                              key={k}
                              onClick={() => rate(i, k)}
                              aria-pressed={m.rating === k}
                              aria-label={k === "up" ? t("chat.yes_useful", "Yes, useful") : t("chat.no_useful", "No, not useful")}
                              className={cx(
                                "rounded p-1.5 transition-colors",
                                m.rating === k
                                  ? (k === "up" ? "text-seal dark:text-seal-bright" : "text-tape")
                                  : "text-ink-3 hover:text-ink dark:hover:text-paper"
                              )}
                            >
                              <Icon n={ic} s={13} />
                            </button>
                          ))}
                          <button
                            onClick={() => navigator.clipboard?.writeText(m.c)}
                            className="ms-auto rounded p-1.5 text-ink-3 transition-colors hover:text-ink dark:hover:text-paper"
                            aria-label={t("chat.copy_answer", "Copy answer")}
                          >
                            <Icon n="copy" s={13} />
                          </button>
                        </div>
                      )}
                    </Card>
                  </div>
                </div>
              )
            )}

            {err && <ErrorNote>{err}</ErrorNote>}
            <div ref={bottomRef} />
          </div>
        </div>

        {/* ── Composer ────────────────────────────────────────────────────── */}
        <div className="border-t border-paper-3 px-4 py-3 dark:border-well-3 relative z-10 bg-white/20 dark:bg-well-2/20 backdrop-blur-sm">
          <div className="mx-auto max-w-2xl">
            <div className="flex items-end gap-2 rounded-card border border-paper-3 bg-white p-2 transition-colors focus-within:border-seal dark:border-well-3 dark:bg-well-2 dark:focus-within:border-seal-bright">
              <textarea
                ref={taRef}
                rows={1}
                value={inp}
                onChange={(e) => {
                  setInp(e.target.value);
                  e.target.style.height = "auto";
                  e.target.style.height = Math.min(e.target.scrollHeight, 160) + "px";
                }}
                onKeyDown={onKeyDown}
                placeholder={lang === "ur" ? t("chat.placeholder_ur", "اپنا سوال لکھیں…") : t("chat.placeholder_en", "Describe what happened…")}
                aria-label={t("chat.empty_title", "Your question")}
                dir={lang === "ur" ? "rtl" : "ltr"}
                className={cx(
                  "max-h-40 flex-1 resize-none bg-transparent px-1.5 py-2 text-[14px] leading-relaxed outline-none scroll-thin placeholder:text-ink-3/60",
                  lang === "ur" && "font-urdu leading-[1.75]"
                )}
              />
              {voiceSupported && (
                <button
                  onClick={toggleVoice}
                  aria-label={listening ? t("chat.stop_listening", "Stop listening") : t("chat.start_listening", "Ask by voice")}
                  aria-pressed={listening}
                  className={cx(
                    "shrink-0 rounded-card p-2 transition-colors",
                    listening ? "bg-tape text-white" : "text-ink-3 hover:bg-paper-2 hover:text-ink dark:hover:bg-well-3"
                  )}
                >
                  <Icon n={listening ? "micoff" : "mic"} s={16} />
                </button>
              )}
              <Button onClick={() => send()} loading={load} disabled={!inp.trim()} className="shrink-0" aria-label={t("chat.send_question", "Send question")}>
                {!load && <Icon n="send" s={14} />}
              </Button>
            </div>
            <p className="mt-1.5 text-center text-[11px] text-ink-3">
              {t("chat.disclaimer", "Information, not legal advice. Check the source line under each answer.")}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
