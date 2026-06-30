'use client';

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, User, ShieldCheck, AlertTriangle, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { useMatrixStore, type Prime } from "@/lib/store/matrix-store";
import { useLangStore } from "@/lib/store/lang-store";
import { t } from "@/lib/i18n/translations";
import { HolographicCard } from "@/components/shared/holographic-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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

function ReputationBadge({ rep }: { rep: number }) {
  if (rep >= 80) {
    return (
      <Badge className="bg-cyan-400/15 text-eidolon-cyan border-cyan-400/40 hover:bg-cyan-400/20">
        <ShieldCheck className="size-3" /> {rep}
      </Badge>
    );
  }
  if (rep >= 20) {
    return (
      <Badge className="bg-amber-400/15 text-eidolon-amber border-amber-400/40 hover:bg-amber-400/20">
        <AlertTriangle className="size-3" /> {rep}
      </Badge>
    );
  }
  return (
    <Badge className="bg-red-500/15 text-red-400 border-red-500/40 hover:bg-red-500/20">
      <ShieldAlert className="size-3" /> {rep}
    </Badge>
  );
}

export function PrimePanel() {
  const lang = useLangStore((s) => s.lang);
  const qc = useQueryClient();
  const primes = useMatrixStore((s) => s.primes);
  const setPrimes = useMatrixStore((s) => s.setPrimes);
  const selectedPrimeId = useMatrixStore((s) => s.selectedPrimeId);
  const setPrime = useMatrixStore((s) => s.setPrime);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    displayName: "",
    email: "",
    walletAddress: "",
    telegramId: "",
  });

  const { isLoading, isError, refetch } = useQuery({
    queryKey: ["primes"],
    queryFn: async () => {
      const res = await fetch("/api/primes");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { success?: boolean; primes?: Prime[] };
      const list = data.primes ?? [];
      setPrimes(list);
      return list;
    },
    retry: 1,
  });

  const createMutation = useMutation({
    mutationFn: async (payload: {
      displayName: string;
      email?: string;
      walletAddress?: string;
      telegramId?: string;
    }) => {
      const res = await fetch("/api/primes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(txt || `HTTP ${res.status}`);
      }
      const data = (await res.json()) as { success?: boolean; prime?: Prime };
      if (!data.prime) throw new Error("Prime creation returned no payload");
      return data.prime;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["primes"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      setOpen(false);
      setForm({ displayName: "", email: "", walletAddress: "", telegramId: "" });
      toast.success(t(lang, "panel.primes.forged"));
    },
    onError: (err: Error) => {
      toast.error(t(lang, "panel.primes.forgeFailed"), { description: err.message });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.displayName.trim()) {
      toast.error(t(lang, "panel.primes.nameRequired"));
      return;
    }
    createMutation.mutate({
      displayName: form.displayName.trim(),
      email: form.email.trim() || undefined,
      walletAddress: form.walletAddress.trim() || undefined,
      telegramId: form.telegramId.trim() || undefined,
    });
  };

  return (
    <HolographicCard
      title={t(lang, "panel.primes.title")}
      subtitle={t(lang, "panel.primes.subtitle")}
      glow={1}
      actions={
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2 text-[10px] border-cyan-400/40 text-eidolon-cyan hover:bg-cyan-400/10 hover:text-eidolon-cyan"
              aria-label={t(lang, "panel.primes.createTitle")}
            >
              <Plus className="size-3" /> {t(lang, "panel.primes.create")}
            </Button>
          </DialogTrigger>
          <DialogContent className="hologram-panel-strong border-cyan-400/40">
            <DialogHeader>
              <DialogTitle className="text-eidolon-cyan eidolon-text-glow">
                {t(lang, "panel.primes.createTitle")}
              </DialogTitle>
              <DialogDescription className="text-eidolon-text/60">
                {t(lang, "panel.primes.createDesc")}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="grid gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="prime-displayName" className="text-eidolon-cyan/80 text-xs">
                  {t(lang, "common.displayName")} *
                </Label>
                <Input
                  id="prime-displayName"
                  required
                  value={form.displayName}
                  onChange={(e) => setForm({ ...form, displayName: e.target.value })}
                  placeholder="e.g. Architect-01"
                  className="bg-cyan-400/5 border-cyan-400/25"
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="prime-email" className="text-eidolon-cyan/80 text-xs">
                  {t(lang, "common.email")}
                </Label>
                <Input
                  id="prime-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="prime@eidolon.os"
                  className="bg-cyan-400/5 border-cyan-400/25"
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="prime-wallet" className="text-eidolon-cyan/80 text-xs">
                  {t(lang, "common.wallet")}
                </Label>
                <Input
                  id="prime-wallet"
                  value={form.walletAddress}
                  onChange={(e) => setForm({ ...form, walletAddress: e.target.value })}
                  placeholder="0x…"
                  className="bg-cyan-400/5 border-cyan-400/25 font-mono"
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="prime-tg" className="text-eidolon-cyan/80 text-xs">
                  {t(lang, "common.telegramId")}
                </Label>
                <Input
                  id="prime-tg"
                  value={form.telegramId}
                  onChange={(e) => setForm({ ...form, telegramId: e.target.value })}
                  placeholder="@handle or numeric id"
                  className="bg-cyan-400/5 border-cyan-400/25"
                />
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
                  {createMutation.isPending ? t(lang, "panel.primes.forging") : t(lang, "panel.primes.forge")}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      }
      className="flex-1 min-h-0"
      bodyClassName="overflow-y-auto scrollbar-cyan p-2 flex flex-col gap-1.5"
    >
      {isLoading && primes.length === 0 && (
        <div className="text-xs text-eidolon-cyan/60 animate-pulse px-2 py-3">
          {t(lang, "panel.primes.loading")}
        </div>
      )}
      {isError && (
        <div className="text-xs text-eidolon-amber px-2 py-2 flex items-center justify-between gap-2">
          <span>{t(lang, "panel.primes.loadFailed")}</span>
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
      {!isLoading && !isError && primes.length === 0 && (
        <div className="text-xs text-eidolon-text/40 px-2 py-3 text-center">
          {t(lang, "panel.primes.empty")}
        </div>
      )}
      {primes.map((p) => {
        const selected = p.id === selectedPrimeId;
        const boundCount = p.eidolons?.length ?? p._count?.eidolons ?? 0;
        return (
          <button
            key={p.id}
            type="button"
            onClick={() => setPrime(p.id)}
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
                <User
                  className={cn(
                    "size-3.5 shrink-0",
                    selected ? "text-eidolon-cyan" : "text-eidolon-text/40"
                  )}
                  aria-hidden
                />
                <span
                  className={cn(
                    "text-xs font-medium truncate",
                    selected ? "text-eidolon-cyan" : "text-eidolon-text/80"
                  )}
                >
                  {p.displayName}
                </span>
              </div>
              <ReputationBadge rep={p.reputation} />
            </div>
            <div className="mt-1 flex items-center gap-2 text-[10px] text-eidolon-text/40">
              <span>{boundCount} {boundCount === 1 ? t(lang, "panel.primes.bound") : t(lang, "panel.primes.boundPlural")}</span>
              {p.walletAddress && (
                <span className="truncate font-mono">
                  · {p.walletAddress.slice(0, 6)}…{p.walletAddress.slice(-4)}
                </span>
              )}
            </div>
          </button>
        );
      })}
    </HolographicCard>
  );
}
