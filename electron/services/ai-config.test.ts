import { describe, it, expect, vi, beforeEach } from "vitest"

// Mock the opencode binary resolver so ai-config never spawns anything
vi.mock("./opencode", () => ({
  resolveOpenCodeBinary: () => "opencode",
}))

// In-memory fake filesystem
const files = new Map<string, string>()

vi.mock("node:fs", () => ({
  existsSync: (p: string) => files.has(p),
  readFileSync: (p: string) => {
    if (!files.has(p)) throw new Error("ENOENT")
    return files.get(p)!
  },
  writeFileSync: (p: string, data: string) => {
    files.set(p, data)
  },
  mkdirSync: () => undefined,
}))

import os from "node:os"
import path from "node:path"
import {
  getCuratedProviders,
  saveApiKey,
  removeApiKey,
  getProviderStatus,
  listCatalogModels,
} from "./ai-config"

const AUTH_PATH = path.join(os.homedir(), ".local", "share", "opencode", "auth.json")
const CATALOG_PATH = path.join(os.homedir(), ".cache", "opencode", "models.json")

beforeEach(() => {
  files.clear()
})

describe("getCuratedProviders", () => {
  it("includes openai, google, anthropic and a custom provider", () => {
    const ids = getCuratedProviders().map((p) => p.id)
    expect(ids).toContain("openai")
    expect(ids).toContain("google")
    expect(ids).toContain("anthropic")
    expect(ids).toContain("custom")
  })

  it("flags the custom provider", () => {
    const custom = getCuratedProviders().find((p) => p.id === "custom")
    expect(custom?.custom).toBe(true)
  })
})

describe("saveApiKey / removeApiKey", () => {
  it("rejects empty key", () => {
    const res = saveApiKey("openai", "   ")
    expect(res.ok).toBe(false)
  })

  it("writes an api-type entry to auth.json", () => {
    const res = saveApiKey("openai", "sk-test-123")
    expect(res.ok).toBe(true)
    const auth = JSON.parse(files.get(AUTH_PATH)!)
    expect(auth.openai).toEqual({ type: "api", key: "sk-test-123" })
  })

  it("merges without clobbering other providers", () => {
    files.set(AUTH_PATH, JSON.stringify({ google: { type: "api", key: "g" } }))
    saveApiKey("openai", "sk-o")
    const auth = JSON.parse(files.get(AUTH_PATH)!)
    expect(auth.google).toBeDefined()
    expect(auth.openai).toBeDefined()
  })

  it("removes only the target provider", () => {
    files.set(
      AUTH_PATH,
      JSON.stringify({
        openai: { type: "api", key: "o" },
        google: { type: "api", key: "g" },
      })
    )
    removeApiKey("openai")
    const auth = JSON.parse(files.get(AUTH_PATH)!)
    expect(auth.openai).toBeUndefined()
    expect(auth.google).toBeDefined()
  })
})

describe("getProviderStatus", () => {
  it("marks a provider connected when an api key exists", () => {
    files.set(AUTH_PATH, JSON.stringify({ openai: { type: "api", key: "k" } }))
    const status = getProviderStatus().find((s) => s.id === "openai")
    expect(status?.connected).toBe(true)
    expect(status?.authType).toBe("api")
  })

  it("marks a provider disconnected when no key exists", () => {
    const status = getProviderStatus().find((s) => s.id === "anthropic")
    expect(status?.connected).toBe(false)
  })
})

describe("listCatalogModels", () => {
  const catalog = {
    anthropic: {
      models: {
        "claude-sonnet-4-5": {
          name: "Claude Sonnet 4.5",
          tool_call: true,
          cost: { input: 3, output: 15 },
          modalities: { output: ["text"] },
        },
        "claude-embedding": {
          name: "Embedding",
          tool_call: false,
          modalities: { output: ["text"] },
        },
        "claude-tts-voice": {
          name: "Voice",
          modalities: { output: ["audio"] },
        },
      },
    },
  }

  beforeEach(() => {
    files.set(CATALOG_PATH, JSON.stringify(catalog))
  })

  it("returns chat models and filters out embedding/tts", () => {
    const models = listCatalogModels("anthropic")
    const ids = models.map((m) => m.model)
    expect(ids).toContain("claude-sonnet-4-5")
    expect(ids).not.toContain("claude-embedding") // matches /embed/
    expect(ids).not.toContain("claude-tts-voice") // tts + non-text output
  })

  it("flags tool-calling and paid models correctly", () => {
    const m = listCatalogModels("anthropic").find((x) => x.model === "claude-sonnet-4-5")
    expect(m?.toolCall).toBe(true)
    expect(m?.free).toBe(false)
    expect(m?.full).toBe("anthropic/claude-sonnet-4-5")
  })

  it("returns empty for an unknown provider", () => {
    expect(listCatalogModels("does-not-exist")).toEqual([])
  })
})
