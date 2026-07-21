import { useState, useEffect } from "react";
import { Icon } from "../components/Icon";
import { Button, Card, Select, Badge, Skeleton, Empty, cx } from "../components/ui";
import { apiFetch } from "../lib/api";
import { useLang } from "../lib/i18n";

const CITIES = ["Karachi", "Lahore", "Islamabad", "Rawalpindi", "Peshawar", "Quetta", "Multan", "Faisalabad"];
const AREAS  = ["Criminal Law", "Family Law", "Property Law", "Labour Law", "Corporate Law", "Civil Litigation", "Constitutional Law"];

export default function Finder({ go }) {
  const [city, setCity] = useState("");
  const [area, setArea] = useState("");
  const [lawyers, setLawyers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [contact, setContact] = useState(null);

  const { t, rtl } = useLang();

  useEffect(() => {
    let alive = true;
    apiFetch("/api/lawyers")
      .then((d) => { if (alive) setLawyers(Array.isArray(d) ? d : d.lawyers || []); })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  const results = lawyers.filter((l) => (!city || l.city === city) && (!area || l.area === area));

  return (
    <div className="mx-auto max-w-4xl animate-rise px-4 py-10 sm:px-6">
      <p className="eyebrow mb-3">{t("finder.eyebrow", "Directory")}</p>
      <h1 className="font-display text-[30px] font-normal leading-tight">{t("finder.title", "Find a lawyer")}</h1>
      <p className="mt-2 max-w-xl text-[14px] leading-relaxed text-ink-2 dark:text-paper-2/80">
        {t("finder.subtitle", "Practitioners by city and area of practice. Legal Rag Ai doesn't vet or rank them — verify enrolment with the relevant Bar Council before you engage anyone.")}
      </p>

      <div className="mt-6 grid gap-2 sm:grid-cols-2">
        <Select value={city} onChange={(e) => setCity(e.target.value)} aria-label={t("Karachi", "City")}>
          <option value="">{t("finder.all_cities", "All cities")}</option>
          {CITIES.map((c) => <option key={c} value={c}>{t(c, c)}</option>)}
        </Select>
        <Select value={area} onChange={(e) => setArea(e.target.value)} aria-label={t("Criminal Law", "Practice area")}>
          <option value="">{t("finder.all_practices", "All practice areas")}</option>
          {AREAS.map((a) => <option key={a} value={a}>{t(a, a)}</option>)}
        </Select>
      </div>

      <p className="mt-4 text-[12px] text-ink-3">
        {loading ? t("a.loading", "Loading…") : `${results.length} ${results.length === 1 ? t("finder.lawyer", "lawyer") : t("finder.lawyers", "lawyers")}`}
        {(city || area) && !loading && (
          <button onClick={() => { setCity(""); setArea(""); }} className="ms-2 underline underline-offset-2 hover:text-ink dark:hover:text-paper">
            {t("finder.clear_filters", "clear filters")}
          </button>
        )}
      </p>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {loading && [0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-32" />)}
        {!loading && results.map((l) => (
          <Card key={l.id || l.name} className="flex flex-col p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 font-display text-[15px] font-medium">
                  <span className="truncate">{l.name}</span>
                  {l.verified && <Icon n="chk" s={12} className="shrink-0 text-seal dark:text-seal-bright" title={t("finder.verified_listing", "Verified listing")} />}
                </p>
                <p className="mt-0.5 text-[12px] text-ink-3">{t(l.area, l.area)} · {t(l.city, l.city)}</p>
              </div>
              {l.rating != null && (
                <span className="shrink-0 font-mono text-[12px] text-seal dark:text-seal-bright">
                  {Number(l.rating).toFixed(1)}
                </span>
              )}
            </div>

            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[12px] text-ink-3">
              {l.exp != null && <span>{l.exp} {t("finder.yrs_exp", "yrs experience")}</span>}
              {l.languages?.length > 0 && <span>{l.languages.map(lang => t(lang, lang)).join(", ")}</span>}
            </div>

            {l.about && (
              <p className="mt-2 line-clamp-2 text-[12.5px] leading-relaxed text-ink-2 dark:text-paper-2/80">{l.about}</p>
            )}

            {l.courts?.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {l.courts.map((c) => <Badge key={c} tone="neutral">{t(c, c)}</Badge>)}
              </div>
            )}

            {l.fee && (
              <p className="mt-2.5 font-mono text-[12px] text-ink dark:text-paper">{l.fee}</p>
            )}

            <div className="mt-3 flex gap-1.5 pt-1">
              <Button size="sm" variant="outline" onClick={() => setContact(l)}>
                <Icon n="phone" s={12} /> {t("a.contact", "Contact")}
              </Button>
              <Button size="sm" variant="quiet" onClick={() => go("booking")}>{t("finder.book", "Book a consult")}</Button>
            </div>
          </Card>
        ))}
      </div>

      {!loading && !results.length && (
        <Empty
          title={t("finder.empty_title", "No lawyers match those filters")}
          action={<Button variant="outline" onClick={() => { setCity(""); setArea(""); }}>{t("finder.clear_filters", "Clear filters")}</Button>}
        >
          {t("finder.empty_desc", "Try a nearby city, or widen the practice area.")}
        </Empty>
      )}

      {contact && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4 backdrop-blur-sm" onClick={() => setContact(null)}>
          <Card stamp className="w-full max-w-sm animate-rise p-6" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-start justify-between">
              <div>
                <p className="font-display text-[18px] font-medium">{contact.name}</p>
                <p className="text-[12px] text-ink-3">{t(contact.area, contact.area)} · {t(contact.city, contact.city)}</p>
              </div>
              <button onClick={() => setContact(null)} className="text-ink-3 hover:text-ink dark:hover:text-paper" aria-label={t("a.close", "Close")}>
                <Icon n="close" s={16} />
              </button>
            </div>
            <div className="space-y-2 text-[13px]">
              {contact.phone && (
                <a href={`tel:${contact.phone}`} className="flex items-center gap-2 text-seal dark:text-seal-bright">
                  <Icon n="phone" s={13} /> {contact.phone}
                </a>
              )}
              {contact.whatsapp && (
                <a
                  href={`https://wa.me/${String(contact.whatsapp).replace(/\D/g, "")}`}
                  target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 text-seal dark:text-seal-bright"
                >
                  <Icon n="msg" s={13} /> WhatsApp
                </a>
              )}
              {contact.email && (
                <a href={`mailto:${contact.email}`} className="flex items-center gap-2 text-seal dark:text-seal-bright">
                  <Icon n="note" s={13} /> {contact.email}
                </a>
              )}
              {!contact.phone && !contact.email && !contact.whatsapp && (
                <p className="text-ink-3">{t("finder.no_contact", "No contact details on file.")}</p>
              )}
              {(contact.chamber || contact.edu) && (
                <div className="border-t border-paper-3 pt-2 text-[12px] text-ink-3 dark:border-well-3">
                  {contact.chamber && <p>{t("finder.chamber", "Chamber")}: {contact.chamber}</p>}
                  {contact.edu && <p>{contact.edu}</p>}
                </div>
              )}
            </div>
            <p className="mt-4 text-[11.5px] leading-relaxed text-ink-3">
              {t("finder.disclaimer", "Verify enrolment with the Bar Council before engaging. Legal Rag Ai does not vet listings.")}
            </p>
          </Card>
        </div>
      )}
    </div>
  );
}
