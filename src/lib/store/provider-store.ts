import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export interface ProviderConfig {
  providerId: string | null; // 'groq' | 'openrouter' | 'gemini' | 'together' | 'cerebras' | ...
  apiKey: string;
  model: string; // model id
}

interface ProviderState extends ProviderConfig {
  setProvider: (config: Partial<ProviderConfig>) => void;
  clear: () => void;
  isConfigured: () => boolean;
  /**
   * Returns headers object for fetch calls hitting LLM-backed endpoints.
   * Empty when no API key is set (the backend falls back to Z.ai sandbox).
   */
  getHeaders: () => Record<string, string>;
}

/**
 * Provider store — persists user-supplied LLM API key / model / provider id
 * to localStorage (`eidolon-provider`). Keys NEVER leave the browser except
 * as x-llm-* headers in fetch calls to our own backend (relative paths).
 */
export const useProviderStore = create<ProviderState>()(
  persist(
    (set, get) => ({
      providerId: null,
      apiKey: "",
      model: "",
      setProvider: (config) => set(config),
      clear: () => set({ providerId: null, apiKey: "", model: "" }),
      isConfigured: () => !!get().apiKey,
      getHeaders: (): Record<string, string> => {
        const s = get();
        if (!s.apiKey) return {};
        return {
          "x-llm-provider": s.providerId || "",
          "x-llm-api-key": s.apiKey,
          "x-llm-model": s.model,
        };
      },
    }),
    {
      name: "eidolon-provider",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
