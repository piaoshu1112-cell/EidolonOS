'use client';

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Database, Search, Loader2, FileText, Plus } from "lucide-react";
import { toast } from "sonner";
import {
  useMatrixStore,
  type MemoryShard,
} from "@/lib/store/matrix-store";
import { useLangStore } from "@/lib/store/lang-store";
import { t } from "@/lib/i18n/translations";
import { HolographicCard } from "@/components/shared/holographic-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

function sourceColor(source: string) {
  switch (source) {
    case "conversation":
      return "bg-cyan-400/10 text-eidolon-cyan border-cyan-400/30";
    case "ap2_rfc":
      return "bg-violet-400/10 text-eidolon-violet border-violet-400/30";
    case "manual":
    default:
      return "bg-amber-400/10 text-eidolon-amber border-amber-400/30";
  }
}

export function MemoryVault() {
  const lang = useLangStore((s) => s.lang);
  const qc = useQueryClient();
  const selectedEidolonId = useMatrixStore((s) => s.selectedEidolonId);
  const selectedEidolonName = useMatrixStore((s) => {
    const e = s.eidolons.find((x) => x.id === s.selectedEidolonId);
    return e?.name ?? null;
  });

  const [knowledge, setKnowledge] = useState("");
  const [query, setQuery] = useState("");
  const [recalled, setRecalled] = useState<MemoryShard[] | null>(null);

  const { data: shards, isLoading, isError, refetch } = useQuery({
    queryKey: ["memory", selectedEidolonId],
    queryFn: async () => {
      const res = await fetch(
        `/api/memory?eidolonId=${encodeURIComponent(selectedEidolonId!)}`
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as {
        success?: boolean;
        shards?: MemoryShard[];
      };
      return data.shards ?? [];
    },
    enabled: !!selectedEidolonId,
    retry: 1,
  });

  const ingestMutation = useMutation({
    mutationFn: async (text: string) => {
      const res = await fetch("/api/memory/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eidolonId: selectedEidolonId,
          text,
          source: "manual",
        }),
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(txt || `HTTP ${res.status}`);
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["memory", selectedEidolonId] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      setKnowledge("");
      toast.success(t(lang, "memory.engraved"));
    },
    onError: (err: Error) => {
      toast.error(t(lang, "memory.engraveFailed"), { description: err.message });
    },
  });

  const recallMutation = useMutation({
    mutationFn: async (q: string) => {
      const res = await fetch("/api/memory/recall", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eidolonId: selectedEidolonId, query: q, topK: 5 }),
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(txt || `HTTP ${res.status}`);
      }
      const data = (await res.json()) as {
        success?: boolean;
        shards?: MemoryShard[];
      };
      return data.shards ?? [];
    },
    onSuccess: (data) => {
      setRecalled(data);
      if (data.length === 0) toast.info(t(lang, "memory.noMatch"));
    },
    onError: (err: Error) => {
      toast.error(t(lang, "memory.recallFailed"), { description: err.message });
    },
  });

  if (!selectedEidolonId) {
    return (
      <HolographicCard
        title={t(lang, "memory.title")}
        subtitle={t(lang, "memory.subtitle")}
        glow={1}
        className="h-full"
      >
        <div className="text-xs text-eidolon-text/50 text-center py-8">
          <Database className="size-6 mx-auto mb-2 text-eidolon-cyan/40" />
          {t(lang, "memory.selectFirst")}
        </div>
      </HolographicCard>
    );
  }

  return (
    <HolographicCard
      title={t(lang, "memory.title")}
      subtitle={
        selectedEidolonName
          ? `RAG · ${selectedEidolonName} · ${shards?.length ?? 0} shards`
          : t(lang, "memory.subtitle")
      }
      glow={1}
      className="h-full"
      bodyClassName="overflow-y-auto scrollbar-cyan p-2 flex flex-col gap-3"
    >
      {isError && (
        <div className="text-xs text-eidolon-amber px-2 py-1 flex items-center justify-between gap-2">
          <span>{t(lang, "memory.loadFailed")}</span>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 px-2 text-eidolon-amber"
            onClick={() => refetch()}
          >
            {t(lang, "common.retry")}
          </Button>
        </div>
      )}

      {/* Ingest */}
      <div className="rounded-md border border-cyan-400/15 bg-cyan-400/[0.03] p-2 space-y-2">
        <Label htmlFor="mem-ingest" className="text-eidolon-cyan/80 text-[10px] uppercase tracking-wider flex items-center gap-1">
          <Plus className="size-3" /> {t(lang, "memory.engrave")}
        </Label>
        <Textarea
          id="mem-ingest"
          rows={3}
          value={knowledge}
          onChange={(e) => setKnowledge(e.target.value)}
          placeholder={t(lang, "memory.engravePlaceholder")}
          className="bg-cyan-400/5 border-cyan-400/25 text-xs resize-y"
        />
        <Button
          size="sm"
          onClick={() => {
            if (!knowledge.trim()) {
              toast.error(t(lang, "memory.knowledgeEmpty"));
              return;
            }
            ingestMutation.mutate(knowledge.trim());
          }}
          disabled={ingestMutation.isPending}
          className="h-7 text-[11px] bg-eidolon-cyan text-eidolon-bg hover:bg-eidolon-cyan/90 font-semibold w-full"
        >
          {ingestMutation.isPending ? (
            <Loader2 className="size-3 animate-spin" />
          ) : (
            <Database className="size-3" />
          )}
          {t(lang, "memory.engraveBtn")}
        </Button>
      </div>

      {/* Recall */}
      <div className="rounded-md border border-cyan-400/15 bg-cyan-400/[0.03] p-2 space-y-2">
        <Label htmlFor="mem-search" className="text-eidolon-cyan/80 text-[10px] uppercase tracking-wider flex items-center gap-1">
          <Search className="size-3" /> {t(lang, "memory.recall")}
        </Label>
        <div className="flex gap-1.5">
          <Input
            id="mem-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && query.trim()) {
                recallMutation.mutate(query.trim());
              }
            }}
            placeholder={t(lang, "memory.recallPlaceholder")}
            className="bg-cyan-400/5 border-cyan-400/25 text-xs h-7"
          />
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              if (!query.trim()) {
                toast.error(t(lang, "memory.queryEmpty"));
                return;
              }
              recallMutation.mutate(query.trim());
            }}
            disabled={recallMutation.isPending}
            className="h-7 px-2 text-[11px] border-cyan-400/40 text-eidolon-cyan hover:bg-cyan-400/10 shrink-0"
          >
            {recallMutation.isPending ? (
              <Loader2 className="size-3 animate-spin" />
            ) : (
              <Search className="size-3" />
            )}
            {t(lang, "memory.recallBtn")}
          </Button>
        </div>
        {recalled && recalled.length > 0 && (
          <div className="space-y-1.5 pt-1">
            <div className="text-[10px] text-eidolon-text/40 uppercase tracking-wider">
              {t(lang, "memory.results")}
            </div>
            {recalled.map((r) => {
              const sim = typeof r.similarity === "number" ? r.similarity * 100 : 0;
              return (
                <div
                  key={r.id}
                  className="rounded border border-violet-400/20 bg-violet-400/5 p-1.5"
                >
                  <div className="flex items-center justify-between text-[10px] mb-1">
                    <Badge className={cn("text-[9px] py-0 px-1.5", sourceColor(r.source))}>
                      {r.source}
                    </Badge>
                    <span className="text-eidolon-violet tabular-nums">
                      {sim.toFixed(1)}% {t(lang, "memory.match")}
                    </span>
                  </div>
                  <Progress value={sim} className="h-1 bg-violet-400/10" />
                  <p className="text-[11px] text-eidolon-text/70 mt-1 line-clamp-2">
                    {r.content}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Shards list */}
      <div className="space-y-1.5">
        <div className="text-[10px] text-eidolon-text/40 uppercase tracking-wider flex items-center justify-between">
          <span>{t(lang, "memory.shards")}</span>
          <span className="tabular-nums">{shards?.length ?? 0}</span>
        </div>
        {isLoading && (
          <div className="text-[11px] text-eidolon-cyan/60 animate-pulse px-1 py-2">
            {t(lang, "memory.loadingVault")}
          </div>
        )}
        {!isLoading && shards && shards.length === 0 && (
          <div className="text-[11px] text-eidolon-text/40 px-1 py-3 text-center italic">
            {t(lang, "memory.empty")}
          </div>
        )}
        {shards?.map((s) => (
          <div
            key={s.id}
            className="rounded border border-cyan-400/15 bg-cyan-400/[0.02] p-1.5"
          >
            <div className="flex items-center gap-1.5 mb-1">
              <FileText className="size-3 text-eidolon-cyan/60" />
              <Badge className={cn("text-[9px] py-0 px-1.5", sourceColor(s.source))}>
                {s.source}
              </Badge>
              <span className="text-[9px] text-eidolon-text/30 ml-auto">
                {new Date(s.createdAt).toLocaleDateString()}
              </span>
            </div>
            <p className="text-[11px] text-eidolon-text/70 line-clamp-2 leading-relaxed">
              {s.content}
            </p>
          </div>
        ))}
      </div>
    </HolographicCard>
  );
}
