/* Chat sessions live in localStorage, namespaced per user so signing in as
   someone else on a shared machine doesn't surface the previous person's
   legal questions — which, for this subject matter, matters. */
export const sessionsKey = (uid) =>
  uid ? `legalai_chat_sessions_${uid}` : "legalai_chat_sessions_guest";

export const loadSessions = (uid) => {
  try { return JSON.parse(localStorage.getItem(sessionsKey(uid)) || "[]"); }
  catch { return []; }
};

export const saveSessions = (uid, s) => {
  try { localStorage.setItem(sessionsKey(uid), JSON.stringify(s.slice(0, 30))); }
  catch { /* quota exceeded or storage disabled — a lost history is not fatal */ }
};

export const newSession = () => ({
  id: Date.now().toString(),
  title: "New chat",
  ts: new Date().toLocaleString(),
  msgs: [],
  hist: [],
});
