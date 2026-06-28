'use client';

import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useMatrixStore } from "@/lib/store/matrix-store";
import { Network, Shield, Send, Loader2, Coins, Globe, Cpu } from "lucide-react";
import { toast } from "sonner";
import { HolographicCard } from "@/components/shared/holographic-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type AgentCard = {
  name?: string;
  description?: string;
  version?: string;
  capabilities?: string[];
  endpoints?: { type?: string; url?: string }[];
  walletAddress?: string;
  [k: string]: unknown;
};

type ConverseResult = {
  success?: boolean;
  response?: string;
  ledgerId?: string;
  txHash?: string;
  tdpoStatus?: string;
  reputation?: number;
  delayMs?: number;
  cognitiveValue?: number;
  tokensOut?: number;
  vesselId?: string;
  error?: string;
  [k: string]: unknown;
};

type SettleResult = {
  success?: boolean;
  settled?: number;
  txHash?: string;
  totalValue?: number;
  error?: string;
  [k: string]: unknown;
};

function TdpoDiagram() {
  return (
    <div className="rounded-md border border-cyan-400/15 bg-cyan-400/[0.03] p-2.5">
      <div className="text-[10px] uppercase tracking-wider text-eidolon-cyan/80 mb-1.5 flex items-center gap-1">
        <Shield className="size-3" /> TDPO Cognitive Firewall
      </div>
      <pre className="text-[9px] sm:text-[10px] leading-tight text-eidolon-text/70 font-mono whitespace-pre-wrap">
{`┌─ L1 PROACTIVE ─────────────────┐
│  Time-Delayed Pricing          │  >5 concurrent OR rep <20
│  → exponential backoff (1→8s)  │  → >15s ⇒ 429 Rejected
└─────────────────────────────────┘
┌─ L1 INJECTION GUARD ───────────┐
│  Prompt blacklist regex        │  "ignore previous", "transfer all"
│  → rep -10, HTTP 403           │  "bypass ap2 settle"
└─────────────────────────────────┘
┌─ L2 AP2 BUDGET FENCE ──────────┐
│  Off-chain Ledger (ms)         │  threshold reached / daily
│  → AP2 batch settle (sec)      │  ⇒ ledger.status = settled
└─────────────────────────────────┘`}
      </pre>
    </div>
  );
}

