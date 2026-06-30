"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ExternalLink,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Save,
  Trash2,
  Cpu,
  CheckCircle2,
  Info,
} from "lucide-react";
import { useProviderStore } from "@/lib/store/provider-store";
import { useLangStore } from "@/lib/store/lang-store";
import { t } from "@/lib/i18n/translations";
import { HolographicCard } from "@/components/shared/holographic-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

/* ===== Built-in provider catalog (used as fallback when /api/models
 * is not provisioned by the backend). All five are well-known free-tier
 * OpenAI-compatible gateways. ===== */
export type ProviderModel = { id: string; label?: string };
export type ProviderCatalogEntry = {
  id: string;
  name: string;
  docsUrl: string;
  freeTier: string;
  models: ProviderModel[];
};

export const BUILTIN_PROVIDERS: ProviderCatalogEntry[] = [
  {
    id: "groq",
    name: "Groq",
    docsUrl: "https://console.groq.com/keys",
    freeTier: "Very fast inference · generous free tier (Llama / Mixtral)",
    models: [
      { id: "llama-3.3-70b-versatile" },
      { id: "llama-3.1-8b-instant" },
      { id: "llama3-70b-8192" },
      { id: "mixtral-8x7b-32768" },
      { id: "gemma2-9b-it" },
    ],
  },
  {
    id: "openrouter",
    name: "OpenRouter",
    docsUrl: "https://openrouter.ai/keys",
    freeTier: "Aggregator · many free models (look for :free suffix)",
    models: [
      { id: "meta-llama/llama-3.3-70b-instruct:free" },
      { id: "google/gemini-2.0-flash-exp:free" },
      { id: "qwen/qwen-2.5-72b-instruct:free" },
      { id: "mistralai/mistral-7b-instruct:free" },
      { id: "openai/gpt-oss-20b:free" },
    ],
  },
  {
    id: "gemini",
    name: "Google Gemini",
    docsUrl: "https://aistudio.google.com/app/apikey",
    freeTier: "15 RPM / 1M tokens per day on Gemini Flash",
    models: [
      { id: "gemini-2.0-flash" },
      { id: "gemini-2.0-flash-lite" },
      { id: "gemini-1.5-flash" },
      { id: "gemini-1.5-pro" },
    ],
  },
  {
    id: "together",
    name: "Together AI",
    docsUrl: "https://api.together.xyz/settings/api-keys",
    freeTier: "$5 free credits at signup · OpenAI-compatible endpoint",
    models: [
      { id: "meta-llama/Llama-3.3-70B-Instruct-Turbo" },
      { id: "meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo" },
      { id: "Qwen/Qwen2.5-72B-Instruct-Turbo" },
      { id: "mistralai/Mixtral-8x7B-Instruct-v0.1" },
    ],
  },
  {
    id: "cerebras",
    name: "Cerebras",
    docsUrl: "https://cloud.cerebras.ai",
    freeTier: "Ultra-low-latency inference · free tier with rate limits",
    models: [
      { id: "llama-3.3-70b" },
      { id: "llama3.1-8b" },
      { id: "qwen-2.5-coder-32b" },
    ],
  },
];

type ApiProviderList = {
  providers?: ProviderCatalogEntry[];
};

