import { useState, useEffect, useRef, useCallback } from "react";
import { Icon } from "../components/Icon";
import { Button, Card, Input, Textarea, Badge, Skeleton, Empty, ErrorNote, Field, Spinner, cx } from "../components/ui";
import { apiFetch, apiPost, apiPut, apiDelete, isAdmin, BASE } from "../lib/api";
import Markdown from "../components/Markdown";

const EMPTY_LAWYER = {
  name: "",
  city: "",
  area: "",
  exp: 0,
  rating: 4.0,
  verified: false,
  languages: "Urdu, English",
  fee: "",
  courts: "",
  edu: "",
  about: "",
  phone: "",
  whatsapp: "",
  email: "",
  chamber: "",
  is_active: true
};

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "quality",  label: "Answer quality" },
  { id: "users",    label: "Users" },
  { id: "laws",     label: "Law library" },
  { id: "lawyers",  label: "Lawyers" },
  { id: "features", label: "Features" },
  { id: "config",   label: "Config" },
];

export default function Admin({ user }) {
  const [tab, setTab] = useState("overview");
  const [stats, setStats] = useState(null);
  const [quality, setQuality] = useState(null);
  const [users, setUsers] = useState([]);
  const [lawyers, setLawyers] = useState([]);
  const [laws, setLaws] = useState([]);
  const [feats, setFeats] = useState({});
  const [config, setConfig] = useState({ GROQ_API_KEY: "", is_configured: false });
  const [load, setLoad] = useState(false);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);
  const fileRef = useRef();

  const [showLawyerForm, setShowLawyerForm] = useState(false);
  const [editingLawyerId, setEditingLawyerId] = useState(null);
  const [lawyerForm, setLawyerForm] = useState(EMPTY_LAWYER);

  const changeLawyerField = (k, numeric = false) => (e) => {
    let val = e.target.value;
    if (numeric) {
      val = val === "" ? "" : (k === "rating" ? parseFloat(val) : parseInt(val, 10));
    }
    setLawyerForm((prev) => ({ ...prev, [k]: val }));
  };

  const handleEditLawyer = (l) => {
    setLawyerForm({
      name: l.name || "",
      city: l.city || "",
      area: l.area || "",
      exp: l.exp || 0,
      rating: l.rating || 4.0,
      verified: !!l.verified,
      languages: l.languages || "Urdu, English",
      fee: l.fee || "",
      courts: l.courts || "",
      edu: l.edu || "",
      about: l.about || "",
      phone: l.phone || "",
      whatsapp: l.whatsapp || "",
      email: l.email || "",
      chamber: l.chamber || "",
      is_active: l.is_active !== false
    });
    setEditingLawyerId(l.id);
    setShowLawyerForm(true);
  };

  const handleDeleteLawyer = async (id) => {
    if (!window.confirm("Are you sure you want to delete this lawyer?")) return;
    setBusy(true);
    try {
      await apiDelete("/api/admin/lawyers/" + id);
      flash("Lawyer deleted successfully.");
      loaders().lawyers();
    } catch (e) {
      flash(e.message, false);
    } finally {
      setBusy(false);
    }
  };

  const saveLawyer = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (editingLawyerId) {
        await apiPut("/api/admin/lawyers/" + editingLawyerId, lawyerForm);
        flash("Lawyer updated successfully.");
      } else {
        await apiPost("/api/admin/lawyers", lawyerForm);
        flash("Lawyer added successfully.");
      }
      setShowLawyerForm(false);
      loaders().lawyers();
    } catch (e) {
      flash(e.message, false);
    } finally {
      setBusy(false);
    }
  };

  const [showUserForm, setShowUserForm] = useState(false);
  const [userForm, setUserForm] = useState({ full_name: "", email: "", password: "", role: "user" });

  const [historyUser, setHistoryUser] = useState(null);
  const [userHistory, setUserHistory] = useState([]);
  const [activeHistorySessionId, setActiveHistorySessionId] = useState(null);
  const [historyLoad, setHistoryLoad] = useState(false);

  const saveUser = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await apiPost("/api/admin/users", userForm);
      flash("User added successfully.");
      setShowUserForm(false);
      loaders().users();
    } catch (e) {
      flash(e.message, false);
    } finally {
      setBusy(false);
    }
  };

  const toggleBlockUser = async (u) => {
    const nextActive = !u.is_active;
    setBusy(true);
    try {
      await apiPut("/api/admin/users/" + u.id, { is_active: nextActive });
      flash(`User ${nextActive ? "unblocked" : "blocked"} successfully.`);
      loaders().users();
    } catch (e) {
      flash(e.message, false);
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteUser = async (id) => {
    if (!window.confirm("Are you sure you want to delete this user account? This cannot be undone.")) return;
    setBusy(true);
    try {
      await apiDelete("/api/admin/users/" + id);
      flash("User account deleted successfully.");
      loaders().users();
    } catch (e) {
      flash(e.message, false);
    } finally {
      setBusy(false);
    }
  };

  const viewUserHistory = async (u) => {
    setHistoryUser(u);
    setHistoryLoad(true);
    try {
      const data = await apiFetch("/api/admin/users/" + u.id + "/history");
      setUserHistory(data);
      if (data && data.length > 0) {
        setActiveHistorySessionId(data[0].session_id);
      }
    } catch (e) {
      flash("Failed to load history: " + e.message, false);
    } finally {
      setHistoryLoad(false);
    }
  };

  const flash = (msg, ok = true) => { setToast({ msg, ok }); setTimeout(() => setToast(null), 3500); };

  const loaders = useCallback(() => ({
    overview: () => apiFetch("/api/admin/stats").then(setStats),
    quality:  () => apiFetch("/api/feedback/stats").then(setQuality),
    users:    () => apiFetch("/api/admin/users").then(setUsers),
    lawyers:  () => apiFetch("/api/admin/lawyers").then(setLawyers),
    laws:     () => apiFetch("/api/admin/laws").then(setLaws),
    features: () => apiFetch("/api/admin/features").then(setFeats),
    config:   () => apiFetch("/api/admin/config").then(setConfig),
  }), []);

  useEffect(() => {
    setToast(null); setLoad(true);
    loaders()[tab]?.().catch((e) => flash(e.message, false)).finally(() => setLoad(false));
  }, [tab, loaders]);

  /* Client-side gate for nav only. Every /api/admin/* route is enforced
     server-side by require_admin() — this hides UI, it does not secure it. */
  if (!isAdmin(user)) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <Icon n="shld" s={26} className="mx-auto text-ink-3" />
        <p className="mt-4 font-display text-[20px]">Admin only</p>
        <p className="mt-1.5 text-[13px] text-ink-3">This area needs an administrator account.</p>
      </div>
    );
  }

  const reindex = async () => {
    setBusy(true);
    try { const d = await apiPost("/api/admin/laws/reindex", {}); flash(d.message || "Index rebuilt."); loaders().laws(); }
    catch (e) { flash(e.message, false); }
    finally { setBusy(false); }
  };

  const upload = async (file) => {
    if (!file) return;
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const r = await fetch(BASE + "/api/admin/laws/upload", {
        method: "POST",
        headers: { Authorization: "Bearer " + localStorage.getItem("access_token") },
        body: fd,
      });
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).detail || `Upload failed (HTTP ${r.status})`);
      flash("Uploaded. Rebuild the index to make it searchable.");
      loaders().laws();
    } catch (e) { flash(e.message, false); }
    finally { setBusy(false); if (fileRef.current) fileRef.current.value = ""; }
  };

  const toggleFeature = async (k) => {
    const next = { ...feats, [k]: !feats[k] };
    setFeats(next);
    try { await apiPut("/api/admin/features", next); flash("Saved."); }
    catch (e) { flash(e.message, false); setFeats(feats); }
  };

  const saveConfig = async () => {
    setBusy(true);
    try { await apiPost("/api/admin/config", { GROQ_API_KEY: config.GROQ_API_KEY }); flash("Saved."); }
    catch (e) { flash(e.message, false); }
    finally { setBusy(false); }
  };

  return (
    <>
      <div className="mx-auto max-w-5xl animate-rise px-4 py-10 sm:px-6">
      <p className="eyebrow mb-3">Administration</p>
      <h1 className="font-display text-[30px] font-normal leading-tight">Admin</h1>

      <div className="mt-6 flex flex-wrap gap-1 border-b border-paper-3 dark:border-well-3" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={cx(
              "-mb-px border-b-2 px-3 py-2 text-[13px] transition-colors",
              tab === t.id ? "border-seal text-ink dark:border-seal-bright dark:text-paper" : "border-transparent text-ink-3 hover:text-ink dark:hover:text-paper"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {toast && (
        <p className={cx("mt-4 rounded-card px-3 py-2 text-[12.5px]", toast.ok ? "bg-seal-tint text-seal dark:bg-seal/15 dark:text-seal-bright" : "bg-tape-tint text-tape dark:bg-tape/15")}>
          {toast.msg}
        </p>
      )}

      <div className="mt-6">
        {load && <div className="grid gap-3 sm:grid-cols-3">{[0,1,2].map(i => <Skeleton key={i} className="h-24" />)}</div>}

        {/* ── Overview ─────────────────────────────────────────────────── */}
        {!load && tab === "overview" && stats && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {Object.entries(stats).filter(([, v]) => typeof v !== "object").map(([k, v]) => (
              <Card key={k} className="p-4">
                <p className="eyebrow">{k.replace(/_/g, " ")}</p>
                <p className="mt-1.5 font-display text-[26px] font-medium">{String(v)}</p>
              </Card>
            ))}
          </div>
        )}

        {/* ── Answer quality ────────────────────────────────────────────────
            The diagnostic that matters: satisfaction split by whether retrieval
            found anything. It separates a retrieval failure from a generation
            failure — and makes the corpus gap measurable. */}
        {!load && tab === "quality" && quality && (
          <div className="space-y-4">
            {quality.total === 0 && (
              <Empty title="No feedback yet">
                Thumbs up/down on chat answers land here. They're the evidence that the retrieval
                pipeline works — worth collecting before your evaluation write-up.
              </Empty>
            )}

            {quality.total > 0 && (
              <>
                <div className="grid gap-3 sm:grid-cols-3">
                  <Card className="p-4">
                    <p className="eyebrow">Ratings</p>
                    <p className="mt-1.5 font-display text-[26px] font-medium">{quality.total}</p>
                  </Card>
                  <Card className="p-4">
                    <p className="eyebrow">Satisfaction</p>
                    <p className="mt-1.5 font-display text-[26px] font-medium">
                      {quality.satisfaction_pct != null ? `${quality.satisfaction_pct}%` : "—"}
                    </p>
                  </Card>
                  <Card className="p-4">
                    <p className="eyebrow">Answered without a statute</p>
                    <p className={cx("mt-1.5 font-display text-[26px] font-medium", quality.coverage_gap_pct > 40 && "text-tape")}>
                      {quality.coverage_gap_pct != null ? `${quality.coverage_gap_pct}%` : "—"}
                    </p>
                    <p className="mt-1 text-[11px] leading-relaxed text-ink-3">
                      High here means the law library is too thin, not that the model is wrong.
                    </p>
                  </Card>
                </div>

                <Card className="p-5">
                  <p className="eyebrow mb-3">Retrieval vs. generation</p>
                  <div className="space-y-3">
                    {[["with_rag", "Statute found"], ["without_rag", "No statute found"]].map(([k, label]) => {
                      const b = quality.breakdown_by_rag?.[k] || { up: 0, down: 0 };
                      const tot = b.up + b.down;
                      const pct = tot ? Math.round((b.up / tot) * 100) : 0;
                      return (
                        <div key={k}>
                          <div className="mb-1 flex items-baseline justify-between text-[12.5px]">
                            <span className="text-ink-2 dark:text-paper-2/80">{label}</span>
                            <span className="font-mono text-ink-3">{tot ? `${pct}% useful · ${tot} rated` : "no data"}</span>
                          </div>
                          <div className="h-1.5 overflow-hidden rounded-full bg-paper-2 dark:bg-well-3">
                            <div className={cx("h-full rounded-full", k === "with_rag" ? "bg-seal" : "bg-tape")} style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <p className="mt-3.5 text-[11.5px] leading-relaxed text-ink-3">
                    If "statute found" scores well and "no statute found" scores badly, retrieval is
                    working and the corpus is the bottleneck. If both score badly, look at the prompt.
                  </p>
                </Card>

                {quality.recent_negative?.length > 0 && (
                  <Card className="p-5">
                    <p className="eyebrow mb-3">Recent thumbs-down</p>
                    <div className="space-y-2">
                      {quality.recent_negative.map((f, i) => (
                        <div key={i} className="border-s-2 border-tape/40 ps-3">
                          <p className="text-[12.5px] text-ink-2 dark:text-paper-2/80">{f.question}</p>
                          <p className="mt-0.5 text-[11px] text-ink-3">
                            {f.has_rag_context ? `used ${f.sources?.join(", ") || "sources"}` : "no statute matched"}
                            {f.comment && ` · “${f.comment}”`}
                          </p>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}
              </>
            )}
          </div>
        )}

        {/* ── Users ───────────────────────────────────────────────────── */}
        {!load && tab === "users" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="eyebrow">{showUserForm ? "Add New User" : "Registered Users"}</p>
              {!showUserForm && (
                <Button size="sm" onClick={() => { setUserForm({ full_name: "", email: "", password: "", role: "user" }); setShowUserForm(true); }}>
                  <Icon n="plus" s={13} /> Add User
                </Button>
              )}
            </div>

            {showUserForm && (
              <Card className="p-5 sm:p-6">
                <form onSubmit={saveUser} className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Full Name" required>
                      <Input value={userForm.full_name} onChange={(e) => setUserForm({ ...userForm, full_name: e.target.value })} required placeholder="e.g. Muhammad Ali" />
                    </Field>
                    <Field label="Email Address" required>
                      <Input type="email" value={userForm.email} onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} required placeholder="e.g. ali@example.com" />
                    </Field>
                    <Field label="Password (Min. 8 characters)" required>
                      <Input type="password" value={userForm.password} onChange={(e) => setUserForm({ ...userForm, password: e.target.value })} required placeholder="••••••••" />
                    </Field>
                    <Field label="Role" required>
                      <select
                        value={userForm.role}
                        onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
                        className="w-full h-10 px-3 border border-paper-3 bg-white text-ink dark:bg-well-2 dark:border-well-3 dark:text-paper rounded-card focus:border-seal text-[13.5px]"
                      >
                        <option value="user">User</option>
                        <option value="lawyer">Lawyer</option>
                        <option value="admin">Admin</option>
                      </select>
                    </Field>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button type="button" variant="quiet" onClick={() => setShowUserForm(false)} disabled={busy}>
                      Cancel
                    </Button>
                    <Button type="submit" loading={busy}>
                      Create User
                    </Button>
                  </div>
                </form>
              </Card>
            )}

            <Card className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-paper-3 text-start dark:border-well-3">
                    {["Name", "Email", "Role", "Active", "AI History", "Actions"].map((h) => (
                      <th key={h} className="px-4 py-2.5 font-mono text-2xs uppercase tracking-wider text-ink-3 text-start">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-b border-paper-2 last:border-0 dark:border-well-3/50">
                      <td className="px-4 py-2.5 font-medium">{u.full_name}</td>
                      <td className="px-4 py-2.5 text-ink-3">{u.email}</td>
                      <td className="px-4 py-2.5"><Badge tone={u.role === "admin" ? "seal" : "neutral"}>{u.role}</Badge></td>
                      <td className="px-4 py-2.5">{u.is_active ? <span className="text-seal font-medium">Yes</span> : <span className="text-tape font-medium">No (Blocked)</span>}</td>
                      <td className="px-4 py-2.5">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => viewUserHistory(u)}
                          className="flex items-center gap-1.5 h-8"
                          title="View Chat History"
                        >
                          <Icon n="hist" s={13} /> History
                        </Button>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => toggleBlockUser(u)}
                            className={cx("h-8 px-2.5", u.is_active ? "text-tape border-tape/20 hover:border-tape bg-tape-tint/5 dark:bg-tape/5" : "text-seal border-seal/20 hover:border-seal bg-seal-tint/5 dark:bg-seal/5")}
                            disabled={busy || u.id === user.id}
                          >
                            {u.is_active ? "Block" : "Unblock"}
                          </Button>
                          <Button
                            variant="quiet"
                            size="sm"
                            onClick={() => handleDeleteUser(u.id)}
                            className="h-8 w-8 p-0 text-tape hover:bg-tape-tint/20 dark:hover:bg-tape/15"
                            disabled={busy || u.id === user.id}
                            title="Delete User"
                          >
                            <Icon n="trash" s={14} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!users.length && <Empty title="No users" />}
            </Card>
          </div>
        )}

        {/* ── Law library ─────────────────────────────────────────────── */}
        {!load && tab === "laws" && (
          <div className="space-y-4">
            <Card className="p-5">
              <p className="eyebrow mb-2">Corpus</p>
              <p className="text-[13px] leading-relaxed text-ink-2 dark:text-paper-2/80">
                Upload statute text, then rebuild the index to make it searchable. Run{" "}
                <code className="rounded bg-paper-2 px-1 py-0.5 font-mono text-[11.5px] dark:bg-well-3">
                  python backend/scripts/check_corpus.py
                </code>{" "}
                to see how complete each statute is.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <input ref={fileRef} type="file" accept=".pdf,.txt" className="hidden" onChange={(e) => upload(e.target.files?.[0])} />
                <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()} disabled={busy}>
                  <Icon n="up2" s={13} /> Upload a law file
                </Button>
                <Button size="sm" onClick={reindex} loading={busy}>
                  <Icon n="rf" s={13} /> Rebuild index
                </Button>
              </div>
            </Card>

            <div className="space-y-1.5">
              {laws.map((l) => (
                <Card key={l.name} className="flex items-center gap-3 p-3.5">
                  <Icon n="book" s={15} className="shrink-0 text-seal dark:text-seal-bright" />
                  <span className="flex-1 truncate text-[13px]">{l.name}</span>
                  <span className="font-mono text-[11.5px] text-ink-3">{l.size_kb != null ? `${l.size_kb} KB` : ""}</span>
                </Card>
              ))}
              {!laws.length && <Empty title="No law files" >Upload statute text to build the library.</Empty>}
            </div>
          </div>
        )}

        {/* ── Lawyers ─────────────────────────────────────────────────── */}
        {!load && tab === "lawyers" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="eyebrow">{showLawyerForm ? (editingLawyerId ? "Edit Lawyer Profile" : "Create Lawyer Profile") : "All Registered Lawyers"}</p>
              {!showLawyerForm && (
                <Button size="sm" onClick={() => { setLawyerForm(EMPTY_LAWYER); setEditingLawyerId(null); setShowLawyerForm(true); }}>
                  <Icon n="plus" s={13} /> Add Lawyer
                </Button>
              )}
            </div>

            {showLawyerForm ? (
              <Card className="p-5 sm:p-6">
                <form onSubmit={saveLawyer} className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Full Name" required>
                      <Input value={lawyerForm.name} onChange={changeLawyerField("name")} required placeholder="e.g. Adv. Amina Qureshi" />
                    </Field>
                    <Field label="City" required>
                      <Input value={lawyerForm.city} onChange={changeLawyerField("city")} required placeholder="e.g. Karachi" />
                    </Field>
                    <Field label="Area of Practice / Specialization" required>
                      <Input value={lawyerForm.area} onChange={changeLawyerField("area")} required placeholder="e.g. Constitutional Law, Family Law" />
                    </Field>
                    <Field label="Experience (Years)">
                      <Input type="number" min="0" value={lawyerForm.exp} onChange={changeLawyerField("exp", true)} placeholder="e.g. 10" />
                    </Field>
                    <Field label="Rating (1.0 to 5.0)">
                      <Input type="number" min="1.0" max="5.0" step="0.1" value={lawyerForm.rating} onChange={changeLawyerField("rating", true)} placeholder="e.g. 4.8" />
                    </Field>
                    <Field label="Languages Spoken">
                      <Input value={lawyerForm.languages} onChange={changeLawyerField("languages")} placeholder="e.g. Urdu, English, Punjabi" />
                    </Field>
                    <Field label="Consultation Fee">
                      <Input value={lawyerForm.fee} onChange={changeLawyerField("fee")} placeholder="e.g. Rs. 5,000" />
                    </Field>
                    <Field label="Courts of Practice">
                      <Input value={lawyerForm.courts} onChange={changeLawyerField("courts")} placeholder="e.g. Sindh High Court, Supreme Court" />
                    </Field>
                    <Field label="Education / Qualifications">
                      <Input value={lawyerForm.edu} onChange={changeLawyerField("edu")} placeholder="e.g. LL.B, LL.M (London)" />
                    </Field>
                    <Field label="Email Address">
                      <Input type="email" value={lawyerForm.email} onChange={changeLawyerField("email")} placeholder="e.g. lawyer@example.com" />
                    </Field>
                    <Field label="Phone Number">
                      <Input value={lawyerForm.phone} onChange={changeLawyerField("phone")} placeholder="e.g. 03001234567" />
                    </Field>
                    <Field label="WhatsApp Number">
                      <Input value={lawyerForm.whatsapp} onChange={changeLawyerField("whatsapp")} placeholder="e.g. 03001234567" />
                    </Field>
                    <Field label="Chamber / Office Address" className="sm:col-span-2">
                      <Input value={lawyerForm.chamber} onChange={changeLawyerField("chamber")} placeholder="e.g. Office 4B, 3rd Floor, Legal Towers, Clifton, Karachi" />
                    </Field>
                  </div>
                  <Field label="About / Professional Bio">
                    <Textarea value={lawyerForm.about} onChange={changeLawyerField("about")} rows={4} className="h-28" placeholder="Short description about the lawyer's professional background, successful cases, and expertise..." />
                  </Field>
                  <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
                    <div className="flex gap-5">
                      <label className="flex cursor-pointer items-center gap-2 text-[13px] text-ink-2 dark:text-paper-2">
                        <input type="checkbox" checked={lawyerForm.verified} onChange={(e) => setLawyerForm({ ...lawyerForm, verified: e.target.checked })} className="h-4 w-4 rounded border-paper-3 text-seal focus:ring-seal dark:border-well-3" />
                        <span>Verified Profile</span>
                      </label>
                      <label className="flex cursor-pointer items-center gap-2 text-[13px] text-ink-2 dark:text-paper-2">
                        <input type="checkbox" checked={lawyerForm.is_active} onChange={(e) => setLawyerForm({ ...lawyerForm, is_active: e.target.checked })} className="h-4 w-4 rounded border-paper-3 text-seal focus:ring-seal dark:border-well-3" />
                        <span>Show on Directory (Active)</span>
                      </label>
                    </div>
                    <div className="flex gap-2">
                      <Button type="button" variant="quiet" onClick={() => setShowLawyerForm(false)} disabled={busy}>
                        Cancel
                      </Button>
                      <Button type="submit" loading={busy}>
                        {editingLawyerId ? "Save Changes" : "Create Profile"}
                      </Button>
                    </div>
                  </div>
                </form>
              </Card>
            ) : (
              <div className="space-y-1.5">
                {lawyers.map((l) => (
                  <Card key={l.id} className="flex items-center gap-4 p-3.5 hover:border-paper-3 dark:hover:border-well-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-[13.5px] font-medium">{l.name}</p>
                        {l.verified && <Badge tone="seal">Verified</Badge>}
                        {!l.is_active && <Badge tone="neutral">Inactive</Badge>}
                      </div>
                      <p className="mt-0.5 text-[11.5px] text-ink-3">
                        {l.area} · {l.city} {l.exp ? `· ${l.exp} yrs exp` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      {l.rating != null && (
                        <span className="font-mono text-[12.5px] font-medium text-seal dark:text-seal-bright">
                          ★ {Number(l.rating).toFixed(1)}
                        </span>
                      )}
                      <div className="flex gap-1">
                        <Button variant="quiet" size="sm" onClick={() => handleEditLawyer(l)} className="h-8 w-8 p-0" aria-label="Edit Profile">
                          <Icon n="edit" s={14} />
                        </Button>
                        <Button variant="quiet" size="sm" onClick={() => handleDeleteLawyer(l.id)} className="h-8 w-8 p-0 text-tape hover:bg-tape-tint/20 dark:hover:bg-tape/15" aria-label="Delete Profile">
                          <Icon n="trash" s={14} />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
                {!lawyers.length && <Empty title="No lawyers listed" />}
              </div>
            )}
          </div>
        )}

        {/* ── Features ────────────────────────────────────────────────── */}
        {!load && tab === "features" && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div>
              <h2 className="font-display text-xl text-ink dark:text-paper">Platform Features</h2>
              <p className="mt-1 text-sm text-ink-3 dark:text-paper-3">
                Toggle specific modules and capabilities across the application. Changes apply immediately.
              </p>
            </div>
            
            <div className="grid gap-4 sm:grid-cols-2">
              {Object.entries(feats).map(([k, v]) => {
                const title = k.split('_').map(w => w[0].toUpperCase() + w.slice(1)).join(' ');
                const isActive = !!v;
                
                return (
                  <label 
                    key={k} 
                    className={cx(
                      "group relative flex cursor-pointer flex-col justify-between overflow-hidden rounded-xl border p-5 transition-all duration-300",
                      isActive 
                        ? "border-seal/30 bg-seal/5 shadow-sm dark:border-seal-bright/30 dark:bg-seal-bright/5" 
                        : "border-paper-3 bg-white hover:border-paper-4 hover:shadow-sm dark:border-well-3 dark:bg-well-2 dark:hover:border-well-4"
                    )}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <span className={cx(
                          "block text-[15px] font-medium tracking-tight transition-colors",
                          isActive ? "text-seal dark:text-seal-bright" : "text-ink dark:text-paper"
                        )}>
                          {title}
                        </span>
                        <span className="block text-[13px] leading-relaxed text-ink-3 dark:text-paper-3/80">
                          {isActive ? "Currently enabled for all users." : "Currently disabled."}
                        </span>
                      </div>
                      
                      <div className="mt-0.5 shrink-0">
                        <button
                          type="button"
                          role="switch"
                          aria-checked={isActive}
                          onClick={(e) => {
                            e.preventDefault();
                            toggleFeature(k);
                          }}
                          className={cx(
                            "relative flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-seal focus-visible:ring-offset-2",
                            isActive ? "bg-seal dark:bg-seal-bright" : "bg-paper-3 dark:bg-well-4"
                          )}
                        >
                          <span className="sr-only">Toggle {title}</span>
                          <span
                            aria-hidden="true"
                            className={cx(
                              "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                              isActive ? "translate-x-5" : "translate-x-0"
                            )}
                          />
                        </button>
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
            
            {!Object.keys(feats).length && (
              <Card className="p-10">
                <Empty title="No feature flags found" />
              </Card>
            )}
          </div>
        )}

        {/* ── Config ──────────────────────────────────────────────────── */}
        {!load && tab === "config" && (
          <Card className="p-5">
            <p className="eyebrow mb-3">Model access</p>
            <Field label="GROQ API key" hint={config.is_configured ? "A key is already set. Entering a new one replaces it." : "Chat won't work until this is set."}>
              <Input
                type="password"
                value={config.GROQ_API_KEY || ""}
                onChange={(e) => setConfig({ ...config, GROQ_API_KEY: e.target.value })}
                placeholder={config.is_configured ? "••••••••••••" : "gsk_…"}
              />
            </Field>
            <Button className="mt-4" onClick={saveConfig} loading={busy}>Save key</Button>
          </Card>
        )}
      </div>
    </div>
      {/* ── User History Modal ────────────────────────────────────────── */}
      {historyUser && (
        <div 
          onClick={() => { setHistoryUser(null); setUserHistory([]); }}
          className="fixed inset-0 z-[80] flex items-center justify-center bg-ink/70 backdrop-blur-sm p-4 animate-fade-in"
        >
          <div 
            onClick={(e) => e.stopPropagation()} 
            className="w-full max-w-4xl h-[80vh] flex flex-col overflow-hidden rounded-card border border-paper-3 dark:border-well-4 bg-white dark:bg-well-2 shadow-float animate-rise relative"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-paper-3 p-4 dark:border-well-3 bg-white dark:bg-well-2">
              <div>
                <h3 className="font-display text-[18px] font-medium text-ink dark:text-paper">{historyUser.full_name}</h3>
                <p className="text-[12px] text-ink-3 dark:text-paper-3/70">{historyUser.email} · AI Chat History</p>
              </div>
              <button
                onClick={() => { setHistoryUser(null); setUserHistory([]); }}
                className="rounded-full p-2 text-ink-2 hover:bg-paper-2 hover:text-ink dark:text-paper-2 dark:hover:bg-well-3 dark:hover:text-paper transition-colors flex items-center justify-center"
                aria-label="Close"
              >
                <Icon n="close" s={20} />
              </button>
            </div>
            {/* Content Area */}
            <div className="flex-1 flex min-h-0">
              {historyLoad ? (
                <div className="flex-1 flex items-center justify-center">
                  <Spinner className="h-6 w-6 text-seal" />
                </div>
              ) : userHistory.length === 0 ? (
                <div className="flex-1 flex items-center justify-center">
                  <Empty title="No History Found" >
                    This user has not conversed with the AI since database history tracking was enabled.
                  </Empty>
                </div>
              ) : (
                <>
                  {/* Sessions List */}
                  <div className="w-64 border-e border-paper-3 dark:border-well-3 overflow-y-auto p-2 space-y-1 bg-paper/50 dark:bg-well/50">
                    <p className="px-2 py-1 eyebrow text-2xs uppercase">Conversations</p>
                    {userHistory.map((sess) => (
                      <button
                        key={sess.session_id}
                        onClick={() => setActiveHistorySessionId(sess.session_id)}
                        className={cx(
                          "w-full text-start px-3 py-2.5 rounded-card text-[12.5px] truncate transition-colors",
                          activeHistorySessionId === sess.session_id
                            ? "bg-seal/10 text-seal dark:bg-seal-bright/10 dark:text-seal-bright font-medium"
                            : "hover:bg-paper-2 dark:hover:bg-well-3 text-ink-2 dark:text-paper-2"
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <Icon n="msg" s={13} />
                          <span className="truncate">{sess.session_title}</span>
                        </div>
                      </button>
                    ))}
                  </div>

                  {/* Messages Feed */}
                  <div className="flex-1 overflow-y-auto p-4 bg-paper-2/40 dark:bg-well-3/20 flex flex-col">
                    {(() => {
                      const activeSess = userHistory.find((s) => s.session_id === activeHistorySessionId) || userHistory[0];
                      if (!activeSess) return null;
                      return (
                        <>
                          <div className="border-b border-paper-3 pb-2 mb-4 dark:border-well-3 shrink-0">
                            <p className="font-display text-[15px] font-medium text-ink dark:text-paper">{activeSess.session_title}</p>
                            <p className="text-[11px] text-ink-3">Session ID: {activeSess.session_id}</p>
                          </div>
                          <div className="flex-1 space-y-5 overflow-y-auto pr-1 flex flex-col">
                            {activeSess.messages.map((m) =>
                              m.role === "user" ? (
                                <div key={m.id} className="flex justify-end animate-rise">
                                  <div className="max-w-[85%] rounded-card bg-seal px-3.5 py-2.5 text-[13.5px] leading-relaxed text-white shadow-seal">
                                    {m.content}
                                  </div>
                                </div>
                              ) : (
                                <div key={m.id} className="animate-rise">
                                  <Card stamp className="p-4 shadow-lift sm:p-5">
                                    <div className="flex items-center gap-1.5 mb-2 opacity-70 text-[10px] font-mono uppercase">
                                      <Icon n="gavel" s={10} />
                                      <span>AI Assistant</span>
                                    </div>
                                    <Markdown content={m.content} />
                                  </Card>
                                </div>
                              )
                            )}
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
