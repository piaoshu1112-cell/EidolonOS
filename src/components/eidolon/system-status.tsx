'use client';

import { useEffect, useState } from "react";
import { Brain, Database, Server, Users, Clock, Zap } from "lucide-react";
import { useMatrixStore } from "@/lib/store/matrix-store";
import { useLangStore } from "@/lib/store/lang-store";
import { t, type TranslationKey } from "@/lib/i18n/translations";
import { LangToggle } from "@/components/eidolon/lang-toggle";
import { cn } from "@/lib/utils";

function StatChip({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  accent?: "cyan" | "violet" | "amber";
}) {
  const colorClass =
    accent === "violet"
      ? "text-eidolon-violet"
      : accent === "amber"
        ? "text-eidolon-amber"
        : "text-eidolon-cyan";
  return (
    <div
      className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-cyan-400/5 border border-cyan-400/15"
      title={label}
    >
      <Icon className={cn("size-3.5", colorClass)} aria-hidden />
      <span className="text-[10px] uppercase tracking-wider text-eidolon-text/50 hidden sm:inline">
        {label}
      </span>
      <span className={cn("text-xs font-semibold tabular-nums", colorClass)}>
        {value}
      </span>
    </div>
  );
}

/**
 * SystemStatus — top header strip.
 * Renders the EIDOLON MATRIX logo (cyan glow), system ONLINE pulse,
 * live counts, total tokens used, a live Asia/Shanghai clock and a
 * zh/en language toggle.
 */
export function SystemStatus() {
  const lang = useLangStore((s) => s.lang);
  const stats = useMatrixStore((s) => s.stats);
  const [clock, setClock] = useState("--:--:--");

  useEffect(() => {
    const tick = () => {
      try {
        setClock(
          new Date().toLocaleTimeString("en-GB", {
            timeZone: "Asia/Shanghai",
            hour12: false,
          })
        );
      } catch {
        setClock(new Date().toLocaleTimeString("en-GB", { hour12: false }));
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const statChips: { icon: typeof Users; label: string; value: number; accent?: "cyan" | "violet" | "amber" }[] = [
    { icon: Users, label: t(lang, "app.stat.prime"), value: stats?.counts.primes ?? 0 },
    { icon: Brain, label: t(lang, "app.stat.eidolon"), value: stats?.counts.eidolons ?? 0 },
    { icon: Server, label: t(lang, "app.stat.vessel"), value: stats?.counts.vessels ?? 0 },
    { icon: Database, label: t(lang, "app.stat.shards"), value: stats?.counts.memoryShards ?? 0, accent: "violet" },
    { icon: Zap, label: t(lang, "app.stat.tokens"), value: stats?.totalTokensUsed ?? 0, accent: "amber" },
  ];

  return (
    <header className="relative z-10 hologram-panel border-b border-cyan-400/25 px-3 sm:px-5 py-2.5 flex items-center justify-between gap-3 flex-wrap">
      {/* Logo */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="relative flex items-center justify-center size-9 rounded-md bg-cyan-400/10 border border-cyan-400/40">
          <Brain className="size-5 text-eidolon-cyan eidolon-text-glow" aria-hidden />
          <span
            className="absolute inset-0 rounded-md animate-aura-pulse pointer-events-none"
            aria-hidden
          />
        </div>
        <div className="min-w-0">
          <h1 className="text-sm sm:text-base font-bold tracking-[0.2em] text-eidolon-cyan eidolon-text-glow leading-none truncate">
            {t(lang, "app.title")}
          </h1>
          <p className="text-[10px] tracking-widest text-eidolon-text/40 mt-0.5">
            {t(lang, "app.subtitle")}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
        {statChips.map((chip, i) => (
          <StatChip
            key={(chip.label as TranslationKey) + i}
            icon={chip.icon}
            label={chip.label}
            value={chip.value.toLocaleString()}
            accent={chip.accent}
          />
        ))}
      </div>

      {/* Online + clock + lang */}
      <div className="flex items-center gap-2 sm:gap-3">
        <div
          className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider"
          aria-label={`System status: ${t(lang, "app.status.online")}`}
        >
          <span className="relative flex size-2">
            <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-75" />
            <span className="relative inline-flex size-2 rounded-full bg-emerald-400" />
          </span>
          <span className="text-emerald-400 font-semibold">{t(lang, "app.status.online")}</span>
        </div>
        <div
          className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-cyan-400/5 border border-cyan-400/15 tabular-nums"
          title="Asia/Shanghai time"
        >
          <Clock className="size-3.5 text-eidolon-cyan" aria-hidden />
          <span className="text-xs text-eidolon-cyan font-medium">{clock}</span>
          <span className="text-[9px] text-eidolon-text/40 hidden sm:inline">{t(lang, "app.cst")}</span>
        </div>
        <LangToggle />
      </div>
    </header>
  );
}
