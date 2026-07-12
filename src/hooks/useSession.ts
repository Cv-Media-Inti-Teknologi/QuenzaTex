import { useRef, useCallback } from "react"
import { logger } from "../lib/logger"

export interface SessionMessage {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: string
}

const saveTimers = new Map<string, ReturnType<typeof setTimeout>>()

export function useSession() {
  const currentProjectRef = useRef<string | null>(null)

  const load = useCallback(async (projectPath: string): Promise<SessionMessage[]> => {
    currentProjectRef.current = projectPath
    try {
      const msgs = await window.electronAPI.sessionLoad(projectPath)
      logger.session(`Load session: ${msgs.length} messages`)
      return msgs
    } catch (err) {
      logger.warn("Session load failed", err)
      return []
    }
  }, [])

  const save = useCallback(
    (projectPath: string, messages: SessionMessage[]) => {
      const existing = saveTimers.get(projectPath)
      if (existing) clearTimeout(existing)

      const timer = setTimeout(async () => {
        try {
          await window.electronAPI.sessionSave(projectPath, messages)
          logger.session(`Saved session: ${messages.length} messages`)
        } catch (err) {
          logger.warn("Session save failed", err)
        }
        saveTimers.delete(projectPath)
      }, 1000)

      saveTimers.set(projectPath, timer)
    },
    []
  )

  const getCurrentProject = useCallback(() => {
    return currentProjectRef.current
  }, [])

  return { load, save, getCurrentProject }
}
