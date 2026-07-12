import { createContext, useContext, useState, useCallback, type ReactNode } from "react"

export interface AiProviderConfig {
  provider: string
  model: string
  apiUrl: string
  port: number
}

interface Settings {
  ai: AiProviderConfig
  editor: {
    fontSize: number
    wordWrap: "on" | "off"
    minimap: boolean
  }
  latex: {
    autoCompile: boolean
    compiler: string
  }
}

interface SettingsContextValue {
  settings: Settings
  updateAi: (config: Partial<AiProviderConfig>) => void
  updateEditor: (config: Partial<Settings["editor"]>) => void
  updateLatex: (config: Partial<Settings["latex"]>) => void
  resetSettings: () => void
}

const defaultSettings: Settings = {
  ai: {
    provider: "opencode",
    model: "default",
    apiUrl: "http://localhost",
    port: 4097,
  },
  editor: {
    fontSize: 14,
    wordWrap: "off",
    minimap: true,
  },
  latex: {
    autoCompile: true,
    compiler: "latexmk",
  },
}

function loadSettings(): Settings {
  try {
    const stored = localStorage.getItem("quenzatex-settings")
    if (stored) {
      return { ...defaultSettings, ...JSON.parse(stored) }
    }
  } catch {}
  return defaultSettings
}

function saveSettings(s: Settings) {
  try {
    localStorage.setItem("quenzatex-settings", JSON.stringify(s))
  } catch {}
}

const SettingsContext = createContext<SettingsContextValue | null>(null)

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(loadSettings)

  const persist = useCallback((next: Settings) => {
    setSettings(next)
    saveSettings(next)
  }, [])

  const updateAi = useCallback((config: Partial<AiProviderConfig>) => {
    setSettings((prev) => {
      const next = { ...prev, ai: { ...prev.ai, ...config } }
      saveSettings(next)
      return next
    })
  }, [])

  const updateEditor = useCallback((config: Partial<Settings["editor"]>) => {
    setSettings((prev) => {
      const next = { ...prev, editor: { ...prev.editor, ...config } }
      saveSettings(next)
      return next
    })
  }, [])

  const updateLatex = useCallback((config: Partial<Settings["latex"]>) => {
    setSettings((prev) => {
      const next = { ...prev, latex: { ...prev.latex, ...config } }
      saveSettings(next)
      return next
    })
  }, [])

  const resetSettings = useCallback(() => {
    persist(defaultSettings)
  }, [persist])

  return (
    <SettingsContext.Provider value={{ settings, updateAi, updateEditor, updateLatex, resetSettings }}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error("useSettings must be used within SettingsProvider")
  return ctx
}
