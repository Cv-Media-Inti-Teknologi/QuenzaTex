import { spawnSync } from "node:child_process"
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs"
import path from "node:path"
import os from "node:os"
import { logger } from "./logger"
import { resolveOpenCodeBinary } from "./opencode"

/**
 * AI provider / model configuration service.
 *
 * API keys are stored in opencode's own auth.json
 * (~/.local/share/opencode/auth.json) using the documented shape:
 *   { "<providerId>": { "type": "api", "key": "<key>" } }
 * This is the same file `opencode auth login` writes, so keys added here are
 * picked up by opencode automatically.
 */

export interface CuratedProvider {
  id: string
  name: string
  /** where the user obtains an API key */
  keyUrl: string
  /** short hint shown under the input */
  hint: string
  /** example model ids for quick reference */
  exampleModels: string[]
}

export interface ProviderStatus {
  id: string
  connected: boolean
  authType: string | null
}

export interface ModelEntry {
  provider: string
  model: string
  full: string
}

const FREE_DEFAULT_MODEL = "opencode/deepseek-v4-flash-free"

const CURATED_PROVIDERS: CuratedProvider[] = [
  {
    id: "openai",
    name: "OpenAI",
    keyUrl: "https://platform.openai.com/api-keys",
    hint: "Paste your OpenAI API key (starts with sk-...).",
    exampleModels: ["openai/gpt-4o", "openai/gpt-4o-mini"],
  },
  {
    id: "google",
    name: "Google Gemini",
    keyUrl: "https://aistudio.google.com/app/apikey",
    hint: "Paste your Google AI Studio (Gemini) API key.",
    exampleModels: ["google/gemini-2.0-flash", "google/gemini-1.5-pro"],
  },
  {
    id: "anthropic",
    name: "Anthropic Claude",
    keyUrl: "https://console.anthropic.com/settings/keys",
    hint: "Paste your Anthropic API key (starts with sk-ant-...).",
    exampleModels: ["anthropic/claude-sonnet-4-5", "anthropic/claude-3-5-haiku"],
  },
]

function getAuthPath(): string {
  return path.join(os.homedir(), ".local", "share", "opencode", "auth.json")
}

function readAuthJson(): Record<string, { type?: string; key?: string }> {
  const p = getAuthPath()
  if (!existsSync(p)) return {}
  try {
    const raw = readFileSync(p, "utf-8")
    return JSON.parse(raw) || {}
  } catch (err) {
    logger.warn("Failed to parse auth.json", err)
    return {}
  }
}

function writeAuthJson(data: Record<string, unknown>): void {
  const p = getAuthPath()
  const dir = path.dirname(p)
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
  writeFileSync(p, JSON.stringify(data, null, 2), "utf-8")
}

export function getCuratedProviders(): CuratedProvider[] {
  return CURATED_PROVIDERS
}

/** Returns connection status for each curated provider (does it have a key?). */
export function getProviderStatus(): ProviderStatus[] {
  const auth = readAuthJson()
  return CURATED_PROVIDERS.map((prov) => {
    const entry = auth[prov.id]
    return {
      id: prov.id,
      connected: !!entry && (entry.type === "api" ? !!entry.key : true),
      authType: entry?.type ?? null,
    }
  })
}

/** Save an API key for a provider into auth.json. */
export function saveApiKey(providerId: string, key: string): { ok: boolean; error?: string } {
  const trimmed = key.trim()
  if (!providerId || !trimmed) {
    return { ok: false, error: "Provider and key are required." }
  }
  try {
    const auth = readAuthJson()
    auth[providerId] = { type: "api", key: trimmed }
    writeAuthJson(auth)
    logger.ai(`Saved API key for provider: ${providerId}`)
    return { ok: true }
  } catch (err: any) {
    logger.error(`Failed to save API key for ${providerId}`, err?.message)
    return { ok: false, error: err?.message || "Failed to write auth.json" }
  }
}

/** Remove a provider's API key from auth.json. */
export function removeApiKey(providerId: string): { ok: boolean; error?: string } {
  try {
    const auth = readAuthJson()
    if (auth[providerId]) {
      delete auth[providerId]
      writeAuthJson(auth)
      logger.ai(`Removed API key for provider: ${providerId}`)
    }
    return { ok: true }
  } catch (err: any) {
    logger.error(`Failed to remove API key for ${providerId}`, err?.message)
    return { ok: false, error: err?.message || "Failed to write auth.json" }
  }
}

let modelCache: ModelEntry[] | null = null

/** List all available models via `opencode models`, parsed as provider/model. */
export function listModels(force = false): ModelEntry[] {
  if (modelCache && !force) return modelCache

  const bin = resolveOpenCodeBinary()
  const needsShell = bin.endsWith(".cmd")
  try {
    const result = spawnSync(bin, ["models"], {
      encoding: "utf-8",
      shell: needsShell,
      timeout: 30000,
      maxBuffer: 1024 * 1024 * 10,
    })
    const out = (result.stdout || "").replace(/\x1b\[[0-9;]*m/g, "")
    const entries: ModelEntry[] = []
    for (const line of out.split(/\r?\n/)) {
      const trimmed = line.trim()
      if (!trimmed || !trimmed.includes("/")) continue
      const slash = trimmed.indexOf("/")
      const provider = trimmed.slice(0, slash)
      const model = trimmed.slice(slash + 1)
      if (provider && model && !provider.includes(" ")) {
        entries.push({ provider, model, full: trimmed })
      }
    }
    modelCache = entries
    logger.ai(`Loaded ${entries.length} models from opencode`)
    return entries
  } catch (err: any) {
    logger.error("Failed to list models", err?.message)
    return []
  }
}

/** Models for a given provider id. */
export function listModelsForProvider(providerId: string): ModelEntry[] {
  return listModels().filter((m) => m.provider === providerId)
}

export function getFreeDefaultModel(): string {
  return FREE_DEFAULT_MODEL
}
