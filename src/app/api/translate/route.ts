/**
 * /api/translate — Real-time LLM-powered Translation
 * ------------------------------------------------------------------
 * POST { text, targetLang, sourceLang? }
 * → { success: true, translation: string }
 *
 * Provider resolution: reads x-llm-* headers (set by the frontend from
 * localStorage). Falls back to OPENAI_* env vars, then to the z-ai
 * sandbox SDK. This means the same provider picker the user picks in
 * the chat panel also drives real-time translation elsewhere in the UI.
 *
 * The prompt is intentionally strict ("Output ONLY the translation, no
 * explanations, no quotes") so the result can be displayed verbatim.
 */
import { NextRequest, NextResponse } from 'next/server'
import {
  completeFromVessel,
  resolveProviderConfig,
} from '@/lib/eidolon/llm-router'
import { ensureDbReady } from '@/lib/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type TargetLang = 'zh' | 'en'

export async function POST(req: NextRequest) {
  await ensureDbReady()
  try {
    const body = (await req.json().catch(() => ({}))) as {
      text?: string
      targetLang?: TargetLang
      sourceLang?: string
    }
    const { text, targetLang } = body
    if (!text || !targetLang) {
      return NextResponse.json(
        { success: false, error: 'text and targetLang required' },
        { status: 400 },
      )
    }
    if (targetLang !== 'zh' && targetLang !== 'en') {
      return NextResponse.json(
        {
          success: false,
          error: "targetLang must be 'zh' or 'en'",
        },
        { status: 400 },
      )
    }

    const providerConfig = resolveProviderConfig(req.headers)
    const targetName =
      targetLang === 'zh'
        ? 'Chinese (Simplified, 简体中文)'
        : 'English'

    const sourceClause = body.sourceLang
      ? ` The source language is ${body.sourceLang}.`
      : ''

    const messages = [
      {
        role: 'system' as const,
        content: `You are a professional translator. Translate the following text to ${targetName}.${sourceClause} Output ONLY the translation, no explanations, no quotes, no preamble.`,
      },
      { role: 'user' as const, content: text },
    ]

    const translation = await completeFromVessel(
      messages,
      { temperature: 0.3, maxTokens: 2000 },
      providerConfig,
    )

    if (!translation.trim()) {
      return NextResponse.json(
        { success: false, error: 'Translation produced no output' },
        { status: 502 },
      )
    }

    return NextResponse.json({
      success: true,
      translation: translation.trim(),
    })
  } catch (err) {
    const msg =
      err instanceof Error ? err.message : 'Translation failed'
    return NextResponse.json(
      { success: false, error: msg },
      { status: 500 },
    )
  }
}
