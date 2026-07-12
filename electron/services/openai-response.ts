/**
 * Helpers for interpreting responses from the OpenAI Chat Completions API
 * (https://api.openai.com/v1/chat/completions).
 *
 * These are pure functions so they can be unit-tested against real response
 * shapes captured from the live API (see __fixtures__/openai-*.json).
 */

export interface OpenAIMessage {
  role: string
  content: string | null
  refusal?: string | null
  annotations?: unknown[]
}

export interface OpenAIChoice {
  index: number
  message: OpenAIMessage
  finish_reason: string | null
}

export interface OpenAIUsage {
  prompt_tokens: number
  completion_tokens: number
  total_tokens: number
}

export interface OpenAIChatCompletion {
  id: string
  object: string
  created: number
  model: string
  choices: OpenAIChoice[]
  usage?: OpenAIUsage
  service_tier?: string
  system_fingerprint?: string | null
}

export interface OpenAIError {
  error: {
    message: string
    type: string
    code: string | null
    param: string | null
  }
  status?: number
}

export interface ParsedResult {
  ok: boolean
  /** assistant text reply (on success) */
  reply?: string
  /** the model that actually served the request */
  model?: string
  /** token usage total (on success) */
  totalTokens?: number
  /** a friendly, categorised error (on failure) */
  error?: string
  errorCode?: string
}

/** True when the payload is an OpenAI error envelope. */
export function isOpenAIError(payload: unknown): payload is OpenAIError {
  return (
    typeof payload === "object" &&
    payload !== null &&
    "error" in payload &&
    typeof (payload as any).error === "object"
  )
}

/** True when the payload looks like a successful chat.completion. */
export function isChatCompletion(payload: unknown): payload is OpenAIChatCompletion {
  return (
    typeof payload === "object" &&
    payload !== null &&
    (payload as any).object === "chat.completion" &&
    Array.isArray((payload as any).choices)
  )
}

/** Extract the assistant's text reply from a completion (empty string if none). */
export function extractReply(completion: OpenAIChatCompletion): string {
  return completion.choices?.[0]?.message?.content?.trim() ?? ""
}

/** Map an OpenAI error into a short, user-friendly message. */
export function describeError(err: OpenAIError): { message: string; code: string } {
  const code = err.error.code || err.error.type || "unknown_error"
  switch (code) {
    case "invalid_api_key":
      return { message: "Authentication failed — check your API key.", code }
    case "model_not_found":
      return { message: "Model not found — check the model ID or your access.", code }
    case "insufficient_quota":
      return { message: "Quota exceeded — check your OpenAI billing.", code }
    case "rate_limit_exceeded":
      return { message: "Rate limited — please try again in a moment.", code }
    default:
      return { message: err.error.message || "The request failed.", code }
  }
}

/**
 * Parse any OpenAI response payload (success or error) into a normalized result
 * the app can use for the "Check connection" ping-pong flow.
 */
export function parseOpenAIResponse(payload: unknown): ParsedResult {
  if (isOpenAIError(payload)) {
    const { message, code } = describeError(payload)
    return { ok: false, error: message, errorCode: code }
  }

  if (isChatCompletion(payload)) {
    const reply = extractReply(payload)
    if (!reply) {
      return { ok: false, error: "No response from the model." }
    }
    return {
      ok: true,
      reply,
      model: payload.model,
      totalTokens: payload.usage?.total_tokens,
    }
  }

  return { ok: false, error: "Unrecognized response from OpenAI." }
}
