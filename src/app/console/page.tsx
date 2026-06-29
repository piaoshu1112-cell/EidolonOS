'use client';

import { MatrixConsole } from "@/components/eidolon/matrix-console";

/**
 * /console — the full Eidolon Matrix Console (3-column holographic UI).
 *
 * The landing page at `/` markets the project; this route hosts the actual
 * interactive matrix (Prime / Eidolon / Vessel panels + Holographic Chat).
 *
 * Marked 'use client' because MatrixConsole pulls in Zustand + TanStack Query
 * + framer-motion, all of which need the browser.
 */
export default function ConsolePage() {
  return (
    <div className="min-h-screen flex flex-col">
      <MatrixConsole />
    </div>
  );
}
