import { useRef, useCallback } from "react"

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
      return await window.electronAPI.sessionLoad(projectPath)
    } catch {
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
        } catch {}
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
