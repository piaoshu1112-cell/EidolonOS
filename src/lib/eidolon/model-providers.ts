/**
 * model-providers.ts — Static Registry of Available LLM Providers
 * ------------------------------------------------------------------
 * A pure-data module: no DB, no secrets, no I/O. It enumerates every
 * OpenAI-compatible LLM provider the user can plug into EidolonOS by
 * pasting an API key in the frontend (stored in their browser's
 * localStorage, sent per-request via x-llm-* headers).
 *
 * The frontend reads this list via GET /api/models to render the
 * provider/model picker. The backend (llm-router) uses the same list
 * to resolve a default base URL + model when a provider is selected
 * but no explicit overrides are given.
 *
 * Server-safe: this file has no server-only side effects and may be
 * imported from any route handler. (It is NOT imported from client
 * components — the /api/models route is the public boundary.)
 */

export interface ModelOption {
  /** Model id sent to the chat.completions API. */
  id: string
  /** Display name shown in the picker. */
  name: string
  /** Max context window in tokens. */
  contextWindow: number
  /** Whether this model is free on the provider's tier. */
  free: boolean
  /** Short human-readable description. */
  description: string
}

export interface ModelProvider {
  /** Stable provider id (matches x-llm-provider header). */
  id:
    | 'groq'
    | 'openrouter'
    | 'gemini'
    | 'together'
    | 'cerebras'
    | 'openai'
    | 'zai'
  /** Display name shown in the picker. */
  name: string
  /** OpenAI-compatible chat completions base URL (no /chat/completions suffix). */
  baseUrl: string
  /** Where the user can sign up / grab an API key. */
  docsUrl: string
  /** Human-readable summary of the free tier. */
  freeTier: string
  /** Optional note rendered in the UI. */
  note?: string
  /** Models offered by this provider. */
  models: ModelOption[]
}

export const MODEL_PROVIDERS: ModelProvider[] = [
  {
    id: 'groq',
    name: 'Groq (Free, Ultra-Fast)',
    baseUrl: 'https://api.groq.com/openai/v1',
    docsUrl: 'https://console.groq.com/keys',
    freeTier: 'Free tier with generous limits, fastest inference (LPU)',
    models: [
      {
        id: 'llama-3.3-70b-versatile',
        name: 'Llama 3.3 70B',
        contextWindow: 128000,
        free: true,
        description: 'Most capable free Llama model',
      },
      {
        id: 'llama-3.1-8b-instant',
        name: 'Llama 3.1 8B Instant',
        contextWindow: 128000,
        free: true,
        description: 'Fastest model, great for chat',
      },
      {
        id: 'gemma2-9b-it',
        name: 'Gemma 2 9B',
        contextWindow: 8192,
        free: true,
        description: 'Google Gemma 2, compact and capable',
      },
    ],
  },
  {
    id: 'openrouter',
    name: 'OpenRouter (Free Models Available)',
    baseUrl: 'https://openrouter.ai/api/v1',
    docsUrl: 'https://openrouter.ai/keys',
    freeTier: 'Free models available, unified API for 100+ models',
    models: [
      {
        id: 'meta-llama/llama-3.1-8b-instruct:free',
        name: 'Llama 3.1 8B (Free)',
        contextWindow: 128000,
        free: true,
        description: 'Free tier of Llama 3.1',
      },
      {
        id: 'google/gemma-2-9b-it:free',
        name: 'Gemma 2 9B (Free)',
        contextWindow: 8192,
        free: true,
        description: 'Free Google Gemma 2',
      },
      {
        id: 'qwen/qwen-2-7b-instruct:free',
        name: 'Qwen 2 7B (Free)',
        contextWindow: 32768,
        free: true,
        description: 'Free Qwen, good for Chinese',
      },
    ],
  },
  {
    id: 'gemini',
    name: 'Google Gemini (Free Tier)',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    docsUrl: 'https://aistudio.google.com/apikey',
    freeTier: 'Free tier: 15 RPM, 1M tokens/day',
    models: [
      {
        id: 'gemini-1.5-flash',
        name: 'Gemini 1.5 Flash',
        contextWindow: 1000000,
        free: true,
        description: 'Fast, 1M context, multimodal',
      },
      {
        id: 'gemini-1.5-flash-8b',
        name: 'Gemini 1.5 Flash 8B',
        contextWindow: 1000000,
        free: true,
        description: 'Smaller, faster variant',
      },
    ],
  },
  {
    id: 'together',
    name: 'Together AI ($5 Free Credit)',
    baseUrl: 'https://api.together.xyz/v1',
    docsUrl: 'https://api.together.xyz/settings/api-keys',
    freeTier: '$5 free credit on signup',
    models: [
      {
        id: 'meta-llama/Llama-3.3-70B-Instruct-Turbo-Free',
        name: 'Llama 3.3 70B Free',
        contextWindow: 128000,
        free: true,
        description: 'Free 70B model',
      },
      {
        id: 'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo',
        name: 'Llama 3.1 8B Turbo',
        contextWindow: 128000,
        free: false,
        description: 'Fast, paid',
      },
    ],
  },
  {
    id: 'cerebras',
    name: 'Cerebras (Free, Fastest)',
    baseUrl: 'https://api.cerebras.ai/v1',
    docsUrl: 'https://cloud.cerebras.ai',
    freeTier: 'Free tier with ultra-fast inference (Wafer-Scale Engine)',
    models: [
      {
        id: 'llama3.1-8b',
        name: 'Llama 3.1 8B',
        contextWindow: 8192,
        free: true,
        description: 'Ultra-fast on Cerebras WSE',
      },
      {
        id: 'llama-3.3-70b',
        name: 'Llama 3.3 70B',
        contextWindow: 8192,
        free: true,
        description: '70B on Cerebras',
      },
    ],
  },
  {
    id: 'openai',
    name: 'OpenAI (Paid)',
    baseUrl: 'https://api.openai.com/v1',
    docsUrl: 'https://platform.openai.com/api-keys',
    freeTier: 'Paid only (pay per token)',
    models: [
      {
        id: 'gpt-4o-mini',
        name: 'GPT-4o Mini',
        contextWindow: 128000,
        free: false,
        description: 'Cheapest OpenAI, great quality',
      },
      {
        id: 'gpt-4o',
        name: 'GPT-4o',
        contextWindow: 128000,
        free: false,
        description: 'Most capable OpenAI',
      },
    ],
  },
  {
    id: 'zai',
    name: 'Z.ai (Sandbox Only)',
    baseUrl: 'https://internal-api.z.ai/v1',
    docsUrl: '',
    freeTier: 'Only works inside Z.ai sandbox',
    note: 'Automatically used when no provider API key is set. Works in dev sandbox only.',
    models: [
      {
        id: 'glm-4.6',
        name: 'GLM-4.6 (Sandbox)',
        contextWindow: 128000,
        free: true,
        description: 'Default sandbox model',
      },
    ],
  },
]

/**
 * Look up a provider by its stable id. Returns undefined if not found,
 * which callers should treat as "fall back to sandbox".
 */
export function getProviderById(id: string): ModelProvider | undefined {
  return MODEL_PROVIDERS.find((p) => p.id === id)
}

/**
 * Pick a sensible default model for a provider (first free model, or
 * failing that, the first model in the list).
 */
export function getDefaultModelId(provider: ModelProvider): string {
  const free = provider.models.find((m) => m.free)
  return (free ?? provider.models[0])?.id ?? ''
}
