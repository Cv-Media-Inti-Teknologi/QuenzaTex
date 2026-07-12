import { useSettings } from "../../store/SettingsContext"

export function AiProviderConfig() {
  const { settings, updateAi } = useSettings()

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Provider</label>
        <input
          type="text"
          value={settings.ai.provider}
          onChange={(e) => updateAi({ provider: e.target.value })}
          className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          placeholder="opencode"
        />
        <p className="text-xs text-gray-400 mt-1">Default: opencode</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
        <input
          type="text"
          value={settings.ai.model}
          onChange={(e) => updateAi({ model: e.target.value })}
          className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          placeholder="default"
        />
        <p className="text-xs text-gray-400 mt-1">Model ID (e.g. gpt-4, claude-3, default)</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">API URL</label>
        <input
          type="text"
          value={settings.ai.apiUrl}
          onChange={(e) => updateAi({ apiUrl: e.target.value })}
          className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          placeholder="http://localhost"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Port</label>
        <input
          type="number"
          value={settings.ai.port}
          onChange={(e) => updateAi({ port: parseInt(e.target.value) || 4097 })}
          className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
        />
        <p className="text-xs text-gray-400 mt-1">Default: 4097</p>
      </div>
    </div>
  )
}
