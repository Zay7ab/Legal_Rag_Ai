import { useState, useEffect } from "react";
import { Icon } from "../components/Icon";
import { Button, Card, Input, Textarea, Field, cx, Spinner } from "../components/ui";
import { apiFetch, apiPost } from "../lib/api";
import { useLang } from "../lib/i18n";

export default function Intake({ user, onComplete }) {
  const { t, rtl } = useLang();
  const [step, setStep] = useState(1);
  const [load, setLoad] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [form, setForm] = useState({
    full_name: "",
    cnic: "",
    dob: "",
    gender: "",
    city: "",
    address: "",
    nationality: "",
    profession: "",
    income_band: "",
    affordability: "",
    stress_level: 5,
    impact_description: "",
    is_unsafe: false,
    opponent_type: "",
    opponent_relationship: "",
    dispute_description: "",
    prior_history: "",
    past_cases: "",
    ongoing_case: "",
    prior_consultation: "",
    goal: "",
    timeline: "",
    expected_outcome: "",
    full_story: "",
    documents_held: "",
    consent: false
  });

  const steps = [
    { id: 1, name: t("intake.full_name", "Identity") },
    { id: 2, name: t("intake.city", "Location") },
    { id: 3, name: t("intake.profession", "Profession") },
    { id: 4, name: t("intake.stress_level", "Stress & Safety") },
    { id: 5, name: t("intake.opponent_type", "Opposing Party") },
    { id: 6, name: t("intake.past_cases", "History") },
    { id: 7, name: t("intake.goal", "Goal & Timeline") },
    { id: 8, name: t("intake.full_story", "Your Story") },
    { id: 9, name: t("intake.consent", "Consent") }
  ];

  useEffect(() => {
    apiFetch("/api/intake")
      .then((res) => {
        if (res.intake) {
          setForm((prev) => ({ ...prev, ...res.intake }));
          // Calculate step to resume
          const data = res.intake;
          if (!data.full_name) setStep(1);
          else if (!data.city) setStep(2);
          else if (!data.profession) setStep(3);
          else if (data.stress_level === null || data.stress_level === undefined) setStep(4);
          else if (!data.opponent_type) setStep(5);
          else if (!data.past_cases) setStep(6);
          else if (!data.goal) setStep(7);
          else if (!data.full_story) setStep(8);
          else setStep(9);
        }
      })
      .catch(() => {})
      .finally(() => setLoad(false));
  }, []);

  const changeField = (k) => (e) => {
    const val = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setForm((prev) => ({ ...prev, [k]: val }));
  };

  const getWordCount = (str) => {
    return str ? str.trim().split(/\s+/).filter(Boolean).length : 0;
  };

  const validateStep = () => {
    setErr("");
    if (step === 1) {
      if (!form.full_name.trim()) return t("err.fullname", "Full name is required.");
      if (!form.gender) return t("err.gender", "Gender is required.");
    }
    if (step === 2) {
      if (!form.city.trim()) return t("err.city", "Current city is required.");
      if (!form.address.trim()) return t("err.address", "Permanent address is required.");
      if (!form.nationality) return t("err.nationality", "Nationality status is required.");
    }
    if (step === 3) {
      if (!form.profession.trim()) return t("err.profession", "Profession is required.");
      if (!form.affordability) return t("err.affordability", "Affordability choice is required.");
    }
    if (step === 4) {
      if (!form.impact_description.trim()) return t("err.impact", "Impact description is required.");
    }
    if (step === 5) {
      if (!form.opponent_type) return t("err.opponent_type", "Opposing party category is required.");
      if (!form.opponent_relationship.trim()) return t("err.opponent_relationship", "Relationship detail is required.");
      if (!form.dispute_description.trim()) return t("err.dispute", "Dispute description is required.");
    }
    if (step === 8) {
      if (!form.expected_outcome.trim()) return t("err.expected_outcome", "Expected outcome description is required.");
      if (getWordCount(form.full_story) < 100) return t("err.story_length", "Please write at least 100 words describing your full story.");
    }
    if (step === 9) {
      if (!form.consent) return t("err.consent", "You must consent to store data to complete onboarding.");
    }
    return null;
  };

  const handleNext = async (e) => {
    if (e) e.preventDefault();
    const validationErr = validateStep();
    if (validationErr) {
      setErr(validationErr);
      return;
    }

    setBusy(true);
    try {
      const payload = { ...form };
      if (step === 9) {
        payload.completed = true;
      }
      const data = await apiPost("/api/intake/save", payload);
      
      if (step === 9) {
        if (data.deleted) {
          onComplete(false); // Deleted on deny consent
        } else {
          onComplete(true);
        }
      } else {
        setStep((prev) => prev + 1);
      }
    } catch (e) {
      setErr(e.message || t("err.save_failed", "Failed to save progress."));
    } finally {
      setBusy(false);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep((prev) => prev - 1);
      setErr("");
    }
  };

  const handleSkip = async (fieldsToNull = []) => {
    setBusy(true);
    try {
      const updatedForm = { ...form };
      fieldsToNull.forEach((f) => {
        updatedForm[f] = "";
      });
      setForm(updatedForm);
      await apiPost("/api/intake/save", updatedForm);
      setStep((prev) => prev + 1);
    } catch (e) {
      setErr(e.message || t("err.save_failed", "Failed to save progress."));
    } finally {
      setBusy(false);
    }
  };

  if (load) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner className="h-6 w-6 text-seal" />
      </div>
    );
  }

  return (
    <div className={cx("mx-auto max-w-2xl px-4 py-12 sm:px-6", rtl && "font-urdu text-end")}>
      <Card className="p-6 sm:p-8 bg-white dark:bg-well-2 border border-paper-3 dark:border-well-3 shadow-float">
        <div className="flex items-center justify-between border-b border-paper-3 dark:border-well-3 pb-4 mb-6">
          <div>
            <p className="eyebrow">{t("intake.title", "Onboarding Profile")}</p>
            <h1 className="font-display text-[22px] font-medium mt-1">{t("intake.heading", "Biography Setup")}</h1>
          </div>
          <div className="text-end">
            <span className="text-[13px] font-mono font-medium text-seal dark:text-seal-bright">
              {t("intake.step", "Step")} {step} {t("intake.of", "of")} 9
            </span>
            <div className="mt-1.5 h-1.5 w-24 overflow-hidden rounded-full bg-paper-3 dark:bg-well-3">
              <div 
                className="h-full bg-seal dark:bg-seal-bright transition-all duration-300"
                style={{ width: `${(step / 9) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {err && (
          <div className="mb-4 rounded-card bg-tape-tint/40 border border-tape/20 p-3 text-[12.5px] text-tape dark:bg-tape/15 flex items-center gap-2">
            <Icon n="warn" s={14} className="shrink-0" />
            <span>{err}</span>
          </div>
        )}

        <form onSubmit={handleNext} className="space-y-5">
          {/* STEP 1: Identity */}
          {step === 1 && (
            <div className="space-y-4">
              <p className="text-[13px] text-ink-3 dark:text-paper-3/80">
                {t("intake.identity.desc", "First step records your basic identity.")}
              </p>
              <Field label={t("intake.full_name", "Full Name")} required>
                <Input value={form.full_name} onChange={changeField("full_name")} required placeholder="e.g. Muhammad Ali" />
              </Field>
              <Field label={t("intake.gender", "Gender")} required>
                <select
                  value={form.gender}
                  onChange={changeField("gender")}
                  className="w-full h-10 px-3 border border-paper-3 bg-white text-ink dark:bg-well-2 dark:border-well-3 dark:text-paper rounded-card focus:border-seal text-[13.5px]"
                  required
                >
                  <option value="">{t("intake.gender.select", "Select Gender")}</option>
                  <option value="Male">{t("intake.gender.male", "Male")}</option>
                  <option value="Female">{t("intake.gender.female", "Female")}</option>
                  <option value="Other">{t("intake.gender.other", "Other")}</option>
                </select>
              </Field>
              <Field label={t("intake.dob", "Date of Birth (Optional)")} hint={t("intake.dob.hint", "For CNIC and age check.")}>
                <Input type="date" value={form.dob || ""} onChange={changeField("dob")} />
              </Field>
              <Field label={t("intake.cnic", "CNIC Number (Optional)")} hint={t("intake.cnic.hint", "Format: 13 digits (without dashes)")}>
                <Input value={form.cnic || ""} onChange={changeField("cnic")} maxLength={13} placeholder="42101xxxxxxxx" />
              </Field>
              <div className="flex gap-2 justify-end pt-2">
                <Button type="button" variant="quiet" onClick={() => handleSkip(["dob", "cnic"])}>
                  {t("intake.skip_optional", "Skip Optional")}
                </Button>
                <Button type="submit" loading={busy}>{t("intake.next", "Next Step")}</Button>
              </div>
            </div>
          )}

          {/* STEP 2: Location */}
          {step === 2 && (
            <div className="space-y-4">
              <p className="text-[13px] text-ink-3 dark:text-paper-3/80">
                {t("intake.location.desc", "Records your city and nationality to determine jurisdiction.")}
              </p>
              <Field label={t("intake.city", "Current City")} required>
                <Input value={form.city} onChange={changeField("city")} required placeholder="e.g. Karachi" />
              </Field>
              <Field label={t("intake.address", "Permanent Address")} required>
                <Textarea value={form.address} onChange={changeField("address")} required placeholder="Write your full address..." />
              </Field>
              <Field label={t("intake.nationality", "Nationality Status")} required>
                <select
                  value={form.nationality}
                  onChange={changeField("nationality")}
                  className="w-full h-10 px-3 border border-paper-3 bg-white text-ink dark:bg-well-2 dark:border-well-3 dark:text-paper rounded-card focus:border-seal text-[13.5px]"
                  required
                >
                  <option value="">{t("intake.nationality.select", "Select Nationality")}</option>
                  <option value="Pakistani">{t("intake.nationality.pakistani", "Pakistani")}</option>
                  <option value="Dual Citizen">{t("intake.nationality.dual", "Dual Citizen")}</option>
                  <option value="Foreigner">{t("intake.nationality.foreigner", "Foreigner")}</option>
                </select>
              </Field>
              <div className="flex gap-2 justify-between pt-2">
                <Button type="button" variant="outline" onClick={handleBack}>{t("intake.back", "Go Back")}</Button>
                <Button type="submit" loading={busy}>{t("intake.next", "Next Step")}</Button>
              </div>
            </div>
          )}

          {/* STEP 3: Profession & Affordability */}
          {step === 3 && (
            <div className="space-y-4">
              <p className="text-[13px] text-ink-3 dark:text-paper-3/80">
                {t("intake.profession.desc", "Records your work and income band to check for pro-bono availability.")}
              </p>
              <Field label={t("intake.profession", "Profession / Work")} required>
                <Input value={form.profession} onChange={changeField("profession")} required placeholder="e.g. Shopkeeper, Teacher" />
              </Field>
              <Field label={t("intake.income_band", "Monthly Income Band (Optional)")}>
                <select
                  value={form.income_band || ""}
                  onChange={changeField("income_band")}
                  className="w-full h-10 px-3 border border-paper-3 bg-white text-ink dark:bg-well-2 dark:border-well-3 dark:text-paper rounded-card focus:border-seal text-[13.5px]"
                >
                  <option value="">{t("intake.income.select", "Select Income Band")}</option>
                  <option value="<50k">{t("intake.income.under50", "Less than 50,000 PKR")}</option>
                  <option value="50k-100k">{t("intake.income.50to100", "50,000 - 100,000 PKR")}</option>
                  <option value=">100k">{t("intake.income.over100", "More than 100,000 PKR")}</option>
                </select>
              </Field>
              <Field label={t("intake.affordability", "Fee Affordability")} required>
                <select
                  value={form.affordability}
                  onChange={changeField("affordability")}
                  className="w-full h-10 px-3 border border-paper-3 bg-white text-ink dark:bg-well-2 dark:border-well-3 dark:text-paper rounded-card focus:border-seal text-[13.5px]"
                  required
                >
                  <option value="">{t("intake.afford.select", "Select Affordability")}</option>
                  <option value="afford">{t("intake.afford.yes", "Can Afford Normal Legal Fees")}</option>
                  <option value="pro-bono">{t("intake.afford.no", "Needs Free (Pro-Bono) Legal Aid")}</option>
                </select>
              </Field>
              <div className="flex gap-2 justify-between pt-2">
                <Button type="button" variant="outline" onClick={handleBack}>{t("intake.back", "Go Back")}</Button>
                <div className="flex gap-2">
                  <Button type="button" variant="quiet" onClick={() => handleSkip(["income_band"])}>
                    {t("intake.skip", "Skip")}
                  </Button>
                  <Button type="submit" loading={busy}>{t("intake.next", "Next Step")}</Button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Stress & Safety Check */}
          {step === 4 && (
            <div className="space-y-4">
              <p className="text-[13px] text-ink-3 dark:text-paper-3/80">
                {t("intake.stress.desc", "Records your stress levels and safety concerns for emergency measures.")}
              </p>
              <Field label={`${t("intake.stress_level", "Stress / Anxiety Level")} (1 to 10): ${form.stress_level}`}>
                <input 
                  type="range" 
                  min="1" 
                  max="10" 
                  value={form.stress_level} 
                  onChange={changeField("stress_level")} 
                  className="w-full h-2 rounded-lg bg-paper-3 dark:bg-well-3 accent-seal dark:accent-seal-bright outline-none cursor-pointer"
                />
              </Field>
              <Field label={t("intake.impact_description", "Daily Life Impact Description")} required hint="Sleep, health ya routine par kya asar hai?">
                <Textarea value={form.impact_description} onChange={changeField("impact_description")} required placeholder="e.g. Heavy stress, lack of sleep due to threats..." />
              </Field>
              
              <label className="flex items-start gap-3 rounded-card border border-paper-3 p-3 dark:border-well-3 hover:bg-paper/10 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={form.is_unsafe} 
                  onChange={changeField("is_unsafe")} 
                  className="h-5 w-5 rounded border-paper-3 text-seal focus:ring-seal dark:border-well-3 mt-0.5" 
                />
                <div>
                  <span className="block text-[13.5px] font-medium text-ink dark:text-paper">{t("intake.is_unsafe", "Do you feel physically unsafe or threatened?")}</span>
                  <span className="block text-[11px] text-ink-3">Aapko kisi qism ka jani ya mali khatra mehsoos ho rha hai?</span>
                </div>
              </label>

              {form.is_unsafe && (
                <div className="rounded-card bg-tape-tint/70 border border-tape/40 p-4 text-[13px] text-tape dark:bg-tape/10 space-y-2 text-start">
                  <div className="flex items-center gap-2 font-medium">
                    <Icon n="warn" s={16} />
                    <span>⚠️ IMMEDIATE LEGAL PROTECTION INFORMATION:</span>
                  </div>
                  <p className="leading-relaxed">
                    Aap foran **Protection Order** ke liye apply kar sakte hain. Domestic Violence ya harassment ke cases me qanoon aapko security faraham karta hai.
                  </p>
                  <div className="border-t border-tape/20 pt-2 mt-2">
                    <p className="font-semibold">📞 Emergency Helplines:</p>
                    <ul className="list-disc pl-5 mt-1 space-y-1">
                      <li>**Police Assistance**: Dial **15**</li>
                      <li>**Human Rights Ministry Helpline**: Dial **1099**</li>
                    </ul>
                  </div>
                </div>
              )}

              <div className="flex gap-2 justify-between pt-2">
                <Button type="button" variant="outline" onClick={handleBack}>{t("intake.back", "Go Back")}</Button>
                <Button type="submit" loading={busy}>{t("intake.next", "Next Step")}</Button>
              </div>
            </div>
          )}

          {/* STEP 5: Opposing Party */}
          {step === 5 && (
            <div className="space-y-4">
              <p className="text-[13px] text-ink-3 dark:text-paper-3/80">
                {t("intake.opponent.desc", "Details about opposing party (opponent).")}
              </p>
              <Field label={t("intake.opponent_type", "Opposing Party Type")} required>
                <select
                  value={form.opponent_type}
                  onChange={changeField("opponent_type")}
                  className="w-full h-10 px-3 border border-paper-3 bg-white text-ink dark:bg-well-2 dark:border-well-3 dark:text-paper rounded-card focus:border-seal text-[13.5px]"
                  required
                >
                  <option value="">{t("intake.opp.select", "Select Opponent Type")}</option>
                  <option value="Family">{t("intake.opp.family", "Family Member / Relative")}</option>
                  <option value="Business">{t("intake.opp.business", "Business Partner")}</option>
                  <option value="Employer">{t("intake.opp.employer", "Employer")}</option>
                  <option value="Landlord">{t("intake.opp.landlord", "Landlord")}</option>
                  <option value="Government">{t("intake.opp.gov", "Government / State")}</option>
                  <option value="Neighbor">{t("intake.opp.neighbor", "Neighbor")}</option>
                  <option value="Stranger">{t("intake.opp.stranger", "Stranger")}</option>
                </select>
              </Field>
              <Field label={t("intake.opponent_relationship", "Relationship Status")} required hint="Aapka dusri party se kya relation hai?">
                <Input value={form.opponent_relationship} onChange={changeField("opponent_relationship")} required placeholder="e.g. Landlord, Uncle, Former business partner" />
              </Field>
              <Field label={t("intake.dispute_description", "Dispute Short Description")} required>
                <Textarea value={form.dispute_description} onChange={changeField("dispute_description")} required placeholder="Dispute ke baare me thora likhein..." />
              </Field>
              <Field label={t("intake.prior_history", "Prior Legal History with them")} hint="Kya pehle bhi in ke sath koi case ya larai hui?">
                <Textarea value={form.prior_history} onChange={changeField("prior_history")} placeholder="Prior history if any..." />
              </Field>
              <div className="flex gap-2 justify-between pt-2">
                <Button type="button" variant="outline" onClick={handleBack}>{t("intake.back", "Go Back")}</Button>
                <Button type="submit" loading={busy}>{t("intake.next", "Next Step")}</Button>
              </div>
            </div>
          )}

          {/* STEP 6: History */}
          {step === 6 && (
            <div className="space-y-4">
              <p className="text-[13px] text-ink-3 dark:text-paper-3/80">
                {t("intake.history.desc", "Records your past cases and ongoing legal record.")}
              </p>
              <Field label={t("intake.past_cases", "Past FIR / Cases and Outcomes")} hint="Pehle koi FIR kati ya case chala?">
                <Textarea value={form.past_cases} onChange={changeField("past_cases")} placeholder="Write details and outcome, if any..." />
              </Field>
              <Field label={t("intake.ongoing_case", "Ongoing Cases (Court & Category)")} hint="Abhi court me chalne wala case?">
                <Textarea value={form.ongoing_case} onChange={changeField("ongoing_case")} placeholder="Ongoing court cases if any..." />
              </Field>
              <Field label={t("intake.prior_consultation", "Prior Lawyer Consultations & Satisfaction")} hint="Kya kisi lawyer se consult kiya? Kesa experience rha?">
                <Textarea value={form.prior_consultation} onChange={changeField("prior_consultation")} placeholder="Prior consultations..." />
              </Field>
              <div className="flex gap-2 justify-between pt-2">
                <Button type="button" variant="outline" onClick={handleBack}>{t("intake.back", "Go Back")}</Button>
                <Button type="submit" loading={busy}>{t("intake.next", "Next Step")}</Button>
              </div>
            </div>
          )}

          {/* STEP 7: Goal & Timeline */}
          {step === 7 && (
            <div className="space-y-4">
              <p className="text-[13px] text-ink-3 dark:text-paper-3/80">
                {t("intake.goal.desc", "Your ultimate goal and timeline expectations.")}
              </p>
              <Field label={t("intake.goal", "Ultimate Goal")} required>
                <select
                  value={form.goal}
                  onChange={changeField("goal")}
                  className="w-full h-10 px-3 border border-paper-3 bg-white text-ink dark:bg-well-2 dark:border-well-3 dark:text-paper rounded-card focus:border-seal text-[13.5px]"
                  required
                >
                  <option value="">{t("intake.goal.select", "Select Goal")}</option>
                  <option value="Justice">{t("intake.goal.justice", "Justice (Qanooni Insaf)")}</option>
                  <option value="Compensation">{t("intake.goal.comp", "Financial Compensation (Harjana)")}</option>
                  <option value="Apology">{t("intake.goal.apology", "Apology (Maafi)")}</option>
                  <option value="Settlement">{t("intake.goal.settle", "Out-of-court Settlement (Raza-mandi)")}</option>
                  <option value="Defense">{t("intake.goal.defense", "Defense against claims (Defaa)")}</option>
                  <option value="Rights">{t("intake.goal.rights", "Understand my legal rights (Qanooni Aagahi)")}</option>
                </select>
              </Field>
              <Field label={t("intake.timeline", "Timeline Expectation")} required>
                <select
                  value={form.timeline}
                  onChange={changeField("timeline")}
                  className="w-full h-10 px-3 border border-paper-3 bg-white text-ink dark:bg-well-2 dark:border-well-3 dark:text-paper rounded-card focus:border-seal text-[13.5px]"
                  required
                >
                  <option value="">{t("intake.time.select", "Select Timeline")}</option>
                  <option value="24h">{t("intake.time.24h", "Urgent (Within 24 hours)")}</option>
                  <option value="1 week">{t("intake.time.1w", "Within 1 week")}</option>
                  <option value="1 month">{t("intake.time.1m", "Within 1 month")}</option>
                  <option value="3 months">{t("intake.time.3m", "Within 3 months")}</option>
                  <option value="no rush">{t("intake.time.none", "No rush / General info")}</option>
                </select>
              </Field>
              <div className="flex gap-2 justify-between pt-2">
                <Button type="button" variant="outline" onClick={handleBack}>{t("intake.back", "Go Back")}</Button>
                <Button type="submit" loading={busy}>{t("intake.next", "Next Step")}</Button>
              </div>
            </div>
          )}

          {/* STEP 8: Your Story */}
          {step === 8 && (
            <div className="space-y-4">
              <p className="text-[13px] text-ink-3 dark:text-paper-3/80">
                {t("intake.story.desc", "Describe expected specific outcome and your story.")}
              </p>
              <Field label={t("intake.expected_outcome", "Expected specific outcome")} required>
                <Textarea value={form.expected_outcome} onChange={changeField("expected_outcome")} required placeholder="What specific result do you want to see?" />
              </Field>
              
              <Field 
                label={t("intake.full_story", "Full story in own words (Min. 100 words)")} 
                required 
                hint={`Word count: ${getWordCount(form.full_story)} / 100`}
              >
                <Textarea 
                  value={form.full_story} 
                  onChange={changeField("full_story")} 
                  required 
                  className="h-32"
                  placeholder="Apni poori kahani tafseel se likhein..." 
                />
              </Field>

              <Field label={t("intake.documents_held", "Documents held currently")} hint="Contracts, notices, receipts, etc.">
                <Textarea value={form.documents_held} onChange={changeField("documents_held")} placeholder="List any documents you currently have..." />
              </Field>

              <div className="flex gap-2 justify-between pt-2">
                <Button type="button" variant="outline" onClick={handleBack}>{t("intake.back", "Go Back")}</Button>
                <Button type="submit" loading={busy}>{t("intake.next", "Next Step")}</Button>
              </div>
            </div>
          )}

          {/* STEP 9: Consent & Summary */}
          {step === 9 && (
            <div className="space-y-4">
              <p className="text-[13px] text-ink-3 dark:text-paper-3/80">
                {t("intake.consent.desc", "Confirm consent to complete setup.")}
              </p>
              
              <Card className="p-4 bg-paper-2/50 dark:bg-well-3/50 text-[12.5px] leading-relaxed space-y-2 border border-paper-3 dark:border-well-3 text-start">
                <p className="font-semibold text-[13px] text-ink dark:text-paper">{t("intake.summary", "Biography Summary Details:")}</p>
                <div className="grid grid-cols-2 gap-2 text-ink-2 dark:text-paper-2">
                  <div>**Name**: {form.full_name}</div>
                  <div>**Gender**: {form.gender}</div>
                  <div>**City**: {form.city}</div>
                  <div>**Profession**: {form.profession}</div>
                  <div>**Stress Level**: {form.stress_level}</div>
                  <div>**Goal**: {form.goal}</div>
                </div>
              </Card>

              <label className="flex items-start gap-3 rounded-card border border-paper-3 p-3 dark:border-well-3 hover:bg-paper/10 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={form.consent} 
                  onChange={changeField("consent")} 
                  className="h-5 w-5 rounded border-paper-3 text-seal focus:ring-seal dark:border-well-3 mt-0.5" 
                  required
                />
                <div>
                  <span className="block text-[13.5px] font-medium text-ink dark:text-paper">{t("intake.consent", "Consent to Store Biography")}</span>
                  <span className="block text-[11px] text-ink-3">Aap apna profile data aur answers database me secure save karne ki ijazat dete hain.</span>
                </div>
              </label>

              <div className="rounded-card bg-paper-2/50 border border-paper-3 p-3 text-[11.5px] text-ink-3 dark:bg-well-3/50 dark:border-well-3 leading-relaxed text-start">
                ⚖️ **AI Legal Disclaimer**: {t("footer.note", "Legal Rag Ai — legal information, not legal advice.")}
              </div>

              <div className="flex gap-2 justify-between pt-2">
                <Button type="button" variant="outline" onClick={handleBack}>{t("intake.back", "Go Back")}</Button>
                <Button type="submit" loading={busy}>{t("intake.complete", "Complete Setup")}</Button>
              </div>
            </div>
          )}
        </form>
      </Card>
    </div>
  );
}
