import { useState } from "react"
import { X, RotateCcw, Settings2, Wrench } from "lucide-react"
import { AiProviderConfig } from "./AiProviderConfig"
import { EnvStatus } from "./EnvStatus"
import { useSettings } from "../../store/SettingsContext"

type Tab = "ai" | "editor" | "latex" | "env"

interface Props {
  onClose: () => void
}

export function SettingsDialog({ onClose }: Props) {
  const [tab, setTab] = useState<Tab>("ai")
  const { settings, updateEditor, updateLatex, resetSettings } = useSettings()

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-[640px] max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <Settings2 size={18} className="text-gray-500" />
            <h2 className="text-lg font-semibold text-gray-900">Settings</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100">
            <X size={18} className="text-gray-400" />
          </button>
        </div>

        <div className="flex flex-1 min-h-0">
          <div className="w-44 border-r border-gray-100 p-2 space-y-1 shrink-0">
            {(["ai", "editor", "latex", "env"] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  tab === t
                    ? "bg-gray-100 text-gray-900"
                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                }`}
              >
                {t === "ai" && "AI Provider"}
                {t === "editor" && "Editor"}
                {t === "latex" && "LaTeX"}
                {t === "env" && <div className="flex items-center gap-2"><Wrench size={14} />Environment</div>}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-4">
            {tab === "ai" && <AiProviderConfig />}

            {tab === "editor" && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Font Size</label>
                  <input
                    type="number"
                    value={settings.editor.fontSize}
                    onChange={(e) => updateEditor({ fontSize: parseInt(e.target.value) || 14 })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Word Wrap</label>
                  <select
                    value={settings.editor.wordWrap}
                    onChange={(e) => updateEditor({ wordWrap: e.target.value as "on" | "off" })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm"
                  >
                    <option value="off">Off</option>
                    <option value="on">On</option>
                  </select>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="minimap"
                    checked={settings.editor.minimap}
                    onChange={(e) => updateEditor({ minimap: e.target.checked })}
                    className="rounded border-gray-300"
                  />
                  <label htmlFor="minimap" className="text-sm text-gray-700">Show Minimap</label>
                </div>
              </div>
            )}

            {tab === "latex" && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="autoCompile"
                    checked={settings.latex.autoCompile}
                    onChange={(e) => updateLatex({ autoCompile: e.target.checked })}
                    className="rounded border-gray-300"
                  />
                  <label htmlFor="autoCompile" className="text-sm text-gray-700">Auto-compile on save</label>
                </div>
              </div>
            )}

            {tab === "env" && <EnvStatus />}
          </div>
        </div>

        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
          <button
            onClick={resetSettings}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-gray-500 hover:text-red-500 hover:bg-red-50"
          >
            <RotateCcw size={14} />
            Reset to Default
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-800"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
