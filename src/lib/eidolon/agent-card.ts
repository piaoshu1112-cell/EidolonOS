/**
 * agent-card.ts — AA2P Agent Card Generator
 * ------------------------------------------------------------------
 * Per the AA2P (Agent-to-Agent Protocol) spec at aa2p.xyz, every
 * agent publishes a machine-readable card describing its identity,
 * capabilities, and endpoint surface. This card is what another
 * Eidolon (or external agent) reads to discover how to converse,
 * settle, and authenticate with this EidolonOS instance.
 *
 * Endpoints are relative paths so the same card works behind the
 * Caddy gateway regardless of deployment host.
 */

export interface AgentCapability {
  name: string
  description: string
}

export interface AgentEndpoint {
  path: string
  method: 'POST' | 'GET'
  description: string
}

export interface AgentCard {
  protocol: string
  version: string
  registry_url: string
  agent: {
    name: string
    description: string
    capabilities: AgentCapability[]
    endpoints: AgentEndpoint[]
  }
  supported_protocols: string[]
}

/**
 * Return the canonical AA2P Agent Card for this EidolonOS instance.
 * Pure function — no I/O — so it can be served by both the GEO static
 * manifest route and any runtime introspection endpoint.
 */
export function getAgentCard(): AgentCard {
  return {
    protocol: 'aa2p',
    version: '1.0.0',
    registry_url: 'https://aa2p.xyz',
    agent: {
      name: 'EidolonOS',
      description:
        'Web4.0 digital-life engine — a Three-Layer (Prime / Eidolon / Vessel) digital-twin matrix with RAG long-term memory, SSE consciousness streaming, TDPO cognitive firewall, and AP2 async settlement.',
      capabilities: [
        {
          name: 'consciousness_stream',
          description:
            'Streaming cognition via SSE — token-by-token consciousness emission with RAG-recalled memory shards.',
        },
        {
          name: 'memory_engrave_recall',
          description:
            'Engrave long-term memory shards and recall by semantic similarity (TF-hash embedding + cosine).',
        },
        {
          name: 'ap2_settlement',
          description:
            'Off-chain ledger with async on-chain batch settlement via the AP2 BudgetFence.',
        },
        {
          name: 'tdpo_guard',
          description:
            'Time-Delayed Pricing & Optimization cognitive firewall — concurrency backpressure + prompt-injection defense.',
        },
      ],
      endpoints: [
        {
          path: '/api/aa2p/converse',
          method: 'POST',
          description:
            'One-shot cross-dimensional converse with an Eidolon. Guarded by TDPO. Returns aggregated JSON response plus ledgerId.',
        },
        {
          path: '/api/aa2p/settle',
          method: 'POST',
          description:
            'Trigger AP2 batch settlement of pending ledger entries.',
        },
      ],
    },
    supported_protocols: ['aa2p', 'ap2', 'a2a', 'sse'],
  }
}
