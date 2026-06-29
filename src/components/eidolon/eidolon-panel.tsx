'use client';

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Brain, Sparkles, Moon, Lock, Zap } from "lucide-react";
import { toast } from "sonner";
import {
  useMatrixStore,
  type Eidolon,
  type EidolonStatus,
} from "@/lib/store/matrix-store";
import { useLangStore } from "@/lib/store/lang-store";
import { t } from "@/lib/i18n/translations";
import { HolographicCard } from "@/components/shared/holographic-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

function StatusBadge({ status }: { status: EidolonStatus }) {
  const lang = useLangStore((s) => s.lang);
  switch (status) {
    case "active":
      return (
        <Badge className="bg-cyan-400/15 text-eidolon-cyan border-cyan-400/40 hover:bg-cyan-400/20">
          <Zap className="size-3" /> {t(lang, "vessel.running")}
        </Badge>
      );
    case "awakening":
      return (
        <Badge className="bg-amber-400/15 text-eidolon-amber border-amber-400/40 hover:bg-amber-400/20 animate-pulse">
          <Sparkles className="size-3" /> {t(lang, "panel.eidolons.awakening")}
        </Badge>
      );
    case "sealed":
      return (
        <Badge className="bg-red-500/15 text-red-400 border-red-500/40 hover:bg-red-500/20">
          <Lock className="size-3" /> {t(lang, "vessel.sealed")}
        </Badge>
      );
    case "dormant":
    default:
      return (
        <Badge className="bg-white/5 text-eidolon-text/40 border-white/10 hover:bg-white/10">
          <Moon className="size-3" /> dormant
        </Badge>
      );
  }
}

