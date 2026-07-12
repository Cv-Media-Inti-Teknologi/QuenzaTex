import { useState, useEffect } from "react"
import { CheckCircle2, XCircle, RefreshCw } from "lucide-react"

interface EnvInfo {
  node: { found: boolean; version: string }
  opencode: { found: boolean; version: string }
  texlive: { found: boolean; version: string; latexmk: boolean }
}

export function EnvStatus() {
  const [env, setEnv] = useState<EnvInfo | null>(null)
  const [loading, setLoading] = useState(true)

  const check = async () => {
    setLoading(true)
    try {
      const result = await window.electronAPI.checkEnvironment()
      setEnv(result)
    } catch {}
    setLoading(false)
  }

  useEffect(() => {
    check()
  }, [])

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-gray-700">Environment</h4>
        <button onClick={check} disabled={loading} className="p-1 rounded hover:bg-gray-100">
          <RefreshCw size={14} className={`text-gray-400 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {!env && loading && (
        <p className="text-sm text-gray-400">Checking environment...</p>
      )}

      {env && (
        <div className="space-y-2">
          <EnvRow label="Node.js" found={env.node.found} version={env.node.version} />
          <EnvRow label="Opencode" found={env.opencode.found} version={env.opencode.version} />
          <EnvRow label="TeX Live" found={env.texlive.found} version={env.texlive.version} />
          <EnvRow label="latexmk" found={env.texlive.latexmk} version="" />
        </div>
      )}
    </div>
  )
}

function EnvRow({ label, found, version }: { label: string; found: boolean; version: string }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <div className="flex items-center gap-2">
        {found ? (
          <CheckCircle2 size={14} className="text-green-500" />
        ) : (
          <XCircle size={14} className="text-red-400" />
        )}
        <span className="text-sm text-gray-600">{label}</span>
      </div>
      {version && <span className="text-xs text-gray-400">{version}</span>}
    </div>
  )
}
