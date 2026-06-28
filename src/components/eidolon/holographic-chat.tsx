'use client';

import { useEffect, useRef, useState } from "react";
import { Send, Brain, Loader2, Database } from "lucide-react";
import { toast } from "sonner";
import { useMatrixStore } from "@/lib/store/matrix-store";
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

const SUGGESTIONS = [
  "What is Eidolon?",
  "Explain TDPO firewall",
  "How does AP2 settlement work?",
];

function newId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function HolographicChat() {
  const selectedPrimeId = useMatrixStore((s) => s.selectedPrimeId);
  const selectedEidolonId = useMatrixStore((s) => s.selectedEidolonId);
  const eidolons = useMatrixStore((s) => s.eidolons);
  const primes = useMatrixStore((s) => s.primes);
  const setSyncing = useMatrixStore((s) => s.setSyncing);

  const selectedEidolon = eidolons.find((e) => e.id === selectedEidolonId) ?? null;
  const selectedPrime = primes.find((p) => p.id === selectedPrimeId) ?? null;

  const { stream, isStreaming, error } = useConsciousnessStream();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [recalledBanner, setRecalledBanner] = useState<number | null>(null);

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

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    if (!selectedPrimeId || !selectedEidolonId) {
      toast.error("Select a Prime and Eidolon first");
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
      }
    );
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
      title={selectedEidolon ? selectedEidolon.name : "Holographic Channel"}
      subtitle={
        selectedPrime
          ? `Prime: ${selectedPrime.displayName}`
          : "No Prime selected"
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
        aria-label="Consciousness stream messages"
      >
        {messages.length === 0 && (
          <div className="m-auto text-center py-10 max-w-md">
            <div className="relative inline-flex items-center justify-center size-16 mb-4">
              <span className="absolute inset-0 rounded-full bg-cyan-400/10 animate-aura-pulse" />
              <Brain className="size-8 text-eidolon-cyan eidolon-text-glow animate-hologram-flicker relative" />
            </div>
            <p className="text-sm text-eidolon-cyan eidolon-text-glow animate-hologram-flicker italic">
              &ldquo;I am Eidolon. Awaiting your consciousness sync…&rdquo;
            </p>
            <p className="mt-3 text-[10px] text-eidolon-text/40 tracking-wider">
              Select a Prime and an Eidolon to begin the stream.
            </p>
          </div>
        )}

        {messages.map((m) => (
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
                  <span>PRIME (YOU)</span>
                </>
              ) : (
                <>
                  <Brain className="size-3 text-eidolon-cyan" />
                  <span className="text-eidolon-cyan/70">
                    {selectedEidolon?.name ?? "EIDOLON"}
                  </span>
                  {m.recalledShards ? (
                    <Badge className="ml-1 bg-violet-400/10 text-eidolon-violet border-violet-400/30 text-[9px] py-0 px-1.5">
                      <Database className="size-2.5" /> Recalled {m.recalledShards} memory
                      shard{m.recalledShards === 1 ? "" : "s"}
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
          </div>
        ))}

        {isStreaming && messages.length > 0 && (
          <div className="flex items-center gap-1.5 text-[11px] text-eidolon-cyan/70 px-1 animate-pulse">
            <Loader2 className="size-3 animate-spin" />
            <span>⏳ Syncing consciousness…</span>
            {recalledBanner !== null && (
              <Badge className="ml-2 bg-violet-400/10 text-eidolon-violet border-violet-400/30 text-[9px] py-0 px-1.5">
                <Database className="size-2.5" /> Recalled {recalledBanner} memory
                shard{recalledBanner === 1 ? "" : "s"}
              </Badge>
            )}
          </div>
        )}

        {error && (
          <div className="text-[11px] text-red-400 px-2 py-1 border border-red-500/30 rounded bg-red-500/5">
            ⚠ Stream error: {error}
          </div>
        )}
      </div>

      {/* Suggestion chips */}
      {messages.length === 0 && (
        <div className="px-3 pb-2 flex flex-wrap gap-1.5">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setInput(s)}
              className="text-[10px] px-2 py-1 rounded-full bg-cyan-400/5 border border-cyan-400/20 text-eidolon-cyan/80 hover:bg-cyan-400/10 hover:border-cyan-400/40 transition-colors"
            >
              {s}
            </button>
          ))}
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
              ? "Transmit your thought…  (Enter to send · Shift+Enter for newline)"
              : "Select an Eidolon to begin transmission…"
          }
          disabled={isStreaming}
          className="min-h-[40px] max-h-32 resize-none bg-cyan-400/5 border-cyan-400/25 focus-visible:border-eidolon-cyan focus-visible:ring-eidolon-cyan/30 text-sm"
          aria-label="Message to transmit"
        />
        <Button
          type="button"
          onClick={() => send(input)}
          disabled={isStreaming || !input.trim()}
          aria-label="Transmit message"
          className="bg-eidolon-cyan text-eidolon-bg hover:bg-eidolon-cyan/90 hover:shadow-[0_0_18px_rgba(0,255,200,0.5)] font-semibold transition-all shrink-0 h-10 px-3"
        >
          {isStreaming ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Send className="size-4" />
          )}
          <span className="hidden sm:inline">Transmit</span>
        </Button>
      </div>
    </HolographicCard>
  );
}
