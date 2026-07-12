import { describe, it, expect, vi, beforeEach } from "vitest"

/**
 * Regression tests for the OpenAI (and any authenticated provider) model list.
 *
 * Bug this covers: the models.dev catalog lists models that opencode does not
 * actually support at runtime (e.g. it shows `openai/gpt-5` but opencode only
 * accepts `openai/gpt-5.5`). Selecting a catalog-only model produced a
 * `Model not found` error on "Check connection".
 *
 * Fix: `listModelsForProvider` must prefer the LIVE list from
 * `opencode models <provider>` (the source of truth) once the provider is
 * authenticated, using the catalog only to enrich metadata.
 */

// Simulated output of `opencode models` — the models opencode REALLY supports.
const LIVE_MODELS_OUTPUT = [
  "openai/gpt-5.4",
  "openai/gpt-5.5",
  "openai/gpt-5.6",
].join("\n")

vi.mock("node:child_process", () => ({
  spawnSync: (_bin: string, args: string[]) => {
    if (args[0] === "models") {
      return { stdout: LIVE_MODELS_OUTPUT, stderr: "", status: 0 }
    }
    return { stdout: "", stderr: "", status: 0 }
  },
}))

vi.mock("./opencode", () => ({
  resolveOpenCodeBinary: () => "opencode",
}))

// In-memory fake filesystem holding the models.dev catalog.
const files = new Map<string, string>()

vi.mock("node:fs", () => ({
  existsSync: (p: string) => files.has(p),
  readFileSync: (p: string) => {
    if (!files.has(p)) throw new Error("ENOENT")
    return files.get(p)!
  },
  writeFileSync: (p: string, data: string) => files.set(p, data),
  mkdirSync: () => undefined,
}))

import os from "node:os"
import path from "node:path"
import { listModelsForProvider } from "./ai-config"

const CATALOG_PATH = path.join(os.homedir(), ".cache", "opencode", "models.json")

// Catalog includes gpt-5 (NOT supported by opencode) plus gpt-5.5 (supported).
const CATALOG = {
  openai: {
    models: {
      "gpt-5": {
        name: "GPT-5",
        tool_call: true,
        cost: { input: 5, output: 15 },
        modalities: { output: ["text"] },
      },
      "gpt-5.5": {
        name: "GPT-5.5",
        tool_call: true,
        cost: { input: 5, output: 15 },
        modalities: { output: ["text"] },
      },
    },
  },
}

beforeEach(() => {
  files.clear()
  files.set(CATALOG_PATH, JSON.stringify(CATALOG))
})

describe("listModelsForProvider (openai)", () => {
  it("returns only opencode-supported models, not catalog-only ones", () => {
    const models = listModelsForProvider("openai")
    const ids = models.map((m) => m.model)
    // gpt-5.5 is supported by opencode → present
    expect(ids).toContain("gpt-5.5")
    // gpt-5 exists in the catalog but NOT in opencode's live list → excluded
    expect(ids).not.toContain("gpt-5")
  })

  it("enriches live models with catalog metadata when available", () => {
    const m = listModelsForProvider("openai").find((x) => x.model === "gpt-5.5")
    expect(m?.name).toBe("GPT-5.5")
    expect(m?.toolCall).toBe(true)
    expect(m?.full).toBe("openai/gpt-5.5")
  })

  it("still returns live models that have no catalog entry", () => {
    // gpt-5.4 and gpt-5.6 are live but not in the trimmed catalog above
    const ids = listModelsForProvider("openai").map((m) => m.model)
    expect(ids).toContain("gpt-5.4")
    expect(ids).toContain("gpt-5.6")
  })
})
