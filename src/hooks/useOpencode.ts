import { useState, useCallback, useRef } from "react"
import { parseMentions, buildPromptWithContext } from "../lib/mention-parser"

export interface ChatMessage {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
}

interface OpenCodeState {
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
    messages: [],
    sending: false,
  })
  const projectContextRef = useRef<{ projectPath: string; fileList?: string; model?: string } | null>(null)
  const messagesRef = useRef<ChatMessage[]>([])

  // Keep ref in sync with state
  messagesRef.current = state.messages

  const setProjectContext = useCallback((ctx: { projectPath: string; fileList?: string; model?: string } | null) => {
    projectContextRef.current = ctx
  }, [])

  const restoreMessages = useCallback((messages: ChatMessage[]) => {
    messagesRef.current = messages
    setState((s) => ({ ...s, messages }))
  }, [])

  const sendMessage = useCallback(async (text: string) => {
    const userMsg: ChatMessage = {
      id: genId(),
      role: "user",
      content: text,
      timestamp: new Date(),
    }

    // Build history from ref BEFORE adding current message
    const history = messagesRef.current.map((m) => ({
      role: m.role,
      content: m.content,
    }))

    setState((s) => ({
      ...s,
      messages: [...s.messages, userMsg],
      sending: true,
    }))

    try {
      const mentions = parseMentions(text)
      let finalText = text
      const contexts: { path: string; content: string }[] = []

      if (mentions.length > 0) {
        const projectPath = projectContextRef.current?.projectPath || ""

        for (const mention of mentions) {
          const filePath = mention.path || `${projectPath}/${mention.name}`
          try {
            const content = await window.electronAPI.readFile(filePath)
            if (content !== null) {
              contexts.push({ path: mention.name, content })
            }
          } catch {}
        }

        finalText = buildPromptWithContext(text, contexts)
      }

      const response = await window.electronAPI.opencodeSendWithContext(
        finalText,
        projectContextRef.current?.projectPath || "",
        projectContextRef.current?.fileList,
        history,
        projectContextRef.current?.model
      )

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
    messagesRef.current = []
    setState((s) => ({ ...s, messages: [] }))
  }, [])

  return {
    messages: state.messages,
    sending: state.sending,
    sendMessage,
    clearMessages,
    setProjectContext,
    restoreMessages,
  }
}