export function ProviderSettings() {
  const lang = useLangStore((s) => s.lang);
  const providerId = useProviderStore((s) => s.providerId);
  const apiKey = useProviderStore((s) => s.apiKey);
  const model = useProviderStore((s) => s.model);
  const setProvider = useProviderStore((s) => s.setProvider);
  const clearProvider = useProviderStore((s) => s.clear);

  // Drafts are initialized ONCE from the persisted store (zustand persist
  // hydrates synchronously from localStorage on first render, so initial
  // values are already correct). Subsequent resets happen inline in
  // handleClear/handleSave (no effect-based sync needed).
  const [draftProviderId, setDraftProviderId] = useState<string>(providerId ?? "");
  const [draftApiKey, setDraftApiKey] = useState<string>(apiKey);
  const [draftModel, setDraftModel] = useState<string>(model);
  const [showKey, setShowKey] = useState(false);

  // Try to fetch /api/models for a richer catalog; fall back to built-in list.
  // This endpoint is optional — backend may or may not provision it.
  const { data: apiProviders, isError: apiError } = useQuery<ProviderCatalogEntry[]>({
    queryKey: ["models"],
    queryFn: async () => {
      const res = await fetch("/api/models", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as ApiProviderList;
      if (!data.providers || data.providers.length === 0) {
        throw new Error("Empty provider list");
      }
      return data.providers;
    },
    retry: 0,
    staleTime: 5 * 60_000,
  });

  // Merge: prefer API catalog when available, otherwise use built-in.
  const providers = useMemo<ProviderCatalogEntry[]>(() => {
    if (apiProviders && apiProviders.length > 0) return apiProviders;
    return BUILTIN_PROVIDERS;
  }, [apiProviders]);

  const selectedProvider = useMemo(
    () => providers.find((p) => p.id === draftProviderId) ?? null,
    [providers, draftProviderId]
  );

  // Compute the effective draft model: if it isn't in the selected
  // provider's list, fall back to the provider's first model. This avoids
  // an effect-based setState while still auto-selecting a sensible default.
  const effectiveDraftModel =
    selectedProvider && selectedProvider.models.length > 0
      ? selectedProvider.models.find((m) => m.id === draftModel)
        ? draftModel
        : selectedProvider.models[0].id
      : draftModel;

  const isSaved =
    !!providerId &&
    !!apiKey &&
    providerId === draftProviderId &&
    apiKey === draftApiKey &&
    (model ?? "") === effectiveDraftModel;

  const handleSave = () => {
    if (!draftProviderId) {
      toast.error(lang === "zh" ? "请选择提供商" : "Select a provider first");
      return;
    }
    if (!draftApiKey.trim()) {
      toast.error(lang === "zh" ? "请输入 API 密钥" : "API key is required");
      return;
    }
    setProvider({
      providerId: draftProviderId,
      apiKey: draftApiKey.trim(),
      model: effectiveDraftModel,
    });
    // Sync local model state with the effective value we just saved.
    setDraftModel(effectiveDraftModel);
    toast.success(t(lang, "provider.saved"));
  };

  const handleClear = () => {
    clearProvider();
    setDraftProviderId("");
    setDraftApiKey("");
    setDraftModel("");
    toast.info(t(lang, "provider.cleared"));
  };

  const configured = !!apiKey && !!providerId;
  const providerName =
    providers.find((p) => p.id === providerId)?.name ?? providerId ?? "";

  return (
    <HolographicCard
      title={t(lang, "provider.title")}
      subtitle={t(lang, "provider.subtitle")}
      glow={1}
      className="h-full"
      bodyClassName="overflow-y-auto scrollbar-cyan p-2 flex flex-col gap-3"
      actions={
        configured ? (
          <Badge className="bg-emerald-400/10 text-emerald-400 border-emerald-400/30 text-[10px]">
            <CheckCircle2 className="size-3" /> {t(lang, "provider.configured")}
          </Badge>
        ) : (
          <Badge className="bg-amber-400/10 text-eidolon-amber border-amber-400/30 text-[10px]">
            <Info className="size-3" /> {t(lang, "provider.notConfigured")}
          </Badge>
        )
      }
    >
      {/* Status summary */}
      <div
        className={cn(
          "rounded-md border p-2 text-[11px] flex items-start gap-2",
          configured
            ? "border-emerald-400/30 bg-emerald-400/5 text-emerald-400/90"
            : "border-amber-400/30 bg-amber-400/5 text-eidolon-amber/90"
        )}
      >
        <Cpu className="size-3.5 shrink-0 mt-0.5" aria-hidden />
        <div className="min-w-0">
          {configured ? (
            <span className="font-mono break-all">
              {providerName} · {model || "—"}
            </span>
          ) : (
            <span>{t(lang, "provider.notConfigured")}</span>
          )}
        </div>
      </div>

      {/* Provider dropdown */}
      <div className="grid gap-1.5">
        <Label htmlFor="prov-select" className="text-[10px] uppercase tracking-wider text-eidolon-cyan/80">
          {t(lang, "provider.select")}
        </Label>
        <Select
          value={draftProviderId}
          onValueChange={(v) => {
            setDraftProviderId(v);
            // Reset model to empty so effectiveDraftModel computation
            // picks the new provider's first model.
            setDraftModel("");
          }}
        >
          <SelectTrigger id="prov-select" className="bg-cyan-400/5 border-cyan-400/25 h-8 text-xs">
            <SelectValue placeholder={t(lang, "provider.providerPlaceholder")} />
          </SelectTrigger>
          <SelectContent className="hologram-panel-strong border-cyan-400/40">
            {providers.map((p) => (
              <SelectItem key={p.id} value={p.id} className="text-xs">
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* API key input */}
      <div className="grid gap-1.5">
        <Label htmlFor="prov-key" className="text-[10px] uppercase tracking-wider text-eidolon-cyan/80">
          {t(lang, "provider.apiKey")}
        </Label>
        <div className="relative">
          <KeyRound className="absolute left-2 top-1/2 -translate-y-1/2 size-3.5 text-eidolon-cyan/50" aria-hidden />
          <Input
            id="prov-key"
            type={showKey ? "text" : "password"}
            value={draftApiKey}
            onChange={(e) => setDraftApiKey(e.target.value)}
            placeholder={t(lang, "provider.apiKeyPlaceholder")}
            autoComplete="off"
            spellCheck={false}
            className="bg-cyan-400/5 border-cyan-400/25 text-xs h-8 pl-7 pr-9 font-mono"
          />
          <button
            type="button"
            onClick={() => setShowKey((s) => !s)}
            aria-label={showKey ? t(lang, "provider.hideKey") : t(lang, "provider.showKey")}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 text-eidolon-cyan/60 hover:text-eidolon-cyan"
          >
            {showKey ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
          </button>
        </div>
      </div>

      {/* Model dropdown */}
      <div className="grid gap-1.5">
        <Label htmlFor="prov-model" className="text-[10px] uppercase tracking-wider text-eidolon-cyan/80">
          {t(lang, "provider.model")}
        </Label>
        {selectedProvider && selectedProvider.models.length > 0 ? (
          <Select value={effectiveDraftModel} onValueChange={(v) => setDraftModel(v)}>
            <SelectTrigger id="prov-model" className="bg-cyan-400/5 border-cyan-400/25 h-8 text-xs">
              <SelectValue placeholder={t(lang, "provider.modelPlaceholder")} />
            </SelectTrigger>
            <SelectContent className="hologram-panel-strong border-cyan-400/40 max-h-64">
              {selectedProvider.models.map((m) => (
                <SelectItem key={m.id} value={m.id} className="text-xs font-mono">
                  {m.label ?? m.id}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Input
            id="prov-model"
            value={draftModel}
            onChange={(e) => setDraftModel(e.target.value)}
            placeholder={t(lang, "provider.modelPlaceholder")}
            className="bg-cyan-400/5 border-cyan-400/25 text-xs h-8 font-mono"
          />
        )}
      </div>

      {/* Free tier + Get key link */}
      {selectedProvider && (
        <div className="rounded-md border border-cyan-400/15 bg-cyan-400/[0.03] p-2 space-y-1.5">
          <div className="text-[10px] uppercase tracking-wider text-eidolon-cyan/70 flex items-center gap-1">
            <Info className="size-3" /> {t(lang, "provider.freeTier")}
          </div>
          <p className="text-[11px] text-eidolon-text/70 leading-snug">
            {selectedProvider.freeTier}
          </p>
          <a
            href={selectedProvider.docsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[11px] text-eidolon-cyan hover:text-eidolon-cyan/80 underline underline-offset-2"
          >
            <ExternalLink className="size-3" />
            {t(lang, "provider.getKey")}
          </a>
        </div>
      )}

      {/* Save / Clear */}
      <div className="flex items-center gap-2 pt-1">
        <Button
          type="button"
          size="sm"
          onClick={handleSave}
          disabled={isSaved}
          className="h-8 flex-1 text-[11px] bg-eidolon-cyan text-eidolon-bg hover:bg-eidolon-cyan/90 font-semibold"
        >
          <Save className="size-3" />
          {t(lang, "provider.save")}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={handleClear}
          disabled={!configured && !draftApiKey && !draftProviderId}
          className="h-8 px-3 text-[11px] border-amber-400/40 text-eidolon-amber hover:bg-amber-400/10 hover:text-eidolon-amber"
        >
          <Trash2 className="size-3" />
          {t(lang, "provider.clear")}
        </Button>
      </div>

      {/* Note */}
      <div className="rounded-md border border-violet-400/15 bg-violet-400/[0.03] p-2 flex items-start gap-2">
        <Info className="size-3 text-eidolon-violet/70 shrink-0 mt-0.5" aria-hidden />
        <p className="text-[10px] text-eidolon-text/60 leading-snug">
          {t(lang, "provider.note")}
        </p>
      </div>

      {/* Fetch-error banner (non-blocking) */}
      {apiError && (
        <div className="text-[10px] text-eidolon-amber/80 flex items-center gap-1.5">
          <Loader2 className="size-3" aria-hidden />
          {t(lang, "provider.fetchFailed")}
        </div>
      )}
    </HolographicCard>
  );
}
