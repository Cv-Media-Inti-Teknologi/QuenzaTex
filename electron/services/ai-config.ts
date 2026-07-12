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
  /** true for the "Custom (OpenAI-compatible)" pseudo-provider */
  custom?: boolean
}

export interface CustomProviderConfig {
  /** provider id used in opencode.json (slug) */
  id: string
  name: string
  baseURL: string
  apiKey: string
  modelId: string
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
  name?: string
  toolCall?: boolean
  free?: boolean
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
  {
    id: "custom",
    name: "Custom (OpenAI-compatible)",
    keyUrl: "https://opencode.ai/docs/providers/",
    hint: "Connect any OpenAI-compatible endpoint (LM Studio, Ollama, Groq, etc.).",
    exampleModels: [],
    custom: true,
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

/** Global opencode config path: ~/.config/opencode/opencode.json */
function getConfigPath(): string {
  return path.join(os.homedir(), ".config", "opencode", "opencode.json")
}

function readConfigJson(): Record<string, any> {
  const p = getConfigPath()
  if (!existsSync(p)) return { $schema: "https://opencode.ai/config.json" }
  try {
    return JSON.parse(readFileSync(p, "utf-8")) || {}
  } catch (err) {
    logger.warn("Failed to parse opencode.json", err)
    return { $schema: "https://opencode.ai/config.json" }
  }
}

function writeConfigJson(data: Record<string, any>): void {
  const p = getConfigPath()
  const dir = path.dirname(p)
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  writeFileSync(p, JSON.stringify(data, null, 2), "utf-8")
}

/**
 * Configure a custom OpenAI-compatible provider in opencode.json, per the
 * opencode docs (provider.<id>.npm = "@ai-sdk/openai-compatible", options.baseURL,
 * options.apiKey, models map). Returns the full model id (provider/model).
 */
export function saveCustomProvider(
  cfg: CustomProviderConfig
): { ok: boolean; error?: string; model?: string } {
  const id = (cfg.id || "").trim().toLowerCase().replace(/[^a-z0-9_-]/g, "")
  const baseURL = (cfg.baseURL || "").trim()
  const apiKey = (cfg.apiKey || "").trim()
  const modelId = (cfg.modelId || "").trim()
  const name = (cfg.name || cfg.id || "Custom").trim()

  if (!id || !baseURL || !modelId) {
    return { ok: false, error: "Provider id, base URL, and model id are required." }
  }

  try {
    // Store the key in auth.json (opencode's credential store)
    if (apiKey) {
      const auth = readAuthJson()
      auth[id] = { type: "api", key: apiKey }
      writeAuthJson(auth)
    }

    // Register the provider + model in opencode.json
    const config = readConfigJson()
    config.provider = config.provider || {}
    config.provider[id] = {
      npm: "@ai-sdk/openai-compatible",
      name,
      options: { baseURL },
      models: {
        [modelId]: { name: modelId },
      },
    }
    writeConfigJson(config)

    modelCache = null // invalidate so the new model shows up
    const full = `${id}/${modelId}`
    logger.ai(`Saved custom provider: ${full}`)
    return { ok: true, model: full }
  } catch (err: any) {
    logger.error("Failed to save custom provider", err?.message)
    return { ok: false, error: err?.message || "Failed to write config." }
  }
}

/**
 * Ping-pong connectivity check: sends a tiny message to the given model and
 * verifies it replies without an auth/model error. Confirms the API key,
 * base URL, and model id are all valid.
 */
export function checkConnection(
  modelFull: string
): { ok: boolean; error?: string; reply?: string; ms?: number } {
  if (!modelFull || !modelFull.includes("/")) {
    return { ok: false, error: "No model selected." }
  }

  const bin = resolveOpenCodeBinary()
  const needsShell = bin.endsWith(".cmd")
  const start = Date.now()
  try {
    const result = spawnSync(
      bin,
      [
        "run",
        "--agent",
        "build",
        "--model",
        modelFull,
        "Connectivity test. Reply with the single word: PONG",
      ],
      {
        encoding: "utf-8",
        shell: needsShell,
        timeout: 45000,
        maxBuffer: 1024 * 1024 * 10,
      }
    )
    const ms = Date.now() - start
    const stdout = (result.stdout || "").replace(/\x1b\[[0-9;]*m/g, "")
    const stderr = (result.stderr || "").replace(/\x1b\[[0-9;]*m/g, "")
    const combined = `${stdout}\n${stderr}`

    // Model / provider not found
    if (/ProviderModelNotFound|Model not found|Did you mean/i.test(combined)) {
      return { ok: false, error: "Model not found — check the model ID.", ms }
    }
    // Auth problems
    if (/unauthor|invalid[\s_-]?api|api[\s_-]?key|401|forbidden|authentication/i.test(combined)) {
      return { ok: false, error: "Authentication failed — check your API key.", ms }
    }
    // Endpoint / network problems (common for custom baseURL)
    if (/ENOTFOUND|ECONNREFUSED|ETIMEDOUT|fetch failed|network|getaddrinfo/i.test(combined)) {
      return { ok: false, error: "Could not reach the endpoint — check the base URL.", ms }
    }
    // Generic opencode error envelope
    if (/"name":\s*"\w*Error"|^Error:/im.test(combined) || (result.status ?? 0) !== 0) {
      const m = combined.match(/"message":\s*"([^"]+)"/)
      return { ok: false, error: m?.[1] || "The model returned an error.", ms }
    }

    // Success: extract a short reply snippet
    const reply = stdout
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith(">") && !l.startsWith("timestamp="))
      .join(" ")
      .slice(0, 80)

    if (!reply) {
      return { ok: false, error: "No response from the model.", ms }
    }

    logger.ai(`Check connection OK for ${modelFull} (${ms}ms)`)
    return { ok: true, reply, ms }
  } catch (err: any) {
    const ms = Date.now() - start
    logger.error(`Check connection failed for ${modelFull}`, err?.message)
    if (err?.signal === "SIGTERM" || /tim* out/i.test(err?.message || "")) {
      return { ok: false, error: "Timed out — the model took too long to respond.", ms }
    }
    return { ok: false, error: err?.message || "Connection check failed.", ms }
  }
}

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

/** Models for a given provider id — catalog first, then live opencode, then examples. */
export function listModelsForProvider(providerId: string): ModelEntry[] {
  // 1) Full models.dev catalog (works even before the provider is authenticated)
  const catalog = listCatalogModels(providerId)
  if (catalog.length > 0) return catalog

  // 2) Live list from opencode (only authenticated providers)
  const live = listModels().filter((m) => m.provider === providerId)
  if (live.length > 0) return live

  return []
}

// --- models.dev catalog (bundled by opencode) ---

const catalogCache = new Map<string, ModelEntry[]>()

function getCatalogPath(): string | null {
  // opencode caches the full models.dev catalog here
  const candidates = [
    path.join(os.homedir(), ".cache", "opencode", "models.json"),
    process.env.LOCALAPPDATA &&
      path.join(process.env.LOCALAPPDATA, "opencode", "cache", "models.json"),
  ].filter(Boolean) as string[]
  for (const c of candidates) {
    if (existsSync(c)) return c
  }
  return null
}

// Non-chat model id patterns we hide from the picker
const NON_CHAT = /(embedding|embed|tts|whisper|audio|realtime|image|dall-?e|vision-only|moderation|rerank|speech|transcribe|guard)/i

/**
 * Read the full models.dev catalog for a provider. Returns chat/agent models
 * with tool-calling and cost flags, without requiring the provider to be
 * authenticated.
 */
export function listCatalogModels(providerId: string): ModelEntry[] {
  const cached = catalogCache.get(providerId)
  if (cached) return cached

  const p = getCatalogPath()
  if (!p) return []

  try {
    const catalog = JSON.parse(readFileSync(p, "utf-8"))
    const prov = catalog?.[providerId]
    if (!prov?.models) return []

    const entries: ModelEntry[] = []
    for (const [modelId, raw] of Object.entries<any>(prov.models)) {
      if (NON_CHAT.test(modelId)) continue
      // keep only models that output text
      const outputs: string[] = raw?.modalities?.output || ["text"]
      if (!outputs.includes("text")) continue

      const cost = raw?.cost
      const free = !cost || (Number(cost.input) === 0 && Number(cost.output) === 0)
      entries.push({
        provider: providerId,
        model: modelId,
        full: `${providerId}/${modelId}`,
        name: raw?.name || modelId,
        toolCall: !!raw?.tool_call,
        free,
      })
    }

    // Sort: tool-capable first, then by name
    entries.sort((a, b) => {
      if (!!a.toolCall !== !!b.toolCall) return a.toolCall ? -1 : 1
      return (a.name || a.model).localeCompare(b.name || b.model)
    })

    catalogCache.set(providerId, entries)
    return entries
  } catch (err: any) {
    logger.warn(`Failed to read models catalog for ${providerId}: ${err?.message}`)
    return []
  }
}

export function getFreeDefaultModel(): string {
  return FREE_DEFAULT_MODEL
}
