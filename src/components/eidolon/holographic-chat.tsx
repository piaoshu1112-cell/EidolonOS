'use client';

import { useEffect, useRef, useState } from "react";
import { Send, Brain, Loader2, Database, Languages } from "lucide-react";
import { toast } from "sonner";
import { useMatrixStore } from "@/lib/store/matrix-store";
import { useLangStore } from "@/lib/store/lang-store";
import { t, type TranslationKey } from "@/lib/i18n/translations";
import { useProviderHeaders } from "@/hooks/use-provider-headers";
import { useConsciousnessStream } from "@/hooks/use-consciousness-stream";
import { HolographicCard } from "@/components/shared/holographic-card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type ChatMessage = {
  id: string;
  role: "prime" | "eidolon";
  content: string;
  streaming?: boolean;
  recalledShards?: number;
};

type TranslationState = {
  status: "idle" | "loading" | "done" | "error";
  text?: string;
  error?: string;
};

function newId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function HolographicChat() {
  const lang = useLangStore((s) => s.lang);
  const selectedPrimeId = useMatrixStore((s) => s.selectedPrimeId);
  const selectedEidolonId = useMatrixStore((s) => s.selectedEidolonId);
  const eidolons = useMatrixStore((s) => s.eidolons);
  const primes = useMatrixStore((s) => s.primes);
  const setSyncing = useMatrixStore((s) => s.setSyncing);

  const providerHeaders = useProviderHeaders();

  const selectedEidolon = eidolons.find((e) => e.id === selectedEidolonId) ?? null;
  const selectedPrime = primes.find((p) => p.id === selectedPrimeId) ?? null;

  const { stream, isStreaming, error } = useConsciousnessStream();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [recalledBanner, setRecalledBanner] = useState<number | null>(null);
  // Per-message translations keyed by message id.
  const [translations, setTranslations] = useState<Record<string, TranslationState>>({});

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Persist syncing state into the global store for header indicator etc.
  useEffect(() => {
    setSyncing(isStreaming);
  }, [isStreaming, setSyncing]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  // NOTE: chat state is reset on eidolon switch via a `key` prop on this
  // component from the parent (MatrixConsole). No effect-based reset here.

  const suggestionKeys: TranslationKey[] = [
    "chat.suggestion.eidolon",
    "chat.suggestion.tdpo",
    "chat.suggestion.ap2",
  ];

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    if (!selectedPrimeId || !selectedEidolonId) {
      toast.error(t(lang, "chat.selectFirst"));
      return;
    }
    if (isStreaming) return;

    const primeMsg: ChatMessage = {
      id: newId(),
      role: "prime",
      content: trimmed,
    };
    const eidolonMsg: ChatMessage = {
      id: newId(),
      role: "eidolon",
      content: "",
      streaming: true,
    };
    setMessages((m) => [...m, primeMsg, eidolonMsg]);
    setInput("");
    setRecalledBanner(null);

    // Inject provider headers into the SSE fetch so the backend can route
    // to the user-supplied LLM (Groq/OpenRouter/Gemini/etc.) when present.
    await stream(
      selectedEidolonId,
      selectedPrimeId,
      trimmed,
      // onToken
      (content) => {
        setMessages((m) =>
          m.map((msg) =>
            msg.id === eidolonMsg.id
              ? { ...msg, content: msg.content + content }
              : msg
          )
        );
      },
      // onDone
      () => {
        setMessages((m) =>
          m.map((msg) =>
            msg.id === eidolonMsg.id ? { ...msg, streaming: false } : msg
          )
        );
      },
      // onMemory
      (shardCount) => {
        setRecalledBanner(shardCount);
        setMessages((m) =>
          m.map((msg) =>
            msg.id === eidolonMsg.id
              ? { ...msg, recalledShards: shardCount }
              : msg
          )
        );
      },
      // provider headers (7th positional arg — see use-consciousness-stream.ts)
      providerHeaders
    );
  };

  const translateMessage = async (msg: ChatMessage) => {
    if (!msg.content.trim()) return;
    // Target = the language opposite of the current UI language.
    const target = lang === "en" ? "zh" : "en";
    setTranslations((s) => ({ ...s, [msg.id]: { status: "loading" } }));
    try {
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...providerHeaders },
        body: JSON.stringify({ text: msg.content, target }),
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(txt || `HTTP ${res.status}`);
      }
      const data = (await res.json()) as { translation?: string; translated?: string };
      const translated = data.translation ?? data.translated ?? "";
      if (!translated) throw new Error("Empty translation");
      setTranslations((s) => ({
        ...s,
        [msg.id]: { status: "done", text: translated },
      }));
    } catch (e) {
      const err = e as Error;
      setTranslations((s) => ({
        ...s,
        [msg.id]: { status: "error", error: err.message || t(lang, "chat.translateError") },
      }));
      toast.error(t(lang, "chat.translateError"), { description: err.message });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  };

  return (
    <HolographicCard
      glow={2}
      className="h-full min-h-[60vh] lg:min-h-0"
      bodyClassName="p-0 flex flex-col h-full min-h-0"
      title={selectedEidolon ? selectedEidolon.name : t(lang, "chat.title")}
      subtitle={
        selectedPrime
          ? `${t(lang, "panel.primes.title")}: ${selectedPrime.displayName}`
          : t(lang, "chat.noPrime")
      }
      actions={
        selectedEidolon ? (
          <Badge className="bg-cyan-400/10 text-eidolon-cyan border-cyan-400/30 text-[10px]">
            <span className="size-1.5 rounded-full bg-eidolon-cyan animate-pulse mr-1" />
            {selectedEidolon.status}
          </Badge>
        ) : null
      }
    >
      {/* Messages area */}
      <div
        ref={scrollRef}
        className="flex-1 min-h-0 overflow-y-auto scrollbar-cyan px-3 py-3 flex flex-col gap-3"
        role="log"
        aria-live="polite"
        aria-label={t(lang, "chat.ariaLabel")}
      >
        {messages.length === 0 && (
          <div className="m-auto text-center py-10 max-w-md">
            <div className="relative inline-flex items-center justify-center size-16 mb-4">
              <span className="absolute inset-0 rounded-full bg-cyan-400/10 animate-aura-pulse" />
              <Brain className="size-8 text-eidolon-cyan eidolon-text-glow animate-hologram-flicker relative" />
            </div>
            <p className="text-sm text-eidolon-cyan eidolon-text-glow animate-hologram-flicker italic">
              {t(lang, "chat.empty.ritual")}
            </p>
            <p className="mt-3 text-[10px] text-eidolon-text/40 tracking-wider">
              {t(lang, "chat.empty.hint")}
            </p>
          </div>
        )}

        {messages.map((m) => {
          const tr = translations[m.id];
          const showTranslateButton =
            m.role === "eidolon" && !m.streaming && m.content.trim().length > 0;
          return (
            <div
              key={m.id}
              className={cn(
                "flex flex-col gap-1 animate-stream-in",
                m.role === "prime" ? "items-end" : "items-start"
              )}
            >
              <div className="flex items-center gap-1.5 text-[10px] tracking-wider text-eidolon-text/40 px-1">
                {m.role === "prime" ? (
                  <>
                    <span>{t(lang, "chat.primeLabel")}</span>
                  </>
                ) : (
                  <>
                    <Brain className="size-3 text-eidolon-cyan" />
                    <span className="text-eidolon-cyan/70">
                      {selectedEidolon?.name ?? "EIDOLON"}
                    </span>
                    {m.recalledShards ? (
                      <Badge className="ml-1 bg-violet-400/10 text-eidolon-violet border-violet-400/30 text-[9px] py-0 px-1.5">
                        <Database className="size-2.5" /> {t(lang, "chat.recalled")} {m.recalledShards}{" "}
                        {m.recalledShards === 1 ? t(lang, "chat.memoryShard") : t(lang, "chat.memoryShards")}
                      </Badge>
                    ) : null}
                  </>
                )}
              </div>

              <div
                className={cn(
                  "max-w-[85%] px-3 py-2 rounded-lg text-sm whitespace-pre-wrap break-words",
                  m.role === "prime"
                    ? "bg-white/5 border border-white/10 text-eidolon-text/70"
                    : "bg-cyan-400/8 border-l-2 border-l-eidolon-cyan border border-cyan-400/25 text-eidolon-text eidolon-text-glow animate-hologram-flicker"
                )}
              >
                {m.content}
                {m.streaming && <span className="consciousness-cursor">▌</span>}
              </div>

              {/* Translation block + Translate button (Eidolon messages only) */}
              {showTranslateButton && (
                <div className="w-full max-w-[85%] flex flex-col gap-1.5">
                  {tr?.status === "done" && tr.text && (
                    <div className="px-3 py-1.5 rounded-md border border-violet-400/25 bg-violet-400/[0.04] text-[12px] text-eidolon-text/60 italic leading-relaxed">
                      <span className="text-eidolon-violet/70 mr-1">↻</span>
                      {tr.text}
                    </div>
                  )}
                  {tr?.status === "error" && (
                    <div className="px-3 py-1.5 rounded-md border border-red-500/25 bg-red-500/[0.04] text-[11px] text-red-400">
                      ⚠ {tr.error}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      if (tr?.status === "loading") return;
                      if (tr?.status === "done" || tr?.status === "error") {
                        // Toggle off when already translated.
                        setTranslations((s) => {
                          const next = { ...s };
                          delete next[m.id];
                          return next;
                        });
                      } else {
                        void translateMessage(m);
                      }
                    }}
                    disabled={tr?.status === "loading"}
                    className={cn(
                      "self-start inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border transition-colors",
                      tr?.status === "done" || tr?.status === "error"
                        ? "border-violet-400/30 text-eidolon-violet/80 hover:bg-violet-400/10"
                        : "border-cyan-400/25 text-eidolon-cyan/70 hover:bg-cyan-400/10 hover:text-eidolon-cyan"
                    )}
                    aria-label={t(lang, "chat.translate")}
                  >
                    {tr?.status === "loading" ? (
                      <Loader2 className="size-2.5 animate-spin" />
                    ) : (
                      <Languages className="size-2.5" />
                    )}
                    {tr?.status === "loading"
                      ? t(lang, "chat.translating")
                      : tr?.status === "done" || tr?.status === "error"
                        ? lang === "en" ? "EN ↔ ZH" : "中 ↔ 英"
                        : t(lang, "chat.translate")}
                  </button>
                </div>
              )}
            </div>
          );
        })}

        {isStreaming && messages.length > 0 && (
          <div className="flex items-center gap-1.5 text-[11px] text-eidolon-cyan/70 px-1 animate-pulse">
            <Loader2 className="size-3 animate-spin" />
            <span>⏳ {t(lang, "chat.syncing")}</span>
            {recalledBanner !== null && (
              <Badge className="ml-2 bg-violet-400/10 text-eidolon-violet border-violet-400/30 text-[9px] py-0 px-1.5">
                <Database className="size-2.5" /> {t(lang, "chat.recalled")} {recalledBanner}{" "}
                {recalledBanner === 1 ? t(lang, "chat.memoryShard") : t(lang, "chat.memoryShards")}
              </Badge>
            )}
          </div>
        )}

        {error && (
          <div className="text-[11px] text-red-400 px-2 py-1 border border-red-500/30 rounded bg-red-500/5">
            ⚠ {t(lang, "chat.streamError")}: {error}
          </div>
        )}
      </div>

      {/* Suggestion chips */}
      {messages.length === 0 && (
        <div className="px-3 pb-2 flex flex-wrap gap-1.5">
          {suggestionKeys.map((k) => {
            const text = t(lang, k);
            return (
              <button
                key={k}
                type="button"
                onClick={() => setInput(text)}
                className="text-[10px] px-2 py-1 rounded-full bg-cyan-400/5 border border-cyan-400/20 text-eidolon-cyan/80 hover:bg-cyan-400/10 hover:border-cyan-400/40 transition-colors"
              >
                {text}
              </button>
            );
          })}
        </div>
      )}

      {/* Input area */}
      <div className="border-t border-cyan-400/15 p-2.5 flex items-end gap-2 bg-cyan-400/[0.03]">
        <Textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
          placeholder={
            selectedEidolonId
              ? t(lang, "chat.placeholder")
              : t(lang, "chat.placeholderNoEidolon")
          }
          disabled={isStreaming}
          className="min-h-[40px] max-h-32 resize-none bg-cyan-400/5 border-cyan-400/25 focus-visible:border-eidolon-cyan focus-visible:ring-eidolon-cyan/30 text-sm"
          aria-label="Message to transmit"
        />
        <Button
          type="button"
          onClick={() => send(input)}
          disabled={isStreaming || !input.trim()}
          aria-label={t(lang, "chat.transmit")}
          className="bg-eidolon-cyan text-eidolon-bg hover:bg-eidolon-cyan/90 hover:shadow-[0_0_18px_rgba(0,255,200,0.5)] font-semibold transition-all shrink-0 h-10 px-3"
        >
          {isStreaming ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Send className="size-4" />
          )}
          <span className="hidden sm:inline">{t(lang, "chat.transmit")}</span>
        </Button>
      </div>
    </HolographicCard>
  );
}
