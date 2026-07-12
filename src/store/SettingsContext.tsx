import { createContext, useContext, useState, useCallback, type ReactNode } from "react"

export interface AiProviderConfig {
  /** "opencode" = free default; else "openai" | "google" | "anthropic" | custom */
  provider: string
  /** full model id e.g. "openai/gpt-4o", or "default" for the free bundled model */
  model: string
}

interface Settings {
  general: {
    showTipOfTheDay: boolean
  }
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
  updateGeneral: (config: Partial<Settings["general"]>) => void
  updateAi: (config: Partial<AiProviderConfig>) => void
  updateEditor: (config: Partial<Settings["editor"]>) => void
  updateLatex: (config: Partial<Settings["latex"]>) => void
  resetSettings: () => void
}

const defaultSettings: Settings = {
  general: {
    showTipOfTheDay: true,
  },
  ai: {
    provider: "opencode",
    model: "default",
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

  const updateGeneral = useCallback((config: Partial<Settings["general"]>) => {
    setSettings((prev) => {
      const next = { ...prev, general: { ...prev.general, ...config } }
      saveSettings(next)
      return next
    })
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
    <SettingsContext.Provider value={{ settings, updateGeneral, updateAi, updateEditor, updateLatex, resetSettings }}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error("useSettings must be used within SettingsProvider")
  return ctx
}
