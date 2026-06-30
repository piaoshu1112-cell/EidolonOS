"use client";

import { Languages } from "lucide-react";
import { useLangStore } from "@/lib/store/lang-store";
import { t } from "@/lib/i18n/translations";
import { cn } from "@/lib/utils";

/**
 * LangToggle — header button that flips zh ↔ en.
 * Shows the *opposite* language name (i.e. the one we'll switch TO).
 */
export function LangToggle({ className }: { className?: string }) {
  const lang = useLangStore((s) => s.lang);
  const toggle = useLangStore((s) => s.toggle);
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={`Switch language (current: ${lang})`}
      title={lang === "en" ? "切换到中文" : "Switch to English"}
      className={cn(
        "group flex items-center gap-1.5 px-2 py-1 rounded-md",
        "bg-cyan-400/5 border border-cyan-400/30 text-eidolon-cyan/90",
        "hover:bg-cyan-400/15 hover:border-cyan-400/50 hover:text-eidolon-cyan",
        "transition-colors text-[10px] font-mono uppercase tracking-wider",
        className
      )}
    >
      <Languages className="size-3.5 group-hover:scale-110 transition-transform" aria-hidden />
      <span className="eidolon-text-glow font-semibold">{t(lang, "lang.toggle")}</span>
    </button>
  );
}
