import { useState, useCallback, useEffect, useRef } from "react"
import { parseMentions, buildPromptWithContext } from "../lib/mention-parser"

export interface ChatMessage {
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
  const projectContextRef = useRef<{ projectPath: string; fileList?: string } | null>(null)

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

  // Listen for server restart/status changes
  useEffect(() => {
    if (typeof window.electronAPI.onOpencodeStatusChanged !== "function") return
    const unsub = window.electronAPI.onOpencodeStatusChanged((status) => {
      setState((s) => ({ ...s, status }))
    })
    return () => { if (typeof unsub === "function") unsub() }
  }, [])

  const setProjectContext = useCallback((ctx: { projectPath: string; fileList?: string } | null) => {
    projectContextRef.current = ctx
  }, [])

  const restoreMessages = useCallback((messages: ChatMessage[]) => {
    setState((s) => ({ ...s, messages }))
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
          } catch {
            // file not found, skip
          }
        }

        finalText = buildPromptWithContext(text, contexts)
      }

      const response = await window.electronAPI.opencodeSendWithContext(
        finalText,
        projectContextRef.current?.projectPath || "",
        projectContextRef.current?.fileList
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
    setState((s) => ({ ...s, messages: [] }))
  }, [])

  return {
    status: state.status,
    messages: state.messages,
    sending: state.sending,
    sendMessage,
    clearMessages,
    setProjectContext,
    restoreMessages,
  }
}
