'use client';

import { useCallback, useRef, useState } from "react";

export type StreamDonePayload = {
  type?: "done";
  tokensOut?: number;
  tokensIn?: number;
  vesselId?: string;
  conversationId?: string;
  ledgerId?: string;
  [k: string]: unknown;
};

export type StreamError = {
  type?: "error";
  message?: string;
  error?: string;
  code?: string;
  [k: string]: unknown;
};

interface UseConsciousnessStreamReturn {
  stream: (
    eidolonId: string,
    primeId: string,
    message: string,
    onToken: (content: string) => void,
    onDone: (data: StreamDonePayload) => void,
    onMemory: (shardCount: number) => void
  ) => Promise<void>;
  isStreaming: boolean;
  error: string | null;
  abort: () => void;
}

/**
 * Consciousness-stream hook — reads the SSE response from
 * POST /api/eidolons/:id/converse and dispatches typed events.
 *
 * SSE contract (per docs/EidolonOS-DEVELOPMENT.md §5.2):
 *   event: consciousness-stream
 *   data: {"type":"memory"|"token"|"done"|"error", ...}
 *
 * The hook tolerates partial chunks across reads by buffering
 * incomplete events (split on \n\n) and only dispatching when a
 * full event has been accumulated.
 */
export function useConsciousnessStream(): UseConsciousnessStreamReturn {
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const abort = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsStreaming(false);
  }, []);

  const stream = useCallback(
    async (
      eidolonId: string,
      primeId: string,
      message: string,
      onToken: (content: string) => void,
      onDone: (data: StreamDonePayload) => void,
      onMemory: (shardCount: number) => void
    ) => {
      setError(null);
      setIsStreaming(true);
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const res = await fetch(
          `/api/eidolons/${encodeURIComponent(eidolonId)}/converse`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ primeId, message, channel: "web" }),
            signal: controller.signal,
          }
        );

        if (!res.ok) {
          const txt = await res.text().catch(() => "");
          let parsed: StreamError | null = null;
          try {
            parsed = txt ? (JSON.parse(txt) as StreamError) : null;
          } catch {
            /* ignore */
          }
          const msg =
            parsed?.message ||
            parsed?.error ||
            txt ||
            `HTTP ${res.status} ${res.statusText}`;
          throw new Error(msg);
        }

        if (!res.body) throw new Error("No response body from consciousness stream");

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          // SSE events are separated by a blank line
          const events = buffer.split("\n\n");
          // keep the last (possibly partial) chunk in buffer
          buffer = events.pop() ?? "";

          for (const raw of events) {
            const ev = raw.trim();
            if (!ev) continue;

            // Concatenate any data: lines (per SSE spec, multiple data lines append with \n)
            let dataStr = "";
            for (const line of ev.split("\n")) {
              const trimmed = line.trim();
              if (trimmed.startsWith("data:")) {
                dataStr += trimmed.slice(5).trim();
              }
            }
            if (!dataStr) continue;

            let json: Record<string, unknown>;
            try {
              json = JSON.parse(dataStr) as Record<string, unknown>;
            } catch {
              // ignore malformed JSON (often a trailing partial)
              continue;
            }

            const type = json.type as string | undefined;
            if (type === "memory") {
              const shards = json.shards;
              onMemory(typeof shards === "number" ? shards : 0);
            } else if (type === "token") {
              const content = json.content;
              if (typeof content === "string") onToken(content);
            } else if (type === "done") {
              onDone(json as unknown as StreamDonePayload);
            } else if (type === "error") {
              const msg =
                (json.message as string | undefined) ||
                (json.error as string | undefined) ||
                "Consciousness stream error";
              throw new Error(msg);
            }
          }
        }
      } catch (e) {
        const err = e as Error;
        if (err.name === "AbortError") return;
        setError(err.message || "Stream failed");
      } finally {
        setIsStreaming(false);
        abortRef.current = null;
      }
    },
    []
  );

  return { stream, isStreaming, error, abort };
}
