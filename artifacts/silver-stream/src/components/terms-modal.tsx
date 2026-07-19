import { useState } from "react";
import { getTermsDoc } from "@/lib/terms-content";

interface TermsModalProps {
  /** Called when the user closes the modal */
  onClose?: () => void;
}

export function TermsModal({ onClose }: TermsModalProps) {
  const doc = getTermsDoc();
  const isAr = doc.heading.startsWith("شروط");

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
    >
      {/* Sheet / Modal */}
      <div
        className="relative w-full sm:max-w-lg max-h-[88dvh] sm:max-h-[80dvh] flex flex-col
                   bg-card border border-border/60 shadow-2xl
                   rounded-t-3xl sm:rounded-3xl overflow-hidden"
        dir={isAr ? "rtl" : "ltr"}
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-border/40 flex-shrink-0">
          {/* Drag handle (mobile) */}
          <div className="w-10 h-1 rounded-full bg-muted-foreground/30 mx-auto mb-5 sm:hidden" />

          <p className="text-[11px] font-medium text-muted-foreground/60 tracking-widest uppercase mb-1">
            {doc.version}
          </p>
          <h2 className="text-xl font-bold leading-snug">{doc.heading}</h2>
          <p className="text-sm text-muted-foreground mt-1">{doc.subtitle}</p>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-6">

          {/* Apology notice */}
          {doc.notice && (
            <div className="bg-blue-500/10 border border-blue-500/25 rounded-2xl px-4 py-3.5 flex gap-3 items-start">
              <span className="text-lg mt-0.5 shrink-0">🤝</span>
              <p className="text-sm text-blue-600 dark:text-blue-400 leading-relaxed">
                {doc.notice}
              </p>
            </div>
          )}

          {doc.sections.map((section, i) => (
            <div key={i}>
              <h3 className="text-sm font-semibold text-foreground mb-2 leading-snug">
                {section.title}
              </h3>
              <ul className="space-y-1.5">
                {section.body.map((line, j) => (
                  <li
                    key={j}
                    className="text-sm text-muted-foreground leading-relaxed"
                  >
                    {line}
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* Footer note */}
          <div className="pt-2 pb-1">
            <div className="h-px bg-border/40 mb-4" />
            <p className="text-xs text-muted-foreground/70 leading-relaxed text-center italic">
              {doc.footer}
            </p>
          </div>
        </div>

        {/* Close button */}
        <div className="px-6 pb-6 pt-3 flex-shrink-0 border-t border-border/40">
          <button
            onClick={onClose}
            className="w-full h-11 rounded-xl bg-primary text-primary-foreground
                       text-sm font-semibold transition-opacity hover:opacity-90 active:opacity-80"
          >
            {isAr ? "فهمت وأوافق" : "Got it"}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Rectangular button that opens the TermsModal */
export function TermsButton() {
  const [open, setOpen] = useState(false);
  const isAr = (navigator.language || "").startsWith("ar");

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full h-11 rounded-xl border border-border/60 bg-secondary/40
                   text-sm font-semibold text-foreground tracking-wide
                   flex items-center justify-center gap-2
                   hover:bg-secondary/70 active:scale-[0.98] transition-all"
      >
        <span className="text-base">📋</span>
        {isAr ? "شروط التطبيق (مهم)" : "App Terms (Important)"}
      </button>

      {open && <TermsModal onClose={() => setOpen(false)} />}
    </>
  );
}
