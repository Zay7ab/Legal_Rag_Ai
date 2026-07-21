import { useState } from "react";
import { Icon } from "../components/Icon";
import { Button, Input, Field, ErrorNote, cx } from "../components/ui";
import { apiPost, getGoogleIdToken, FIREBASE_READY } from "../lib/api";
import Logo from "../components/Logo";
import { useLang } from "../lib/i18n";

const saveTokens = (d) => {
  localStorage.setItem("access_token", d.access_token);
  localStorage.setItem("refresh_token", d.refresh_token);
};

export default function Auth({ mode, onOk, go }) {
  const isLogin = mode === "login";
  const [f, setF] = useState({ email: "", password: "", full_name: "" });
  const [load, setLoad] = useState(false);
  const [gLoad, setGLoad] = useState(false);
  const [err, setErr] = useState("");

  const { t, rtl } = useLang();

  // Google sign-in can require an emailed OTP as a second step.
  const [otpStep, setOtpStep] = useState(false);
  const [otpSession, setOtpSession] = useState("");
  const [emailHint, setEmailHint] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpLoad, setOtpLoad] = useState(false);

  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    if (!isLogin && f.password.length < 8) {
      setErr(t("auth.password_err", "Password must be at least 8 characters."));
      return;
    }
    setLoad(true);
    try {
      const d = await apiPost(isLogin ? "/api/auth/login" : "/api/auth/register", f);
      saveTokens(d);
      onOk(d.user);
    } catch (e) { setErr(e.message); }
    finally { setLoad(false); }
  };

  const googleLogin = async () => {
    setErr(""); setGLoad(true);
    try {
      const idToken = await getGoogleIdToken();
      const d = await apiPost("/api/auth/google", { id_token: idToken });
      if (d.requires_otp) { setOtpSession(d.otp_session); setEmailHint(d.email_hint); setOtpStep(true); }
      else { saveTokens(d); onOk(d.user); }
    } catch (e) { setErr(e.message); }
    finally { setGLoad(false); }
  };

  const verifyOtp = async (e) => {
    e.preventDefault(); setErr(""); setOtpLoad(true);
    try {
      const d = await apiPost("/api/auth/google/verify-otp", { otp_session: otpSession, code: otpCode });
      saveTokens(d); onOk(d.user);
    } catch (e) { setErr(e.message); }
    finally { setOtpLoad(false); }
  };

  /* ── OTP step ─────────────────────────────────────────────────────────── */
  if (otpStep) {
    return (
      <Shell title={t("auth.otp_title", "Check your email")} sub={<>{t("auth.otp_sub", "We sent a 6-digit code to:")} <strong className="text-ink dark:text-paper">{emailHint}</strong></>}>
        <form onSubmit={verifyOtp} className="space-y-4">
          <Field label={t("auth.verification_code", "Verification code")}>
            <Input
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              inputMode="numeric"
              autoComplete="one-time-code"
              autoFocus
              placeholder="000000"
              className="text-center font-mono text-[20px] tracking-[.5em]"
            />
          </Field>
          {err && <ErrorNote>{err}</ErrorNote>}
          <Button type="submit" size="lg" className="w-full" loading={otpLoad} disabled={otpCode.length !== 6}>
            {t("auth.verify_signin", "Verify and sign in")}
          </Button>
          <button type="button" onClick={() => { setOtpStep(false); setErr(""); }} className="w-full text-[12.5px] text-ink-3 hover:text-ink dark:hover:text-paper">
            {t("auth.different_method", "Use a different method")}
          </button>
        </form>
      </Shell>
    );
  }

  /* ── Sign in / Create account ─────────────────────────────────────────── */
  return (
    <Shell
      title={isLogin ? t("auth.signin", "Sign in") : t("auth.register", "Create an account")}
      sub={isLogin ? t("auth.signin_sub", "Your chats and documents stay on your account.") : t("auth.register_sub", "Free. Your legal questions stay private to you.")}
    >
      <form onSubmit={submit} className="space-y-4">
        {!isLogin && (
          <Field label={t("auth.fullname", "Full name")}>
            <Input value={f.full_name} onChange={set("full_name")} required autoComplete="name" placeholder="Ayesha Khan" />
          </Field>
        )}
        <Field label={t("auth.email", "Email")}>
          <Input type="email" value={f.email} onChange={set("email")} required autoComplete="email" placeholder="you@example.com" />
        </Field>
        <Field label={t("auth.password", "Password")} hint={!isLogin ? t("auth.password_hint", "At least 8 characters.") : undefined}>
          <Input
            type="password"
            value={f.password}
            onChange={set("password")}
            required
            autoComplete={isLogin ? "current-password" : "new-password"}
            placeholder="••••••••"
          />
        </Field>

        {err && <ErrorNote>{err}</ErrorNote>}

        <Button type="submit" size="lg" className="w-full" loading={load}>
          {isLogin ? t("auth.signin", "Sign in") : t("auth.create_account", "Create account")}
        </Button>
      </form>

      {FIREBASE_READY && (
        <>
          <div className="my-5 flex items-center gap-3">
            <span className="h-px flex-1 bg-paper-3 dark:bg-well-3" />
            <span className="eyebrow">{t("auth.or", "or")}</span>
            <span className="h-px flex-1 bg-paper-3 dark:bg-well-3" />
          </div>
          <button
            type="button"
            className="google-fancy-btn w-full"
            onClick={googleLogin}
            disabled={gLoad}
          >
            {gLoad ? (
              <span className="font-sans text-[14.5px] text-ink-3">Loading...</span>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid" viewBox="0 0 256 262" className="svg">
                  <path fill="#4285F4" d="M255.878 133.451c0-10.734-.871-18.567-2.756-26.69H130.55v48.448h71.947c-1.45 12.04-9.283 30.172-26.69 42.356l-.244 1.622 38.755 30.023 2.685.268c24.659-22.774 38.875-56.282 38.875-96.027" className="blue" />
                  <path fill="#34A853" d="M130.55 261.1c35.248 0 64.839-11.605 86.453-31.622l-41.196-31.913c-11.024 7.688-25.82 13.055-45.257 13.055-34.523 0-63.824-22.773-74.269-54.25l-1.531.13-40.298 31.187-.527 1.465C35.393 231.798 79.49 261.1 130.55 261.1" className="green" />
                  <path fill="#FBBC05" d="M56.281 156.37c-2.756-8.123-4.351-16.827-4.351-25.82 0-8.994 1.595-17.697 4.206-25.82l-.073-1.73L15.26 71.312l-1.335.635C5.077 89.644 0 109.517 0 130.55s5.077 40.905 13.925 58.602l42.356-32.782" className="yellow" />
                  <path fill="#EB4335" d="M130.55 50.479c24.514 0 41.05 10.589 50.479 19.438l36.844-35.974C195.245 12.91 165.798 0 130.55 0 79.49 0 35.393 29.301 13.925 71.947l42.211 32.783c10.59-31.477 39.891-54.251 74.414-54.251" className="red" />
                </svg>
                <span className="text">{t("auth.google", "Continue with Google")}</span>
              </>
            )}
          </button>
        </>
      )}

      <p className="mt-6 text-center text-[12.5px] text-ink-3">
        {isLogin ? t("auth.no_account", "No account yet? ") : t("auth.has_account", "Already have an account? ")}
        <button
          onClick={() => go(isLogin ? "register" : "login")}
          className="font-medium text-seal underline underline-offset-2 dark:text-seal-bright"
        >
          {isLogin ? t("auth.create_one", "Create one") : t("auth.signin", "Sign in")}
        </button>
      </p>
    </Shell>
  );
}

const Shell = ({ title, sub, children }) => (
  <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center px-4 py-12">
    <div className="w-full max-w-sm animate-rise">
      <div className="mb-7 text-center">
        <Logo size={44} className="mx-auto mb-4" />
        <h1 className="font-display text-[26px] font-normal leading-tight">{title}</h1>
        <p className="mt-1.5 text-[13px] text-ink-3">{sub}</p>
      </div>
      <div className="stamp p-6 sm:p-7">{children}</div>
    </div>
  </div>
);
