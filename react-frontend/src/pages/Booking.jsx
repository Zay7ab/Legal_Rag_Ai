import { useState, useEffect } from "react";
import { Icon } from "../components/Icon";
import { Button, Card, Input, Select, Textarea, Field, Badge, Empty, ErrorNote, cx } from "../components/ui";
import { apiFetch, apiPost, apiDelete } from "../lib/api";
import { useLang } from "../lib/i18n";

const KEY = "legalai_consult_requests";
const load = () => { try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; } };
const save = (r) => { try { localStorage.setItem(KEY, JSON.stringify(r.slice(0, 20))); } catch {} };
// Signed-in users get their drafts synced to their account (survives device changes);
// guests keep them on this device only. Either way the request is still sent by hand.
const isLoggedIn = () => !!localStorage.getItem("access_token");

const MODES = ["In person", "Phone", "Video"];
const blank = { lawyerId: "", date: "", time: "", mode: "In person", matter: "" };

export default function Booking() {
  const [lawyers, setLawyers] = useState([]);
  const [reqs, setReqs] = useState(load);
  const [f, setF] = useState(blank);
  const [err, setErr] = useState("");
  const [justSaved, setJustSaved] = useState(null);

  const { t, rtl } = useLang();

  useEffect(() => {
    apiFetch("/api/lawyers")
      .then((d) => setLawyers(Array.isArray(d) ? d : d.lawyers || []))
      .catch(() => {});
    // Pull any requests saved to the account. Falls back to whatever is on the
    // device if the call fails or the user is a guest.
    if (isLoggedIn()) {
      apiFetch("/api/bookings")
        .then((d) => { if (Array.isArray(d)) setReqs(d); })
        .catch(() => {});
    }
  }, []);
  // Only cache locally for guests; signed-in users are the server's source of truth.
  useEffect(() => { if (!isLoggedIn()) save(reqs); }, [reqs]);

  const lawyer = lawyers.find((l) => String(l.id) === String(f.lawyerId));

  const submit = (e) => {
    e.preventDefault();
    setErr("");
    if (!f.lawyerId) { setErr(t("booking.err_lawyer", "Choose a lawyer first.")); return; }
    if (!f.date)     { setErr(t("booking.err_date", "Pick a date you'd like to meet.")); return; }
    if (!f.matter.trim()) { setErr(t("booking.err_matter", "Say briefly what the matter is about.")); return; }
    const rec = {
      ...f,
      id: Date.now().toString(),
      lawyerName: lawyer?.name || "—",
      created: new Date().toISOString(),
    };
    setReqs((r) => [rec, ...r]);
    setJustSaved(rec);
    setF(blank);

    // Sync to the account when signed in. If it fails we keep the local copy,
    // so the draft is never lost.
    if (isLoggedIn()) {
      apiPost("/api/bookings", {
        lawyerId: lawyer?.id ?? null,
        lawyerName: rec.lawyerName,
        date: rec.date, time: rec.time, mode: rec.mode, matter: rec.matter,
      })
        .then((saved) => {
          if (saved && saved.id != null) {
            setReqs((r) => r.map((x) => (x.id === rec.id ? saved : x)));
            setJustSaved((js) => (js && js.id === rec.id ? saved : js));
          }
        })
        .catch(() => {});
    }
  };

  const draftMessage = (r) => {
    if (rtl) {
      return `السلام علیکم ${r.lawyerName}،\n\nمیں آپ سے مشاورت کے لیے وقت لینا چاہتا/چاہتی ہوں۔\n\n` +
      `پسندیدہ تاریخ: ${r.date}${r.time ? ` بوقت ${r.time}` : ""}\nطریقہ کار: ${t(r.mode, r.mode)}\n\n` +
      `معاملہ: ${r.matter}\n\nبرائے مہربانی بتائیں کہ کیا یہ وقت آپ کے لیے مناسب ہے؟\n\nشکریہ۔`;
    }
    return `Assalam-o-Alaikum ${r.lawyerName},\n\nI'd like to request a consultation.\n\n` +
    `Preferred date: ${r.date}${r.time ? ` at ${r.time}` : ""}\nFormat: ${r.mode}\n\n` +
    `Matter: ${r.matter}\n\nPlease let me know if this suits you.\n\nThank you.`;
  };

  return (
    <div className="mx-auto max-w-3xl animate-rise px-4 py-10 sm:px-6">
      <p className="eyebrow mb-3">{t("page.booking", "Consultations")}</p>
      <h1 className="font-display text-[30px] font-normal leading-tight">{t("booking.title", "Request a consultation")}</h1>
      <p className="mt-2 max-w-xl text-[14px] leading-relaxed text-ink-2 dark:text-paper-2/80">
        {t("booking.subtitle", "Draft your request here, then send it to the lawyer directly.")}
      </p>

      <div className="mt-4 flex items-start gap-2 rounded-card border border-tape/30 bg-tape-tint/50 px-3.5 py-2.5 dark:bg-tape/10">
        <Icon n="warn" s={14} className="mt-0.5 shrink-0 text-tape" />
        <p className="text-[12.5px] leading-relaxed text-tape">
          <strong>{t("booking.nothing_booked_title", "Nothing is booked from this page.")}</strong>{" "}
          {t("booking.nothing_booked_desc", "Legal Rag Ai has no connection to lawyers' calendars. This drafts a request and saves it on your device — you send it yourself using the contact details shown. If the matter is urgent, phone them.")}
        </p>
      </div>

      <Card stamp className="mt-6 p-5 sm:p-6">
        <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field label={t("finder.lawyer", "Lawyer")} required>
              <Select value={f.lawyerId} onChange={(e) => setF({ ...f, lawyerId: e.target.value })}>
                <option value="">{t("booking.choose_lawyer", "Choose a lawyer…")}</option>
                {lawyers.map((l) => (
                  <option key={l.id} value={l.id}>{l.name} — {t(l.area, l.area)}, {t(l.city, l.city)}</option>
                ))}
              </Select>
            </Field>
          </div>

          <Field label={t("booking.date", "Preferred date")} required>
            <Input type="date" value={f.date} min={new Date().toISOString().slice(0, 10)} onChange={(e) => setF({ ...f, date: e.target.value })} />
          </Field>
          <Field label={t("booking.time", "Preferred time")}>
            <Input type="time" value={f.time} onChange={(e) => setF({ ...f, time: e.target.value })} />
          </Field>

          <div className="sm:col-span-2">
            <Field label={t("booking.meet_format", "How would you like to meet?")}>
              <div className="flex gap-1.5">
                {MODES.map((m) => (
                  <button
                    key={m} type="button"
                    onClick={() => setF({ ...f, mode: m })}
                    aria-pressed={f.mode === m}
                    className={cx(
                      "rounded-card border px-3 py-1.5 text-[12.5px] transition-colors",
                      f.mode === m
                        ? "border-seal bg-seal-tint text-seal dark:border-seal-bright dark:bg-seal/15 dark:text-seal-bright"
                        : "border-paper-3 text-ink-3 hover:border-ink-3/50 dark:border-well-3"
                    )}
                  >
                    {t(m, m)}
                  </button>
                ))}
              </div>
            </Field>
          </div>

          <div className="sm:col-span-2">
            <Field label={t("booking.matter", "What's the matter about?")} required hint={t("booking.matter_hint", "A sentence or two is enough.")}>
              <Textarea rows={3} value={f.matter} onChange={(e) => setF({ ...f, matter: e.target.value })} placeholder={t("booking.matter_placeholder", "e.g. Landlord is trying to evict me without notice.")} />
            </Field>
          </div>

          {err && <div className="sm:col-span-2"><ErrorNote>{err}</ErrorNote></div>}

          <div className="sm:col-span-2">
            <Button type="submit" size="lg">{t("booking.draft_btn", "Draft this request")}</Button>
          </div>
        </form>
      </Card>

      {justSaved && (
        <Card className="mt-4 animate-rise p-5">
          <p className="eyebrow mb-3">{t("booking.request_title", "Your request — send it yourself")}</p>
          <pre className="whitespace-pre-wrap rounded-card bg-paper-2 p-3.5 font-sans text-[12.5px] leading-relaxed text-ink-2 dark:bg-well-3 dark:text-paper-2/85">
            {draftMessage(justSaved)}
          </pre>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <Button size="sm" variant="outline" onClick={() => navigator.clipboard?.writeText(draftMessage(justSaved))}>
              <Icon n="copy" s={12} /> {t("booking.copy_msg", "Copy message")}
            </Button>
            {lawyers.find((l) => String(l.id) === String(justSaved.lawyerId))?.phone && (
              <Button size="sm" variant="outline" onClick={() => { window.location.href = `tel:${lawyers.find((l) => String(l.id) === String(justSaved.lawyerId)).phone}`; }}>
                <Icon n="phone" s={12} /> {t("booking.call_lawyer", "Call")} {justSaved.lawyerName}
              </Button>
            )}
            <Button size="sm" variant="quiet" onClick={() => setJustSaved(null)}>{t("a.done", "Done")}</Button>
          </div>
        </Card>
      )}

      {reqs.length > 0 && (
        <div className="mt-8">
          <p className="eyebrow mb-2.5">{t("booking.drafted_requests", "Requests you've drafted")}</p>
          <div className="space-y-1.5">
            {reqs.map((r) => (
              <Card key={r.id} className="flex items-center gap-3 p-3.5">
                <div className="min-w-0 flex-1">
                  <p className="text-[13.5px] font-medium">{r.lawyerName}</p>
                  <p className="mt-0.5 text-[11.5px] text-ink-3">
                    {r.date}{r.time && ` · ${r.time}`} · {t(r.mode, r.mode)}
                  </p>
                </div>
                <Badge tone="neutral">{t("booking.not_sent", "Not sent")}</Badge>
                <button onClick={() => { setReqs((x) => x.filter((y) => y.id !== r.id)); if (isLoggedIn() && typeof r.id === "number") apiDelete(`/api/bookings/${r.id}`).catch(() => {}); }} className="rounded p-1.5 text-ink-3 hover:text-tape" aria-label={t("booking.delete_request", "Delete request")}>
                  <Icon n="trash" s={13} />
                </button>
              </Card>
            ))}
          </div>
        </div>
      )}

      {!reqs.length && !justSaved && (
        <Empty title={t("booking.no_requests", "No requests drafted yet")}>
          {t("booking.no_requests_desc", "Choose a lawyer above to draft your first consultation request.")}
        </Empty>
      )}
    </div>
  );
}
