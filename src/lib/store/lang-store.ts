import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Lang } from "@/lib/i18n/translations";

interface LangState {
  lang: Lang;
  setLang: (lang: Lang) => void;
  toggle: () => void;
}

/**
 * Language store — persisted to localStorage (`eidolon-lang`).
 *
 * Components read via `useLangStore((s) => s.lang)` and call the exported
 * `t(lang, key)` helper for lookups. The store deliberately uses a small
 * surface so we can switch strategies (cookie, URL, etc.) without touching
 * call-sites.
 */
export const useLangStore = create<LangState>()(
  persist(
    (set, get) => ({
      lang: "en",
      setLang: (lang) => set({ lang }),
      toggle: () => set({ lang: get().lang === "en" ? "zh" : "en" }),
    }),
    {
      name: "eidolon-lang",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
