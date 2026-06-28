'use client';

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Container, Plus, Cpu, Activity } from "lucide-react";
import { toast } from "sonner";
import { useMatrixStore, type Vessel, type VesselStatus } from "@/lib/store/matrix-store";
import { HolographicCard } from "@/components/shared/holographic-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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

function VesselStatusBadge({ status }: { status: VesselStatus }) {
  const map: Record<VesselStatus, { c: string; label: string }> = {
    running: { c: "bg-cyan-400/15 text-eidolon-cyan border-cyan-400/40", label: "running" },
    idle: { c: "bg-white/5 text-eidolon-text/50 border-white/10", label: "idle" },
    overloaded: { c: "bg-amber-400/15 text-eidolon-amber border-amber-400/40", label: "overloaded" },
    sealed: { c: "bg-red-500/15 text-red-400 border-red-500/40", label: "sealed" },
  };
  const v = map[status] ?? map.idle;
  return (
    <Badge className={cn("text-[10px]", v.c)}>{v.label}</Badge>
  );
}

function ReactorPulse({ active }: { active: boolean }) {
  if (!active) {
    return (
      <div className="relative size-7 flex items-center justify-center">
        <div className="size-3 rounded-full bg-white/10 border border-white/20" />
      </div>
    );
  }
  return (
    <div className="relative size-7 flex items-center justify-center">
      <span className="absolute inset-0 rounded-full bg-cyan-400/10 animate-aura-pulse" />
      <div className="size-3 rounded-full bg-eidolon-cyan shadow-[0_0_10px_rgba(0,255,200,0.8)]" />
      <span className="absolute inset-0 rounded-full border border-cyan-400/30" />
    </div>
  );
}

