import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

/* ===== Domain types (mirror Prisma schema, normalized for client) ===== */

export type Prime = {
  id: string;
  email: string | null;
  walletAddress: string | null;
  telegramId: string | null;
  discordId?: string | null;
  handle?: string | null;
  displayName: string;
  reputation: number;
  createdAt: string;
  updatedAt: string;
  /** Nested on GET /api/primes (each prime includes its eidolons). */
  eidolons?: Eidolon[];
  _count?: { eidolons?: number; ledgers?: number };
};

export type EidolonStatus = "dormant" | "awakening" | "active" | "sealed";

export type Eidolon = {
  id: string;
  name: string;
  personaPrompt: string;
  personality?: string;
  skills?: string;
  status: EidolonStatus;
  primeId: string;
  vesselId: string | null;
  vessel?: Pick<
    Vessel,
    "id" | "codename" | "modelRoute" | "status"
  > | null;
  prime?: Pick<Prime, "id" | "displayName"> | null;
  createdAt: string;
  updatedAt: string;
};

export type VesselStatus = "idle" | "running" | "overloaded" | "sealed";

export type Vessel = {
  id: string;
  codename: string;
  modelRoute: string;
  apiQuota: number;
  tokensUsed: number;
  /** Added by /api/vessels GET breakdown. */
  usagePercent?: number;
  /** Added by /api/vessels GET breakdown. */
  eidolonCount?: number;
  status: VesselStatus;
  temperature: number;
  maxTokens: number;
  createdAt: string;
  updatedAt?: string;
};

export type MemoryShard = {
  id: string;
  eidolonId: string;
  content: string;
  metadata: Record<string, unknown> | string;
  source: string;
  /** Returned by /api/memory (list) — embedding dimensionality. */
  embeddingDim?: number;
  /** Returned by /api/memory/recall — cosine similarity score. */
  similarity?: number;
  createdAt: string;
};

export type DashboardStats = {
  success: boolean;
  systemStatus: string;
  counts: {
    primes: number;
    eidolons: number;
    vessels: number;
    memoryShards: number;
  };
  vessels: Array<{
    id: string;
    codename: string;
    modelRoute: string;
    apiQuota: number;
    tokensUsed: number;
    usagePercent: number;
    status: VesselStatus;
    eidolonCount: number;
  }>;
  totalTokensUsed: number;
  eidolonsByStatus: Record<string, number>;
  recentLedgers: unknown[];
};

/* ===== Store ===== */

interface MatrixState {
  // UI selection state (persisted)
  selectedPrimeId: string | null;
  selectedEidolonId: string | null;

  // Server-state mirror (NOT persisted)
  primes: Prime[];
  eidolons: Eidolon[];
  vessels: Vessel[];
  stats: DashboardStats | null;
  isSyncing: boolean;

  // Actions
  setPrime: (id: string | null) => void;
  setEidolon: (id: string | null) => void;
  setPrimes: (p: Prime[]) => void;
  setEidolons: (e: Eidolon[]) => void;
  setVessels: (v: Vessel[]) => void;
  setStats: (s: DashboardStats | null) => void;
  setSyncing: (s: boolean) => void;
}

export const useMatrixStore = create<MatrixState>()(
  persist(
    (set) => ({
      selectedPrimeId: null,
      selectedEidolonId: null,
      primes: [],
      eidolons: [],
      vessels: [],
      stats: null,
      isSyncing: false,
      setPrime: (id) => set({ selectedPrimeId: id }),
      setEidolon: (id) => set({ selectedEidolonId: id }),
      setPrimes: (primes) => set({ primes }),
      setEidolons: (eidolons) => set({ eidolons }),
      setVessels: (vessels) => set({ vessels }),
      setStats: (stats) => set({ stats }),
      setSyncing: (isSyncing) => set({ isSyncing }),
    }),
    {
      name: "eidolon-matrix",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        selectedPrimeId: s.selectedPrimeId,
        selectedEidolonId: s.selectedEidolonId,
      }),
    }
  )
);
