import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"
import path from "node:path"
import {
  parseOpenAIResponse,
  isOpenAIError,
  isChatCompletion,
  extractReply,
  describeError,
  type OpenAIChatCompletion,
  type OpenAIError,
} from "./openai-response"

// Load the REAL response shapes captured from api.openai.com/v1/chat/completions
function loadFixture<T>(name: string): T {
  const p = path.join(__dirname, "__fixtures__", name)
  return JSON.parse(readFileSync(p, "utf-8")) as T
}

const success = loadFixture<OpenAIChatCompletion>("openai-success.json")
const modelNotFound = loadFixture<OpenAIError>("openai-model-not-found.json")
const invalidKey = loadFixture<OpenAIError>("openai-invalid-key.json")

describe("OpenAI response type guards", () => {
  it("detects a chat.completion payload", () => {
    expect(isChatCompletion(success)).toBe(true)
    expect(isChatCompletion(modelNotFound)).toBe(false)
  })

  it("detects an error payload", () => {
    expect(isOpenAIError(modelNotFound)).toBe(true)
    expect(isOpenAIError(invalidKey)).toBe(true)
    expect(isOpenAIError(success)).toBe(false)
  })
})

describe("extractReply", () => {
  it("returns the assistant text from a real completion", () => {
    expect(extractReply(success)).toBe("PONG")
  })

  it("returns empty string when there is no content", () => {
    const empty = {
      ...success,
      choices: [{ index: 0, message: { role: "assistant", content: null }, finish_reason: "stop" }],
    } as OpenAIChatCompletion
    expect(extractReply(empty)).toBe("")
  })
})

describe("describeError", () => {
  it("maps model_not_found to a friendly message", () => {
    const { message, code } = describeError(modelNotFound)
    expect(code).toBe("model_not_found")
    expect(message).toMatch(/model not found/i)
  })

  it("maps invalid_api_key to an auth message", () => {
    const { message, code } = describeError(invalidKey)
    expect(code).toBe("invalid_api_key")
    expect(message).toMatch(/api key/i)
  })
})

describe("parseOpenAIResponse (against real API shapes)", () => {
  it("parses a successful ping-pong response", () => {
    const result = parseOpenAIResponse(success)
    expect(result.ok).toBe(true)
    expect(result.reply).toBe("PONG")
    expect(result.model).toBe("gpt-5.5-2026-04-23")
    expect(result.totalTokens).toBe(30)
  })

  it("parses a model-not-found error", () => {
    const result = parseOpenAIResponse(modelNotFound)
    expect(result.ok).toBe(false)
    expect(result.errorCode).toBe("model_not_found")
    expect(result.error).toMatch(/model not found/i)
  })

  it("parses an invalid-api-key error", () => {
    const result = parseOpenAIResponse(invalidKey)
    expect(result.ok).toBe(false)
    expect(result.errorCode).toBe("invalid_api_key")
    expect(result.error).toMatch(/api key/i)
  })

  it("handles a completion with no assistant content", () => {
    const empty = {
      ...success,
      choices: [{ index: 0, message: { role: "assistant", content: "" }, finish_reason: "stop" }],
    }
    const result = parseOpenAIResponse(empty)
    expect(result.ok).toBe(false)
    expect(result.error).toMatch(/no response/i)
  })

  it("rejects an unrecognized payload", () => {
    const result = parseOpenAIResponse({ foo: "bar" })
    expect(result.ok).toBe(false)
    expect(result.error).toMatch(/unrecognized/i)
  })
})
