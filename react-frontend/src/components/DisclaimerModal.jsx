import { Button } from "./ui";
import { Icon } from "./Icon";
import { useLang } from "../lib/i18n";
import Logo from "./Logo";

/* Says what the product is and isn't, in plain words, once. It doesn't
   apologise and it doesn't hedge into meaninglessness — a person about to ask
   about an FIR needs to know exactly how much weight this can bear. */
export const DisclaimerModal = ({ onAccept }) => {
  const { t } = useLang();
  return (
  <div className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/50 p-4 backdrop-blur-sm">
    <div className="stamp w-full max-w-md animate-rise p-7">
      <div className="mb-4 flex items-center gap-2.5">
        <Logo size={34} className="shrink-0" />
        <div>
          <p className="font-display text-[17px] font-semibold leading-tight">{t("disclaimer.title", "Before you start")}</p>
          <p className="eyebrow mt-0.5">Read this once</p>
        </div>
      </div>

      <div className="space-y-3 text-[13px] leading-relaxed text-ink-2 dark:text-paper-2/85">
        <p>
          Legal Rag Ai explains Pakistani law in plain language. It is <strong>information, not legal advice</strong>,
          and it is not a substitute for a lawyer.
        </p>
        <p>
          Answers are drawn from statute text where a match is found. Every answer tells you which
          law it used — or tells you plainly when it found none. Check that line before you rely on anything.
        </p>
        <p className="flex items-start gap-2 rounded-card bg-tape-tint/60 px-3 py-2 text-[12.5px] text-tape dark:bg-tape/10">
          <Icon n="warn" s={14} className="mt-px shrink-0" />
          If you are facing arrest, a court deadline, or violence, contact a lawyer now. Do not wait on an app.
        </p>
      </div>

      <Button className="mt-6 w-full" size="lg" onClick={onAccept}>
        {t("a.continue", "I understand — continue")}
      </Button>
    </div>
  </div>
  );
};

export default DisclaimerModal;
