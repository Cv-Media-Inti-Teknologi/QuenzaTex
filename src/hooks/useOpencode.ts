import { useState, useCallback, useEffect, useRef } from "react"
import { parseMentions, buildPromptWithContext } from "../lib/mention-parser"

interface ChatMessage {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
}

interface OpenCodeState {
  status: OpenCodeStatus
  messages: ChatMessage[]
  sending: boolean
}

let messageCounter = 0

function genId() {
  messageCounter++
  return `msg-${Date.now()}-${messageCounter}`
}

export function useOpencode() {
  const [state, setState] = useState<OpenCodeState>({
    status: { running: false, mode: "off", port: 0 },
    messages: [],
    sending: false,
  })
  const initialized = useRef(false)

  useEffect(() => {
    if (initialized.current) return
    initialized.current = true

    const init = async () => {
      try {
        const status = await window.electronAPI.opencodeStatus()
        setState((s) => ({ ...s, status }))
      } catch {
        // ignore
      }
    }
    init()
  }, [])

  const sendMessage = useCallback(async (text: string) => {
    const userMsg: ChatMessage = {
      id: genId(),
      role: "user",
      content: text,
      timestamp: new Date(),
    }

    setState((s) => ({
      ...s,
      messages: [...s.messages, userMsg],
      sending: true,
    }))

    try {
      const mentions = parseMentions(text)
      let response: string

      if (mentions.length > 0) {
        const contexts: { path: string; content: string }[] = []
        const projectPath = await getProjectPath()

        for (const mention of mentions) {
          const filePath = mention.path || `${projectPath}/${mention.name}`
          try {
            const content = await window.electronAPI.readFile(filePath)
            if (content !== null) {
              contexts.push({ path: mention.name, content })
            }
          } catch {
            // file not found, skip
          }
        }

        const fullPrompt = buildPromptWithContext(text, contexts)
        response = await window.electronAPI.opencodeSend(fullPrompt)
      } else {
        response = await window.electronAPI.opencodeSend(text)
      }

      const assistantMsg: ChatMessage = {
        id: genId(),
        role: "assistant",
        content: response || "No response",
        timestamp: new Date(),
      }

      setState((s) => ({
        ...s,
        messages: [...s.messages, assistantMsg],
        sending: false,
      }))
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: genId(),
        role: "assistant",
        content: `Error: ${err.message}`,
        timestamp: new Date(),
      }

      setState((s) => ({
        ...s,
        messages: [...s.messages, errorMsg],
        sending: false,
      }))
    }
  }, [])

  const clearMessages = useCallback(() => {
    setState((s) => ({ ...s, messages: [] }))
  }, [])

  return {
    status: state.status,
    messages: state.messages,
    sending: state.sending,
    sendMessage,
    clearMessages,
  }
}

async function getProjectPath(): Promise<string> {
  // In a real app, we'd get this from context
  return ""
}
