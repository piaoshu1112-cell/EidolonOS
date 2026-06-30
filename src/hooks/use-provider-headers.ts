"use client";

import { useProviderStore } from "@/lib/store/provider-store";

/**
 * Convenience hook that returns the current LLM provider headers (empty when
 * no API key configured). Sprinkle `...useProviderHeaders()` into any fetch
 * call whose backend route hits the LLM (chat converse, AA2P converse, etc.).
 */
export function useProviderHeaders(): Record<string, string> {
  // We intentionally inline the selector here so the hook re-renders
  // consumers whenever apiKey / providerId / model change.
  const apiKey = useProviderStore((s) => s.apiKey);
  const providerId = useProviderStore((s) => s.providerId);
  const model = useProviderStore((s) => s.model);
  if (!apiKey) return {};
  return {
    "x-llm-provider": providerId || "",
    "x-llm-api-key": apiKey,
    "x-llm-model": model,
  };
}
