/**
 * zai-bootstrap.ts — Runtime config initializer for z-ai-web-dev-sdk.
 *
 * PROBLEM: The SDK reads credentials from a `.z-ai-config` FILE (not env vars).
 * On Vercel/serverless, that file doesn't exist. We synthesize it at runtime
 * from environment variables so the SDK can authenticate.
 *
 * Env vars expected (set in Vercel Dashboard → Settings → Environment Variables):
 *   ZAI_BASE_URL  — e.g. https://internal-api.z.ai/v1
 *   ZAI_API_KEY   — API key
 *   ZAI_TOKEN     — JWT auth token
 *   ZAI_CHAT_ID   — chat session id (optional)
 *   ZAI_USER_ID   — user id (optional)
 *
 * Side-effect import: just `import "./zai-bootstrap"` before calling ZAI.create().
 */

import { writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { homedir, tmpdir } from "node:os";

const ENV = process.env;

function ensureZaiConfig(): void {
  // If a config file already exists in cwd, trust it (local dev has /etc/.z-ai-config fallback).
  const cwdConfig = join(process.cwd(), ".z-ai-config");
  if (existsSync(cwdConfig)) return;

  const homeConfig = join(homedir(), ".z-ai-config");
  if (existsSync(homeConfig)) return;

  if (existsSync("/etc/.z-ai-config")) return;

  // No config file found anywhere — synthesize from env vars.
  const baseUrl = ENV.ZAI_BASE_URL;
  const apiKey = ENV.ZAI_API_KEY;

  if (!baseUrl || !apiKey) {
    // No env vars either — let ZAI.create() throw its normal error.
    return;
  }

  const config = {
    baseUrl,
    apiKey,
    token: ENV.ZAI_TOKEN || undefined,
    chatId: ENV.ZAI_CHAT_ID || undefined,
    userId: ENV.ZAI_USER_ID || undefined,
  };

  const json = JSON.stringify(config);

  // Try writing to cwd first; if read-only (Vercel), fall back to /tmp and
  // set HOME=/tmp so the SDK finds it there.
  try {
    writeFileSync(cwdConfig, json, { flag: "w" });
    return;
  } catch {
    // cwd not writable — fall through to /tmp
  }

  try {
    const tmpConfig = join(tmpdir(), ".z-ai-config");
    writeFileSync(tmpConfig, json, { flag: "w" });
    // Point HOME at /tmp so the SDK's homeDir lookup finds the config.
    if (!ENV.HOME || !existsSync(join(ENV.HOME, ".z-ai-config"))) {
      ENV.HOME = tmpdir();
    }
  } catch {
    // Last resort — can't write anywhere. ZAI.create() will throw.
  }
}

ensureZaiConfig();

export {};