export function VesselPanel() {
  const qc = useQueryClient();
  const vessels = useMatrixStore((s) => s.vessels);
  const setVessels = useMatrixStore((s) => s.setVessels);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    codename: "",
    modelRoute: "glm-4.6",
    apiQuota: "100000",
    temperature: "0.7",
    maxTokens: "2048",
  });

  const { isLoading, isError, refetch } = useQuery({
    queryKey: ["vessels"],
    queryFn: async () => {
      const res = await fetch("/api/vessels");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as {
        success?: boolean;
        vessels?: Vessel[];
        totalTokensUsed?: number;
      };
      const list = data.vessels ?? [];
      setVessels(list);
      return list;
    },
    retry: 1,
  });

  const createMutation = useMutation({
    mutationFn: async (payload: {
      codename: string;
      modelRoute: string;
      apiQuota: number;
      temperature: number;
      maxTokens: number;
    }) => {
      const res = await fetch("/api/vessels", {
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
        vessel?: Vessel;
      };
      if (!data.vessel) throw new Error("Deploy returned no payload");
      return data.vessel;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["vessels"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      setOpen(false);
      setForm({
        codename: "",
        modelRoute: "glm-4.6",
        apiQuota: "100000",
        temperature: "0.7",
        maxTokens: "2048",
      });
      toast.success("Vessel deployed");
    },
    onError: (err: Error) => {
      toast.error("Failed to deploy vessel", { description: err.message });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.codename.trim()) {
      toast.error("Codename required");
      return;
    }
    createMutation.mutate({
      codename: form.codename.trim(),
      modelRoute: form.modelRoute.trim() || "glm-4.6",
      apiQuota: Number(form.apiQuota) || 100000,
      temperature: Number(form.temperature) || 0.7,
      maxTokens: Number(form.maxTokens) || 2048,
    });
  };

  return (
    <HolographicCard
      title="Vessels"
      subtitle="L3 · 容器 / Compute"
      glow={1}
      actions={
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2 text-[10px] border-cyan-400/40 text-eidolon-cyan hover:bg-cyan-400/10 hover:text-eidolon-cyan"
              aria-label="Deploy a new Vessel"
            >
              <Plus className="size-3" /> Deploy
            </Button>
          </DialogTrigger>
          <DialogContent className="hologram-panel-strong border-cyan-400/40">
            <DialogHeader>
              <DialogTitle className="text-eidolon-cyan eidolon-text-glow">
                Deploy Vessel
              </DialogTitle>
              <DialogDescription className="text-eidolon-text/60">
                Provision a new compute vessel for Eidolon incarnation.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="grid gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="v-codename" className="text-eidolon-cyan/80 text-xs">
                  Codename *
                </Label>
                <Input
                  id="v-codename"
                  required
                  value={form.codename}
                  onChange={(e) => setForm({ ...form, codename: e.target.value })}
                  placeholder="e.g. Vessel-Aether-01"
                  className="bg-cyan-400/5 border-cyan-400/25"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label htmlFor="v-model" className="text-eidolon-cyan/80 text-xs">
                    Model Route
                  </Label>
                  <Input
                    id="v-model"
                    value={form.modelRoute}
                    onChange={(e) => setForm({ ...form, modelRoute: e.target.value })}
                    placeholder="glm-4.6"
                    className="bg-cyan-400/5 border-cyan-400/25 font-mono"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="v-quota" className="text-eidolon-cyan/80 text-xs">
                    API Quota (tokens)
                  </Label>
                  <Input
                    id="v-quota"
                    type="number"
                    value={form.apiQuota}
                    onChange={(e) => setForm({ ...form, apiQuota: e.target.value })}
                    className="bg-cyan-400/5 border-cyan-400/25"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label htmlFor="v-temp" className="text-eidolon-cyan/80 text-xs">
                    Temperature
                  </Label>
                  <Input
                    id="v-temp"
                    type="number"
                    step="0.1"
                    min="0"
                    max="2"
                    value={form.temperature}
                    onChange={(e) => setForm({ ...form, temperature: e.target.value })}
                    className="bg-cyan-400/5 border-cyan-400/25"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="v-max" className="text-eidolon-cyan/80 text-xs">
                    Max Tokens
                  </Label>
                  <Input
                    id="v-max"
                    type="number"
                    value={form.maxTokens}
                    onChange={(e) => setForm({ ...form, maxTokens: e.target.value })}
                    className="bg-cyan-400/5 border-cyan-400/25"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setOpen(false)}
                  className="text-eidolon-text/60"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="bg-eidolon-cyan text-eidolon-bg hover:bg-eidolon-cyan/90 font-semibold"
                >
                  {createMutation.isPending ? "Deploying…" : "Deploy"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      }
      className="h-full"
      bodyClassName="overflow-y-auto scrollbar-cyan p-2 flex flex-col gap-2"
    >
      {isLoading && vessels.length === 0 && (
        <div className="text-xs text-eidolon-cyan/60 animate-pulse px-2 py-3">
          Scanning vessels…
        </div>
      )}
      {isError && (
        <div className="text-xs text-eidolon-amber px-2 py-2 flex items-center justify-between gap-2">
          <span>Failed to load vessels</span>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 px-2 text-eidolon-amber"
            onClick={() => refetch()}
          >
            Retry
          </Button>
        </div>
      )}
      {!isLoading && !isError && vessels.length === 0 && (
        <div className="text-xs text-eidolon-text/40 px-2 py-3 text-center">
          No Vessels deployed. Deploy one to host Eidolons.
        </div>
      )}
      {vessels.map((v) => {
        const usagePct =
          typeof v.usagePercent === "number"
            ? v.usagePercent
            : v.apiQuota > 0
              ? (v.tokensUsed / v.apiQuota) * 100
              : 0;
        const isOver = usagePct > 80;
        const isRunning = v.status === "running";
        return (
          <div
            key={v.id}
            className={cn(
              "p-2.5 rounded-md border bg-cyan-400/[0.03] transition-all",
              isRunning
                ? "border-cyan-400/40 shadow-[0_0_12px_rgba(0,255,200,0.12)]"
                : "border-cyan-400/15"
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <ReactorPulse active={isRunning} />
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <Container className="size-3 text-eidolon-cyan" />
                    <span className="text-xs font-medium text-eidolon-text/90 truncate">
                      {v.codename}
                    </span>
                  </div>
                  <div className="text-[10px] text-eidolon-text/40 font-mono mt-0.5">
                    {v.modelRoute}
                  </div>
                </div>
              </div>
              <VesselStatusBadge status={v.status} />
            </div>
            <div className="mt-2 space-y-1">
              <div className="flex items-center justify-between text-[10px] text-eidolon-text/50">
                <span className="flex items-center gap-1">
                  <Cpu className="size-2.5" /> tokens
                </span>
                <span className="tabular-nums">
                  {v.tokensUsed.toLocaleString()} / {v.apiQuota.toLocaleString()}
                </span>
              </div>
              <Progress
                value={Math.min(100, usagePct)}
                className={cn(
                  "h-1.5 bg-cyan-400/10",
                  isOver && "bg-amber-400/10"
                )}
              />
            </div>
            <div className="mt-1.5 flex items-center gap-2 text-[10px] text-eidolon-text/40">
              <span className="flex items-center gap-1">
                <Activity className="size-2.5" /> temp {v.temperature.toFixed(2)}
              </span>
              <span>·</span>
              <span>max {v.maxTokens}</span>
              {isOver && (
                <Badge className="ml-auto bg-amber-400/15 text-eidolon-amber border-amber-400/40 text-[9px] py-0 px-1.5">
                  &gt; 80% load
                </Badge>
              )}
            </div>
          </div>
        );
      })}
    </HolographicCard>
  );
}
