'use client';

import { useState } from "react";
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
} from "@tanstack/react-query";
import { useMatrixStore, type DashboardStats } from "@/lib/store/matrix-store";
import { ParticleBg } from "@/components/shared/particle-bg";
import { SystemStatus } from "@/components/eidolon/system-status";
import { PrimePanel } from "@/components/eidolon/prime-panel";
import { EidolonPanel } from "@/components/eidolon/eidolon-panel";
import { HolographicChat } from "@/components/eidolon/holographic-chat";
import { VesselPanel } from "@/components/eidolon/vessel-panel";
import { MemoryVault } from "@/components/eidolon/memory-vault";
import { AA2PProtocol } from "@/components/eidolon/aa2p-protocol";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

function MatrixConsoleInner() {
  const setStats = useMatrixStore((s) => s.setStats);
  const selectedEidolonId = useMatrixStore((s) => s.selectedEidolonId);
  // `chatKey` resets HolographicChat internal state whenever the selected
  // Eidolon changes (canonical React 19 pattern for "reset state on prop change").
  const chatKey = selectedEidolonId ?? "none";

  // Boot the dashboard stats; child panels fetch their own resources.
  const { isError, refetch } = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const res = await fetch("/api/dashboard");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as DashboardStats;
      setStats(data);
      return data;
    },
    retry: 1,
    refetchInterval: 30_000,
  });

  return (
    <>
      <ParticleBg />

      <div className="relative z-10 flex flex-col flex-1 min-h-0">
        <SystemStatus />

        {/* Main content area */}
        <div className="flex-1 min-h-0 p-2 sm:p-3">
          {/* Desktop: 3-column grid */}
          <div className="hidden lg:grid lg:grid-cols-[280px_minmax(0,1fr)_340px] gap-3 h-full min-h-0">
            <aside className="flex flex-col gap-3 min-h-0 overflow-hidden">
              <PrimePanel />
              <EidolonPanel />
            </aside>
            <section className="min-h-0">
              <HolographicChat key={chatKey} />
            </section>
            <aside className="min-h-0 overflow-hidden">
              <Tabs defaultValue="vessel" className="h-full flex flex-col gap-2">
                <TabsList className="grid grid-cols-3 w-full bg-cyan-400/5 border border-cyan-400/15">
                  <TabsTrigger
                    value="vessel"
                    className="data-[state=active]:bg-cyan-400/15 data-[state=active]:text-eidolon-cyan text-[10px] uppercase tracking-wider"
                  >
                    Vessel
                  </TabsTrigger>
                  <TabsTrigger
                    value="memory"
                    className="data-[state=active]:bg-cyan-400/15 data-[state=active]:text-eidolon-cyan text-[10px] uppercase tracking-wider"
                  >
                    Memory
                  </TabsTrigger>
                  <TabsTrigger
                    value="aa2p"
                    className="data-[state=active]:bg-cyan-400/15 data-[state=active]:text-eidolon-cyan text-[10px] uppercase tracking-wider"
                  >
                    AA2P
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="vessel" className="flex-1 min-h-0 overflow-hidden">
                  <VesselPanel />
                </TabsContent>
                <TabsContent value="memory" className="flex-1 min-h-0 overflow-hidden">
                  <MemoryVault />
                </TabsContent>
                <TabsContent value="aa2p" className="flex-1 min-h-0 overflow-hidden">
                  <AA2PProtocol />
                </TabsContent>
              </Tabs>
            </aside>
          </div>

          {/* Mobile: chat first, then tabs */}
          <div className="lg:hidden flex flex-col gap-3">
            <section className="min-h-[55vh]">
              <HolographicChat key={chatKey} />
            </section>
            <Tabs defaultValue="prime">
              <TabsList className="grid grid-cols-5 w-full bg-cyan-400/5 border border-cyan-400/15 h-9">
                <TabsTrigger
                  value="prime"
                  className="data-[state=active]:bg-cyan-400/15 data-[state=active]:text-eidolon-cyan text-[10px] uppercase tracking-wide"
                >
                  Prime
                </TabsTrigger>
                <TabsTrigger
                  value="eidolon"
                  className="data-[state=active]:bg-cyan-400/15 data-[state=active]:text-eidolon-cyan text-[10px] uppercase tracking-wide"
                >
                  Eidolon
                </TabsTrigger>
                <TabsTrigger
                  value="vessel"
                  className="data-[state=active]:bg-cyan-400/15 data-[state=active]:text-eidolon-cyan text-[10px] uppercase tracking-wide"
                >
                  Vessel
                </TabsTrigger>
                <TabsTrigger
                  value="memory"
                  className="data-[state=active]:bg-cyan-400/15 data-[state=active]:text-eidolon-cyan text-[10px] uppercase tracking-wide"
                >
                  Memory
                </TabsTrigger>
                <TabsTrigger
                  value="aa2p"
                  className="data-[state=active]:bg-cyan-400/15 data-[state=active]:text-eidolon-cyan text-[10px] uppercase tracking-wide"
                >
                  AA2P
                </TabsTrigger>
              </TabsList>
              <TabsContent value="prime" className="mt-2">
                <PrimePanel />
              </TabsContent>
              <TabsContent value="eidolon" className="mt-2">
                <EidolonPanel />
              </TabsContent>
              <TabsContent value="vessel" className="mt-2">
                <VesselPanel />
              </TabsContent>
              <TabsContent value="memory" className="mt-2">
                <MemoryVault />
              </TabsContent>
              <TabsContent value="aa2p" className="mt-2">
                <AA2PProtocol />
              </TabsContent>
            </Tabs>
          </div>

          {/* Dashboard error strip (non-blocking) */}
          {isError && (
            <div className="mt-3 text-[11px] text-eidolon-amber flex items-center gap-2 px-2 py-1 border border-amber-400/20 rounded bg-amber-400/5">
              <span>⚠ Dashboard sync failed</span>
              <button
                type="button"
                onClick={() => refetch()}
                className="ml-auto underline hover:text-eidolon-amber/80"
              >
                Retry
              </button>
            </div>
          )}
        </div>

        {/* Sticky footer */}
        <footer className="mt-auto relative z-10 hologram-panel border-t border-cyan-400/25">
          <div className="px-4 py-2 flex items-center justify-center gap-3 text-[10px] tracking-wider text-eidolon-text/50">
            <span className="text-eidolon-cyan/70">© EidolonOS</span>
            <span className="text-eidolon-cyan/40">·</span>
            <span>AA2P v1.0</span>
            <span className="text-eidolon-cyan/40">·</span>
            <span className="text-emerald-400/80">AP2 Ready</span>
            <span className="text-eidolon-cyan/40">·</span>
            <span className="text-eidolon-violet/70">Built by 15+ Years Architect</span>
          </div>
        </footer>
      </div>
    </>
  );
}

/**
 * MatrixConsole — the shell. Sets up the TanStack Query client and renders
 * the particle background, header, 3-column responsive grid and sticky footer.
 */
export function MatrixConsole() {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
            retry: 1,
            staleTime: 15_000,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <MatrixConsoleInner />
    </QueryClientProvider>
  );
}
