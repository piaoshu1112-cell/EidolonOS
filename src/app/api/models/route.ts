/**
 * /api/models — Public Provider/Model Registry
 * ------------------------------------------------------------------
 * Returns the static list of LLM providers and their models so the
 * frontend can render a picker. This endpoint never leaks secrets:
 * the registry itself contains only public base URLs and docs links.
 * User-supplied API keys live in the browser's localStorage and are
 * sent per-request via x-llm-* headers, never stored server-side.
 */
import { NextResponse } from 'next/server'
import { MODEL_PROVIDERS } from '@/lib/eidolon/model-providers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json({ success: true, providers: MODEL_PROVIDERS })
}