export function EidolonPanel() {
  const lang = useLangStore((s) => s.lang);
  const qc = useQueryClient();
  const eidolons = useMatrixStore((s) => s.eidolons);
  const setEidolons = useMatrixStore((s) => s.setEidolons);
  const primes = useMatrixStore((s) => s.primes);
  const vessels = useMatrixStore((s) => s.vessels);
  const selectedEidolonId = useMatrixStore((s) => s.selectedEidolonId);
  const setEidolon = useMatrixStore((s) => s.setEidolon);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    personaPrompt: "",
    primeId: "",
    vesselId: "__none__",
  });

  const { isLoading, isError, refetch } = useQuery({
    queryKey: ["eidolons"],
    queryFn: async () => {
      const res = await fetch("/api/eidolons");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as {
        success?: boolean;
        eidolons?: Eidolon[];
      };
      const list = data.eidolons ?? [];
      setEidolons(list);
      return list;
    },
    retry: 1,
  });

  const createMutation = useMutation({
    mutationFn: async (payload: {
      name: string;
      personaPrompt: string;
      primeId: string;
      vesselId?: string;
    }) => {
      const res = await fetch("/api/eidolons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(txt || `HTTP ${res.status}`);
      }
      const data = (await res.json()) as {
        success?: boolean;
        eidolon?: Eidolon;
      };
      if (!data.eidolon) throw new Error("Awaken returned no payload");
      return data.eidolon;
    },
    onSuccess: (created) => {
      qc.invalidateQueries({ queryKey: ["eidolons"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      setOpen(false);
      setForm({ name: "", personaPrompt: "", primeId: "", vesselId: "__none__" });
      setEidolon(created.id);
      toast.success(`${t(lang, "panel.eidolons.awakened")}: ${created.name}`);
    },
    onError: (err: Error) => {
      toast.error(t(lang, "panel.eidolons.awakenFailed"), { description: err.message });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.personaPrompt.trim()) {
      toast.error(t(lang, "panel.eidolons.namePersonaRequired"));
      return;
    }
    if (!form.primeId) {
      toast.error(t(lang, "panel.eidolons.primeRequired"));
      return;
    }
    createMutation.mutate({
      name: form.name.trim(),
      personaPrompt: form.personaPrompt.trim(),
      primeId: form.primeId,
      vesselId: form.vesselId === "__none__" ? undefined : form.vesselId,
    });
  };

  return (
    <HolographicCard
      title={t(lang, "panel.eidolons.title")}
      subtitle={t(lang, "panel.eidolons.subtitle")}
      glow={1}
      actions={
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2 text-[10px] border-cyan-400/40 text-eidolon-cyan hover:bg-cyan-400/10 hover:text-eidolon-cyan"
              aria-label={t(lang, "panel.eidolons.awakenTitle")}
            >
              <Sparkles className="size-3" /> {t(lang, "panel.eidolons.awaken")}
            </Button>
          </DialogTrigger>
          <DialogContent className="hologram-panel-strong border-cyan-400/40 max-h-[90vh] overflow-y-auto scrollbar-cyan">
            <DialogHeader>
              <DialogTitle className="text-eidolon-cyan eidolon-text-glow">
                {t(lang, "panel.eidolons.awakenTitle")}
              </DialogTitle>
              <DialogDescription className="text-eidolon-text/60">
                {t(lang, "panel.eidolons.awakenDesc")}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="grid gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="eidolon-name" className="text-eidolon-cyan/80 text-xs">
                  {t(lang, "common.name")} *
                </Label>
                <Input
                  id="eidolon-name"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Echo-01"
                  className="bg-cyan-400/5 border-cyan-400/25"
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="eidolon-persona" className="text-eidolon-cyan/80 text-xs">
                  {t(lang, "common.persona")} *
                </Label>
                <Textarea
                  id="eidolon-persona"
                  required
                  rows={4}
                  value={form.personaPrompt}
                  onChange={(e) =>
                    setForm({ ...form, personaPrompt: e.target.value })
                  }
                  placeholder="You are Eidolon, a calm, witty digital twin…"
                  className="bg-cyan-400/5 border-cyan-400/25 resize-y"
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="eidolon-prime" className="text-eidolon-cyan/80 text-xs">
                  {t(lang, "common.boundPrime")} *
                </Label>
                <Select
                  value={form.primeId}
                  onValueChange={(v) => setForm({ ...form, primeId: v })}
                >
                  <SelectTrigger id="eidolon-prime" className="bg-cyan-400/5 border-cyan-400/25">
                    <SelectValue placeholder={t(lang, "common.select")} />
                  </SelectTrigger>
                  <SelectContent className="hologram-panel-strong border-cyan-400/40">
                    {primes.length === 0 && (
                      <div className="px-2 py-1.5 text-xs text-eidolon-text/40">
                        {t(lang, "panel.primes.empty")}
                      </div>
                    )}
                    {primes.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.displayName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="eidolon-vessel" className="text-eidolon-cyan/80 text-xs">
                  {t(lang, "common.optional")}
                </Label>
                <Select
                  value={form.vesselId}
                  onValueChange={(v) => setForm({ ...form, vesselId: v })}
                >
                  <SelectTrigger id="eidolon-vessel" className="bg-cyan-400/5 border-cyan-400/25">
                    <SelectValue placeholder={t(lang, "common.noVessel")} />
                  </SelectTrigger>
                  <SelectContent className="hologram-panel-strong border-cyan-400/40">
                    <SelectItem value="__none__">{t(lang, "common.none")}</SelectItem>
                    {vessels.map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.codename} ({v.modelRoute})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setOpen(false)}
                  className="text-eidolon-text/60"
                >
                  {t(lang, "common.cancel")}
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="bg-eidolon-cyan text-eidolon-bg hover:bg-eidolon-cyan/90 font-semibold"
                >
                  {createMutation.isPending ? t(lang, "panel.eidolons.awakening") : t(lang, "panel.eidolons.awakenEidolon")}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      }
      className="flex-1 min-h-0"
      bodyClassName="overflow-y-auto scrollbar-cyan p-2 flex flex-col gap-1.5"
    >
      {isLoading && eidolons.length === 0 && (
        <div className="text-xs text-eidolon-cyan/60 animate-pulse px-2 py-3">
          {t(lang, "panel.eidolons.loading")}
        </div>
      )}
      {isError && (
        <div className="text-xs text-eidolon-amber px-2 py-2 flex items-center justify-between gap-2">
          <span>{t(lang, "panel.eidolons.loadFailed")}</span>
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
      {!isLoading && !isError && eidolons.length === 0 && (
        <div className="text-xs text-eidolon-text/40 px-2 py-3 text-center">
          {t(lang, "panel.eidolons.empty")}
        </div>
      )}
      {eidolons.map((e) => {
        const selected = e.id === selectedEidolonId;
        const vesselCodename = e.vessel?.codename;
        return (
          <button
            key={e.id}
            type="button"
            onClick={() => setEidolon(e.id)}
            aria-pressed={selected}
            className={cn(
              "group text-left px-2.5 py-2 rounded-md border transition-all",
              selected
                ? "bg-cyan-400/10 border-cyan-400/50 shadow-[0_0_12px_rgba(0,255,200,0.2)]"
                : "bg-transparent border-transparent hover:bg-cyan-400/5 hover:border-cyan-400/25"
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <Brain
                  className={cn(
                    "size-3.5 shrink-0",
                    selected ? "text-eidolon-cyan" : "text-eidolon-text/40"
                  )}
                  aria-hidden
                />
                <span
                  className={cn(
                    "text-xs font-medium truncate",
                    selected ? "text-eidolon-cyan eidolon-text-glow" : "text-eidolon-text/80"
                  )}
                >
                  {e.name}
                </span>
              </div>
              <StatusBadge status={e.status} />
            </div>
            <div className="mt-1 text-[10px] text-eidolon-text/40 truncate">
              {vesselCodename ? (
                <span className="font-mono">▣ {vesselCodename}</span>
              ) : (
                <span className="text-eidolon-amber/70">{t(lang, "panel.eidolons.noVessel")}</span>
              )}
            </div>
          </button>
        );
      })}
    </HolographicCard>
  );
}
