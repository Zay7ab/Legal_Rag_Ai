import { useState, useEffect } from "react";
import { Icon } from "../components/Icon";
import { Button, Card, Input, Select, Textarea, Field, Badge, Empty, cx } from "../components/ui";
import { useLang } from "../lib/i18n";

const KEY = "legalai_cases";
const load = () => { try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; } };
const save = (c) => { try { localStorage.setItem(KEY, JSON.stringify(c)); } catch {} };

const TYPES  = ["Criminal", "Civil", "Family", "Property", "Labour", "Corporate", "Tax"];
const STATUS = ["Pending", "Hearing set", "Adjourned", "Reserved", "Decided", "Closed"];
const TONE = { "Decided": "seal", "Closed": "neutral", "Adjourned": "tape" };

const blank = { title: "", caseNo: "", court: "", type: "Criminal", status: "Pending", nextHearing: "", notes: "" };

export default function CaseTrack() {
  const [cases, setCases] = useState(load);
  const [form, setForm]   = useState(blank);
  const [editing, setEditing] = useState(null);
  const [adding, setAdding] = useState(false);
  const [q, setQ] = useState("");

  const { t, rtl } = useLang();

  useEffect(() => { save(cases); }, [cases]);

  const submit = (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    if (editing) setCases((c) => c.map((x) => (x.id === editing ? { ...form, id: editing } : x)));
    else setCases((c) => [{ ...form, id: Date.now().toString() }, ...c]);
    setForm(blank); setAdding(false); setEditing(null);
  };

  const edit = (c) => { setForm(c); setEditing(c.id); setAdding(true); };
  const remove = (id) => setCases((c) => c.filter((x) => x.id !== id));

  const needle = q.trim().toLowerCase();
  const list = cases.filter((c) => !needle || (c.title + c.caseNo + c.court).toLowerCase().includes(needle));

  const soon = (d) => {
    if (!d) return false;
    const days = (new Date(d) - Date.now()) / 86400000;
    return days >= 0 && days <= 7;
  };

  return (
    <div className="mx-auto max-w-4xl animate-rise px-4 py-10 sm:px-6">
      <p className="eyebrow mb-3">{t("page.casetrack", "Your matters")}</p>
      <h1 className="font-display text-[30px] font-normal leading-tight">{t("casetrack.title", "Track a case")}</h1>
      <p className="mt-2 max-w-xl text-[14px] leading-relaxed text-ink-2 dark:text-paper-2/80">
        {t("casetrack.subtitle", "Keep your case numbers, courts and hearing dates in one place.")}
      </p>
      <p className="mt-2 flex items-center gap-1.5 text-[11.5px] text-ink-3">
        <Icon n="warn" s={12} />
        {t("casetrack.save_note", "Saved on this device only — not synced, and cleared if you wipe browser data.")}
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[12rem] flex-1">
          <Icon n="srch" s={15} className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-ink-3" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("casetrack.find_placeholder", "Find a case…")}
            aria-label={t("casetrack.find_placeholder", "Find a case")}
            className="ps-9"
          />
        </div>
        <Button onClick={() => { setForm(blank); setEditing(null); setAdding(!adding); }}>
          <Icon n="plus" s={14} /> {t("casetrack.add_case_btn", "Add a case")}
        </Button>
      </div>

      {adding && (
        <Card stamp className="mt-4 animate-rise p-5">
          <p className="eyebrow mb-4">{editing ? t("casetrack.edit_case", "Edit case") : t("casetrack.new_case", "New case")}</p>
          <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Field label={t("casetrack.form_title", "What is this case about?")} required>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder={t("casetrack.form_title_ph", "e.g. Rent dispute — Flat 3B")} required />
              </Field>
            </div>
            <Field label={t("casetrack.form_no", "Case number")}><Input value={form.caseNo} onChange={(e) => setForm({ ...form, caseNo: e.target.value })} placeholder={t("casetrack.form_no_ph", "e.g. C.M. 1234/2024")} /></Field>
            <Field label={t("casetrack.form_court", "Court")}><Input value={form.court} onChange={(e) => setForm({ ...form, court: e.target.value })} placeholder={t("casetrack.form_court_ph", "e.g. Sindh High Court")} /></Field>
            <Field label={t("casetrack.form_type", "Type")}>
              <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>{TYPES.map((t_name) => <option key={t_name} value={t_name}>{t(t_name, t_name)}</option>)}</Select>
            </Field>
            <Field label={t("casetrack.form_status", "Status")}>
              <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>{STATUS.map((s_name) => <option key={s_name} value={s_name}>{t(s_name, s_name)}</option>)}</Select>
            </Field>
            <Field label={t("casetrack.form_next", "Next hearing")}><Input type="date" value={form.nextHearing} onChange={(e) => setForm({ ...form, nextHearing: e.target.value })} /></Field>
            <div className="sm:col-span-2">
              <Field label={t("casetrack.form_notes", "Notes")}><Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder={t("casetrack.form_notes_ph", "Anything you need to remember")} /></Field>
            </div>
            <div className="flex gap-2 sm:col-span-2">
              <Button type="submit">{editing ? t("casetrack.save_changes", "Save changes") : t("casetrack.add_case_btn", "Add a case")}</Button>
              <Button type="button" variant="quiet" onClick={() => { setAdding(false); setEditing(null); setForm(blank); }}>{t("a.cancel", "Cancel")}</Button>
            </div>
          </form>
        </Card>
      )}

      <div className="mt-4 space-y-2">
        {list.map((c) => (
          <Card key={c.id} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="font-display text-[15px] font-medium">{c.title}</p>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-ink-3">
                  {c.caseNo && <span className="font-mono">{c.caseNo}</span>}
                  {c.court && <span>{c.court}</span>}
                  <span>{t(c.type, c.type)}</span>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <Badge tone={TONE[c.status] || "neutral"}>{t(c.status, c.status)}</Badge>
                <button onClick={() => edit(c)} className="rounded p-1.5 text-ink-3 hover:text-ink dark:hover:text-paper" aria-label={`${t("casetrack.edit_case", "Edit case")}: ${c.title}`}>
                  <Icon n="note" s={13} />
                </button>
                <button onClick={() => remove(c.id)} className="rounded p-1.5 text-ink-3 hover:text-tape" aria-label={`${t("casetrack.delete_case", "Delete case")}: ${c.title}`}>
                  <Icon n="trash" s={13} />
                </button>
              </div>
            </div>
            {c.nextHearing && (
              <p className={cx("mt-2.5 flex items-center gap-1.5 text-[12px]", soon(c.nextHearing) ? "font-medium text-tape" : "text-ink-3")}>
                <Icon n="cal" s={12} />
                {t("casetrack.next_hearing", "Next hearing")}{" "}
                {new Date(c.nextHearing).toLocaleDateString(rtl ? "ur-PK" : "en-PK", { day: "numeric", month: "short", year: "numeric" })}
                {soon(c.nextHearing) && ` — ${t("casetrack.within_week", "within a week")}`}
              </p>
            )}
            {c.notes && <p className="mt-2 text-[12.5px] leading-relaxed text-ink-2 dark:text-paper-2/80">{c.notes}</p>}
          </Card>
        ))}
      </div>

      {!list.length && (
        <Empty
          title={cases.length ? `${t("casetrack.no_case_match", "No case matches")} “${q}”` : t("casetrack.no_cases", "No cases yet")}
          action={!cases.length && <Button onClick={() => setAdding(true)}><Icon n="plus" s={13} /> {t("casetrack.add_first_case", "Add your first case")}</Button>}
        >
          {cases.length ? t("casetrack.match_help", "Try the case number or the court.") : t("casetrack.add_help", "Add a matter to keep its number, court and next hearing date together.")}
        </Empty>
      )}
    </div>
  );
}
