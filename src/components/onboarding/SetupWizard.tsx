import { useState, useEffect, useCallback } from "react"
import { CheckCircle2, XCircle, Loader2, Wrench } from "lucide-react"

interface EnvStatus {
  node: { found: boolean; version: string }
  opencode: { found: boolean; version: string }
  texlive: { found: boolean; version: string; latexmk: boolean }
}

type Step = "checking" | "ready" | "installing" | "error"

export function SetupWizard({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState<Step>("checking")
  const [status, setStatus] = useState<EnvStatus | null>(null)
  const [installing, setInstalling] = useState(false)

  const check = useCallback(async () => {
    setStep("checking")
    try {
      const env = await window.electronAPI.checkEnvironment()
      setStatus(env)
      if (env.node.found && env.opencode.found && env.texlive.found && env.texlive.latexmk) {
        setStep("ready")
      } else {
        setStep("ready")
      }
    } catch {
      setStep("error")
    }
  }, [])

  useEffect(() => {
    check()
  }, [check])

  const handleInstall = async () => {
    setInstalling(true)
    if (status && !status.opencode.found) {
      await window.electronAPI.installOpencode()
    }
    setInstalling(false)
    await check()
  }

  const allGood = status && status.node.found && status.opencode.found && status.texlive.found && status.texlive.latexmk

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-[520px] max-h-[80vh] flex flex-col">
        <div className="flex items-center gap-3 px-6 pt-5 pb-3 border-b border-gray-100">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
            <Wrench size={20} className="text-blue-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Environment Setup</h2>
            <p className="text-sm text-gray-500">Checking required dependencies</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
          {step === "checking" && !status && (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={24} className="animate-spin text-blue-500" />
            </div>
          )}

          {status && (
            <>
              <EnvItem
                label="Node.js"
                found={status.node.found}
                version={status.node.version}
              />
              <EnvItem
                label="Opencode CLI"
                found={status.opencode.found}
                version={status.opencode.version}
              />
              <EnvItem
                label="TeX Live"
                found={status.texlive.found}
                version={status.texlive.version}
              />
              <EnvItem
                label="latexmk"
                found={status.texlive.latexmk}
                version={status.texlive.latexmk ? "available" : ""}
              />
            </>
          )}

          {status && !allGood && (
            <div className="mt-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-800">
              Some dependencies are missing. Install them manually, then click "Check Again".
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
          {!allGood && (
            <button
              onClick={handleInstall}
              disabled={installing}
              className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {installing ? "Installing opencode..." : "Install opencode"}
            </button>
          )}
          <button
            onClick={check}
            className="px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50"
          >
            Check Again
          </button>
          <button
            onClick={onComplete}
            className="px-4 py-2 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-800"
          >
            {allGood ? "Get Started" : "Skip"}
          </button>
        </div>
      </div>
    </div>
  )
}

function EnvItem({ label, found, version }: { label: string; found: boolean; version: string }) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg border border-gray-100">
      <div className="flex items-center gap-3">
        {found ? (
          <CheckCircle2 size={18} className="text-green-500" />
        ) : (
          <XCircle size={18} className="text-red-400" />
        )}
        <span className="text-sm font-medium text-gray-700">{label}</span>
      </div>
      <span className={`text-xs ${found ? "text-gray-400" : "text-red-400"}`}>
        {version}
      </span>
    </div>
  )
}
