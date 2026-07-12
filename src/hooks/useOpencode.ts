import { useState, useCallback, useRef } from "react"
import { parseMentions, buildPromptWithContext } from "../lib/mention-parser"
import { logger } from "../lib/logger"

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

  messagesRef.current = state.messages

  const setProjectContext = useCallback((ctx: { projectPath: string; fileList?: string; model?: string } | null) => {
    projectContextRef.current = ctx
  }, [])

  const restoreMessages = useCallback((messages: ChatMessage[]) => {
    messagesRef.current = messages
    setState((s) => ({ ...s, messages }))
    logger.session(`Restored ${messages.length} messages from session`)
  }, [])

  const sendMessage = useCallback(async (text: string) => {
    const userMsg: ChatMessage = {
      id: genId(),
      role: "user",
      content: text,
      timestamp: new Date(),
    }

    const history = messagesRef.current.map((m) => ({
      role: m.role,
      content: m.content,
    }))

    setState((s) => ({
      ...s,
      messages: [...s.messages, userMsg],
      sending: true,
    }))

    logger.ai(`Sending message (${history.length} history items)...`)

    try {
      const mentions = parseMentions(text)
      let finalText = text
      const contexts: { path: string; content: string }[] = []

      if (mentions.length > 0) {
        logger.ai(`Found ${mentions.length} @mention(s): ${mentions.map(m => m.name).join(", ")}`)
        const projectPath = projectContextRef.current?.projectPath || ""

        for (const mention of mentions) {
          const filePath = mention.path || `${projectPath}/${mention.name}`
          try {
            const content = await window.electronAPI.readFile(filePath)
            if (content !== null) {
              contexts.push({ path: mention.name, content })
              logger.file(`@mention resolved: ${mention.name} (${content.length}B)`)
            } else {
              logger.warn(`@mention file not found: ${mention.name}`)
            }
          } catch (err) {
            logger.warn(`@mention read error: ${mention.name}`, err)
          }
        }

        finalText = buildPromptWithContext(text, contexts)
      }

      const result = await window.electronAPI.opencodeSendWithContext(
        finalText,
        projectContextRef.current?.projectPath || "",
        projectContextRef.current?.fileList,
        history,
        projectContextRef.current?.model
      )
      const response = result?.response ?? "No response"

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

      logger.ai(`Got response (${(response || "").length}B): ${response?.slice(0, 200)}`)
    } catch (err: any) {
      logger.error(`AI send error: ${err.message}`)
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
    logger.clear("Chat cleared")
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
