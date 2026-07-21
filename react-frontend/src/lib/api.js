// API layer + auth/session plumbing, extracted from App.jsx.
// See the API LAYER comment block below for why token refresh lives here.

export const BASE = "";

// Single source of truth for the admin check in the UI. Mirrors the backend
// guard (role only). This is a convenience for hiding nav links -- it is NOT a
// security boundary; every /api/admin/* route is enforced server-side by
// require_admin(). Previously this also compared against a hardcoded email,
// duplicated in 4 places and out of sync with the backend.
export const isAdmin = (user) => user?.role === "admin";

// Firebase config is injected at build time from REACT_APP_FIREBASE_* env vars
// (see react-frontend/.env.example). The previous hardcoded values were a live
// project's credentials committed to git.
//
// Note: Firebase web API keys are public by design -- they ship in the bundle no
// matter what, and are identifiers rather than secrets. Moving them to env vars
// does NOT hide them. The real reasons to do it: each deployment can point at its
// own Firebase project, and a key can be rotated without a code change. Actual
// protection must come from the Firebase Console:
//   Authentication > Settings > Authorised domains
//   GCP > Credentials > API key > HTTP referrer restrictions
export const FIREBASE_CFG = {
  apiKey:            process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain:        process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId:         process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket:     process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId:             process.env.REACT_APP_FIREBASE_APP_ID,
  measurementId:     process.env.REACT_APP_FIREBASE_MEASUREMENT_ID,
};

// Previously hardcoded `true`, so the Google button rendered and then blew up
// with an opaque Firebase error when unconfigured. Now it reflects reality and
// the UI can hide the button instead.
export const FIREBASE_READY = Boolean(
  FIREBASE_CFG.apiKey && FIREBASE_CFG.authDomain && FIREBASE_CFG.appId
);

let _fbApp = null;
export async function getGoogleIdToken() {
  if (!FIREBASE_READY) {
    throw new Error(
      "Google Sign-In is not configured. Set REACT_APP_FIREBASE_* in react-frontend/.env"
    );
  }
  const { initializeApp, getApps } = await import("firebase/app");
  const { getAuth, GoogleAuthProvider, signInWithPopup } = await import("firebase/auth");
  if (!_fbApp) {
    _fbApp = getApps().length ? getApps()[0] : initializeApp(FIREBASE_CFG);
  }
  const auth = getAuth(_fbApp);
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  const result = await signInWithPopup(auth, provider);
  return result.user.getIdToken();
}
// ══════════════════════════════════════════════════════════════════════════════
// API LAYER
//
// One core request() with transparent access-token refresh.
//
// Why this exists: the app stored `refresh_token` at login but never used it.
// The axios refresh interceptor lived in src/api/client.js, which nothing
// imports (App.jsx is the only entrypoint). So access tokens silently died
// after ACCESS_TOKEN_EXPIRE_MINUTES (60) and every subsequent call failed with
// "Not authenticated" while a valid 30-day refresh token sat unused.
//
// Also: the old helpers did `(await r.json()).detail`, which throws its own
// SyntaxError when the body isn't JSON (nginx 502, empty 401) — masking the
// real failure behind "Unexpected token < in JSON".
// ══════════════════════════════════════════════════════════════════════════════

export const AUTH_EVENT = "legalai:session-expired";

// Parse an error body defensively: it may be JSON, HTML, or empty.
export const readError = async (r) => {
  let detail = `Request failed (HTTP ${r.status})`;
  try {
    const text = await r.text();
    if (text) {
      try { detail = JSON.parse(text).detail || detail; }
      catch { if (text.length < 300) detail = text; }
    }
  } catch { /* unreadable body — keep the status message */ }
  const err = new Error(detail);
  err.status = r.status;
  return err;
};

// Single-flight refresh: if 5 requests 401 at once we must not fire 5 refreshes
// (they'd race, and rotating servers would invalidate each other's tokens).
// Everyone awaits the same in-flight promise.
let _refreshing = null;

export const refreshAccessToken = async () => {
  const refresh_token = localStorage.getItem("refresh_token");
  if (!refresh_token) return null;
  if (_refreshing) return _refreshing;

  _refreshing = (async () => {
    try {
      const r = await fetch(BASE + "/api/auth/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token }),
      });
      if (!r.ok) return null;
      const d = await r.json();
      if (!d?.access_token) return null;
      localStorage.setItem("access_token", d.access_token);
      if (d.refresh_token) localStorage.setItem("refresh_token", d.refresh_token);
      return d.access_token;
    } catch { return null; }
    finally { _refreshing = null; }
  })();

  return _refreshing;
};

// Remove ONLY auth keys. localStorage.clear() would also wipe the user's saved
// chat sessions (legalai_chat_sessions_*), theme and disclaimer acceptance.
export const clearAuthStorage = () => {
  try {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
  } catch { /* storage disabled */ }
};

export const onSessionExpired = () => {
  // Remember where the user was so they can be returned there after re-login,
  // instead of being dumped on the home page with no explanation.
  try {
    localStorage.setItem("post_login_redirect", window.location.hash || "");
  } catch { /* storage disabled */ }
  clearAuthStorage();
  window.dispatchEvent(new CustomEvent(AUTH_EVENT));
};

/**
 * Core request. Handles auth headers, one transparent refresh+retry on 401,
 * and typed errors carrying .status.
 * @param {"json"|"blob"} parse
 */
export const request = async (path, { method = "GET", body, parse = "json", _retried = false } = {}) => {
  const token = localStorage.getItem("access_token");
  const r = await fetch(BASE + path, {
    method,
    headers: {
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: "Bearer " + token } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });

  if (r.status === 401 && !_retried && localStorage.getItem("refresh_token")) {
    const fresh = await refreshAccessToken();
    if (fresh) return request(path, { method, body, parse, _retried: true });
    onSessionExpired();
    const err = new Error("Your session has expired. Please sign in again.");
    err.status = 401;
    throw err;
  }

  if (!r.ok) throw await readError(r);
  if (parse === "blob") return r.blob();
  if (r.status === 204) return null;
  return r.json();
};

export const apiFetch  = (path)       => request(path);
export const apiPost   = (path, body) => request(path, { method: "POST",   body });
export const apiPut    = (path, body) => request(path, { method: "PUT",    body });
export const apiPatch  = (path, body) => request(path, { method: "PATCH",  body });
export const apiDelete = (path)       => request(path, { method: "DELETE" });
export const apiBlob   = (path, body) => request(path, { method: "POST", body, parse: "blob" });