export function AA2PProtocol() {
  const [message, setMessage] = useState("");
  const [agentWallet, setAgentWallet] = useState("");
  const [converseResult, setConverseResult] = useState<ConverseResult | null>(null);
  const [settleResult, setSettleResult] = useState<SettleResult | null>(null);
  const [rep, setRep] = useState(100);

  const selectedPrimeId = useMatrixStore((s) => s.selectedPrimeId);
  const selectedEidolonId = useMatrixStore((s) => s.selectedEidolonId);
  const selectedEidolonName = useMatrixStore((s) => {
    const e = s.eidolons.find((x) => x.id === s.selectedEidolonId);
    return e?.name ?? null;
  });

  // Fetch the AA2P Agent Card (served as static file from /.well-known/agent.json)
  const { data: agentCard, isError: cardErr } = useQuery({
    queryKey: ["aa2p-agent-card"],
    queryFn: async () => {
      const res = await fetch("/.well-known/agent.json", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return (await res.json()) as AgentCard;
    },
    retry: 0,
    staleTime: 60_000,
  });

  const converseMutation = useMutation({
    mutationFn: async (payload: {
      message: string;
      agentWallet: string;
      eidolonId: string;
      primeId: string;
    }) => {
      const res = await fetch("/api/aa2p/converse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json().catch(() => ({}))) as ConverseResult;
      if (!res.ok) {
        throw new Error(data.error || data.response || `HTTP ${res.status}`);
      }
      return data;
    },
    onSuccess: (data) => {
      setConverseResult(data);
      // Mirror TDPO reputation rules locally (backend increments +1 on success).
      setRep((r) => Math.min(100, r + 1));
      toast.success("AA2P invocation acknowledged", {
        description: data.ledgerId
          ? `Ledger ${data.ledgerId.slice(0, 10)}…`
          : undefined,
      });
    },
    onError: (err: Error) => {
      setConverseResult({ error: err.message });
      // Mirror TDPO penalty locally (-10 on blocked / errored invocation).
      setRep((r) => Math.max(0, r - 10));
      toast.error("AA2P invocation blocked", { description: err.message });
    },
  });

  const settleMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/aa2p/settle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = (await res.json().catch(() => ({}))) as SettleResult;
      if (!res.ok) {
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      return data;
    },
    onSuccess: (data) => {
      setSettleResult(data);
      toast.success(
        `Settled ${data.settledCount ?? 0} ledger entr${(data.settledCount ?? 0) === 1 ? "y" : "ies"}`
      );
    },
    onError: (err: Error) => {
      toast.error("Settlement failed", { description: err.message });
    },
  });

  return (
    <HolographicCard
      title="AA2P Protocol"
      subtitle={
        selectedEidolonName
          ? `Agent-to-Agent · invoking ${selectedEidolonName}`
          : "Agent-to-Agent · 灵魂协议"
      }
      glow={1}
      className="h-full"
      bodyClassName="overflow-y-auto scrollbar-cyan p-2 flex flex-col gap-3"
    >
      {/* Agent card */}
      <div className="rounded-md border border-cyan-400/20 bg-cyan-400/[0.03] p-2.5">
        <div className="text-[10px] uppercase tracking-wider text-eidolon-cyan/80 mb-1 flex items-center gap-1">
          <Globe className="size-3" /> Agent Card
          <span className="text-eidolon-text/30 ml-auto font-normal normal-case tracking-normal">
            /.well-known/agent.json
          </span>
        </div>
        {cardErr && (
          <p className="text-[11px] text-eidolon-amber">
            ⚠ Agent card not yet published. (Task 2-c will provision{" "}
            <code className="text-eidolon-cyan/70">/.well-known/agent.json</code>.)
          </p>
        )}
        {agentCard && (
          <div className="space-y-1 text-[11px]">
            <div className="flex items-center gap-1.5">
              <Network className="size-3 text-eidolon-cyan" />
              <span className="font-semibold text-eidolon-cyan eidolon-text-glow">
                {agentCard.name ?? "EidolonOS-Agent"}
              </span>
              {agentCard.version && (
                <Badge className="text-[9px] py-0 px-1.5 bg-cyan-400/10 text-eidolon-cyan border-cyan-400/30">
                  v{agentCard.version}
                </Badge>
              )}
            </div>
            {agentCard.description && (
              <p className="text-eidolon-text/60 leading-snug">
                {agentCard.description}
              </p>
            )}
            {agentCard.walletAddress && (
              <p className="text-[10px] text-eidolon-text/40 font-mono truncate">
                wallet: {agentCard.walletAddress}
              </p>
            )}
            {agentCard.capabilities && agentCard.capabilities.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-1">
                {agentCard.capabilities.map((c) => (
                  <Badge
                    key={c}
                    className="text-[9px] py-0 px-1.5 bg-violet-400/10 text-eidolon-violet border-violet-400/30"
                  >
                    {c}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* External agent test */}
      <div className="rounded-md border border-cyan-400/15 bg-cyan-400/[0.03] p-2.5 space-y-2">
        <div className="text-[10px] uppercase tracking-wider text-eidolon-cyan/80 flex items-center gap-1">
          <Send className="size-3" /> External Agent Test
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="aa2p-wallet" className="text-[10px] text-eidolon-text/60">
            Agent Wallet Address
          </Label>
          <Input
            id="aa2p-wallet"
            value={agentWallet}
            onChange={(e) => setAgentWallet(e.target.value)}
            placeholder="0x…  (external agent wallet)"
            className="bg-cyan-400/5 border-cyan-400/25 text-xs h-7 font-mono"
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="aa2p-msg" className="text-[10px] text-eidolon-text/60">
            Message
          </Label>
          <Textarea
            id="aa2p-msg"
            rows={3}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Transmit a message to the matrix via AA2P…"
            className="bg-cyan-400/5 border-cyan-400/25 text-xs resize-y"
          />
        </div>
        <Button
          size="sm"
          onClick={() => {
            if (!selectedPrimeId || !selectedEidolonId) {
              toast.error("Select a Prime and Eidolon first (the AA2P endpoint invokes the currently-selected Eidolon on the agent's behalf)");
              return;
            }
            if (!message.trim()) {
              toast.error("Message required");
              return;
            }
            if (!agentWallet.trim()) {
              toast.error("Agent wallet required");
              return;
            }
            converseMutation.mutate({
              message: message.trim(),
              agentWallet: agentWallet.trim(),
              eidolonId: selectedEidolonId,
              primeId: selectedPrimeId,
            });
          }}
          disabled={converseMutation.isPending}
          className="h-7 text-[11px] bg-eidolon-cyan text-eidolon-bg hover:bg-eidolon-cyan/90 font-semibold w-full"
        >
          {converseMutation.isPending ? (
            <Loader2 className="size-3 animate-spin" />
          ) : (
            <Send className="size-3" />
          )}
          Invoke via AA2P
        </Button>

        {converseResult && (
          <div className="rounded border border-cyan-400/20 bg-cyan-400/5 p-2 space-y-1">
            {converseResult.error ? (
              <p className="text-[11px] text-red-400">
                ⚠ {converseResult.error}
              </p>
            ) : (
              <>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] uppercase tracking-wider text-eidolon-cyan/70">
                    Response
                  </span>
                  <Badge className="text-[9px] py-0 px-1.5 bg-cyan-400/10 text-eidolon-cyan border-cyan-400/30">
                    rep {rep}
                  </Badge>
                </div>
                <p className="text-[11px] text-eidolon-text/85 leading-snug whitespace-pre-wrap">
                  {converseResult.response ?? "(no content)"}
                </p>
                <div className="flex flex-wrap gap-2 text-[10px] text-eidolon-text/50 pt-1">
                  {converseResult.ledgerId && (
                    <span className="font-mono">
                      ledger: {converseResult.ledgerId.slice(0, 14)}…
                    </span>
                  )}
                  {typeof converseResult.cognitiveValue === "number" && (
                    <span>cog value: {converseResult.cognitiveValue}</span>
                  )}
                  {typeof converseResult.tokensOut === "number" && (
                    <span>tokens: {converseResult.tokensOut}</span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 text-[10px] mt-1 pt-1 border-t border-cyan-400/15">
                  <Shield className="size-2.5 text-eidolon-cyan" />
                  <span className="text-eidolon-text/60">TDPO:</span>
                  <span className="font-mono text-emerald-400">passed</span>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Settle pending */}
      <div className="rounded-md border border-amber-400/20 bg-amber-400/[0.03] p-2.5 space-y-2">
        <div className="text-[10px] uppercase tracking-wider text-eidolon-amber/90 flex items-center gap-1">
          <Coins className="size-3" /> AP2 Async Settlement
        </div>
        <p className="text-[10px] text-eidolon-text/50 leading-snug">
          Batch-settle pending ledger entries on-chain via AP2 BudgetFence.
        </p>
        <Button
          size="sm"
          variant="outline"
          onClick={() => settleMutation.mutate()}
          disabled={settleMutation.isPending}
          className="h-7 text-[11px] border-amber-400/40 text-eidolon-amber hover:bg-amber-400/10 hover:text-eidolon-amber w-full"
        >
          {settleMutation.isPending ? (
            <Loader2 className="size-3 animate-spin" />
          ) : (
            <Coins className="size-3" />
          )}
          Settle Pending
        </Button>
        {settleResult && (
          <div className="rounded border border-amber-400/25 bg-amber-400/5 p-2 text-[11px]">
            <div className="flex items-center justify-between">
              <span className="text-eidolon-text/60">Settled entries:</span>
              <span className="text-eidolon-amber font-semibold tabular-nums">
                {settleResult.settled ?? 0}
              </span>
            </div>
            {settleResult.txHash && (
              <div className="flex items-center gap-1 mt-1 pt-1 border-t border-amber-400/15">
                <Cpu className="size-2.5 text-eidolon-amber" />
                <span className="text-eidolon-text/50">txHash:</span>
                <span className="font-mono text-eidolon-amber/80 truncate">
                  {settleResult.txHash.slice(0, 24)}…
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      <TdpoDiagram />
    </HolographicCard>
  );
}
