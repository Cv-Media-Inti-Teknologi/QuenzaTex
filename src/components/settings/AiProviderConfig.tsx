import { useEffect, useState, useCallback } from "react"
import { toast } from "sonner"
import {
  Sparkles,
  Check,
  KeyRound,
  ExternalLink,
  Eye,
  EyeOff,
  Loader2,
  Trash2,
  Settings2,
  Activity,
  CircleCheck,
  CircleX,
} from "lucide-react"
import { useSettings } from "../../store/SettingsContext"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

const FREE_MODEL = "opencode/deepseek-v4-flash-free"
const FREE = "__free__"

export function AiProviderConfig() {
  const { settings, updateAi } = useSettings()
  const [curated, setCurated] = useState<CuratedProvider[]>([])
  const [status, setStatus] = useState<ProviderStatus[]>([])

  // The dropdown selection, independent of the globally-active provider.
  const [picked, setPicked] = useState<string>(
    settings.ai.provider === "opencode" ? FREE : settings.ai.provider
  )

  const [apiKey, setApiKey] = useState("")
  const [showKey, setShowKey] = useState(false)
  const [saving, setSaving] = useState(false)
  const [models, setModels] = useState<ModelEntry[]>([])
  const [loadingModels, setLoadingModels] = useState(false)

  const usingFree = settings.ai.provider === "opencode"
  const selectedCurated = curated.find((c) => c.id === picked)
  const isCustom = !!selectedCurated?.custom

  const refreshStatus = useCallback(async () => {
    try {
      const res = await window.electronAPI.aiListProviders()
      setCurated(res.curated)
      setStatus(res.status)
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    refreshStatus()
  }, [refreshStatus])

  // Load models for the picked provider (skip free/custom)
  useEffect(() => {
    if (picked === FREE || isCustom) {
      setModels([])
      return
    }
    let cancelled = false
    setLoadingModels(true)
    window.electronAPI
      .aiListModels(picked)
      .then((list) => {
        if (!cancelled) setModels(list)
      })
      .finally(() => {
        if (!cancelled) setLoadingModels(false)
      })
    return () => {
      cancelled = true
    }
  }, [picked, isCustom])

  const statusFor = (id: string) => status.find((s) => s.id === id)

  const handleUseFree = () => {
    updateAi({ provider: "opencode", model: "default" })
    setPicked(FREE)
    setApiKey("")
    toast.success("Using free default model", { description: "No API key needed." })
  }

  const handlePick = (v: string) => {
    setApiKey("")
    if (v === FREE) {
      handleUseFree()
    } else {
      setPicked(v)
    }
  }

  const handleSaveKey = async () => {
    if (picked === FREE || !apiKey.trim()) return
    setSaving(true)
    try {
      const res = await window.electronAPI.aiSaveKey(picked, apiKey.trim())
      if (res.ok) {
        toast.success("API key saved", {
          description: `${selectedCurated?.name} is now connected.`,
        })
        setApiKey("")
        await refreshStatus()
        const list = await window.electronAPI.aiListModels(picked)
        setModels(list)
      } else {
        toast.error("Failed to save key", { description: res.error })
      }
    } finally {
      setSaving(false)
    }
  }

  const handleRemoveKey = async (providerId: string) => {
    const res = await window.electronAPI.aiRemoveKey(providerId)
    if (res.ok) {
      toast.success("API key removed")
      if (settings.ai.provider === providerId) handleUseFree()
      await refreshStatus()
    } else {
      toast.error("Failed to remove key", { description: res.error })
    }
  }

  const handleSelectModel = (modelFull: string) => {
    if (picked === FREE) return
    updateAi({ provider: picked, model: modelFull })
    toast.success("Model selected", { description: modelFull })
  }

  const handleSaveCustom = async (cfg: {
    id: string
    name: string
    baseURL: string
    apiKey: string
    modelId: string
  }) => {
    setSaving(true)
    try {
      const res = await window.electronAPI.aiSaveCustomProvider(cfg)
      if (res.ok && res.model) {
        updateAi({ provider: cfg.id, model: res.model })
        toast.success("Custom provider saved", { description: res.model })
        await refreshStatus()
      } else {
        toast.error("Failed to save provider", { description: res.error })
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-5">
      {/* Free default card */}
      <button
        onClick={handleUseFree}
        className={cn(
          "w-full text-left rounded-xl border p-4 transition-colors",
          usingFree ? "border-primary bg-accent" : "border-border hover:bg-muted/50"
        )}
      >
        <div className="flex items-start gap-3">
          <div className="mt-0.5 w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Sparkles size={18} className="text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-foreground">
                Free default model
              </span>
              {usingFree && (
                <Badge variant="success" className="gap-1">
                  <Check size={11} /> Active
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Bundled AI model — no API key required. Great for getting started.
            </p>
          </div>
        </div>
      </button>

      {/* Bring-your-own-key */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <KeyRound size={14} className="text-muted-foreground" />
          <span className="text-sm font-semibold text-foreground">
            Use your own provider
          </span>
        </div>
        <p className="text-xs text-muted-foreground -mt-1">
          Have an OpenAI, Gemini, or Anthropic subscription — or a custom
          endpoint? Select a provider and add your API key.
        </p>

        {/* Provider selector */}
        <div className="space-y-2">
          <Label>Provider</Label>
          <Select value={picked} onValueChange={handlePick}>
            <SelectTrigger>
              <SelectValue placeholder="Choose a provider…" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={FREE}>
                <span className="flex items-center gap-2">
                  <Sparkles size={13} className="text-primary" />
                  Free
                </span>
              </SelectItem>
              {curated.map((prov) => {
                const st = statusFor(prov.id)
                return (
                  <SelectItem key={prov.id} value={prov.id}>
                    <span className="flex items-center gap-2">
                      {prov.custom && <Settings2 size={13} className="text-muted-foreground" />}
                      {prov.name}
                      {st?.connected && st.authType === "api" && (
                        <span className="text-emerald-600 text-xs">• connected</span>
                      )}
                      {st?.connected && st.authType === "oauth" && (
                        <span className="text-muted-foreground text-xs">• connected</span>
                      )}
                    </span>
                  </SelectItem>
                )
              })}
            </SelectContent>
          </Select>
        </div>

        {picked !== FREE && selectedCurated && (
          isCustom ? (
            <CustomProviderForm saving={saving} onSave={handleSaveCustom} />
          ) : (
            <ProviderDetail
              provider={selectedCurated}
              status={statusFor(picked)}
              apiKey={apiKey}
              setApiKey={setApiKey}
              showKey={showKey}
              setShowKey={setShowKey}
              saving={saving}
              onSave={handleSaveKey}
              onRemove={() => handleRemoveKey(picked)}
              models={models}
              loadingModels={loadingModels}
              activeModel={settings.ai.model}
              onSelectModel={handleSelectModel}
            />
          )
        )}
      </div>
    </div>
  )
}

function ProviderDetail({
  provider,
  status,
  apiKey,
  setApiKey,
  showKey,
  setShowKey,
  saving,
  onSave,
  onRemove,
  models,
  loadingModels,
  activeModel,
  onSelectModel,
}: {
  provider: CuratedProvider
  status: ProviderStatus | undefined
  apiKey: string
  setApiKey: (v: string) => void
  showKey: boolean
  setShowKey: (v: boolean) => void
  saving: boolean
  onSave: () => void
  onRemove: () => void
  models: ModelEntry[]
  loadingModels: boolean
  activeModel: string
  onSelectModel: (full: string) => void
}) {
  const connected = !!status?.connected
  const viaOpencode = connected && status?.authType === "oauth"
  const hasOwnKey = connected && status?.authType === "api"

  return (
    <div className="rounded-xl border p-4 space-y-4 bg-muted/30">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-foreground">{provider.name}</span>
        {hasOwnKey ? (
          <Badge variant="success" className="gap-1">
            <Check size={11} /> Connected
          </Badge>
        ) : viaOpencode ? (
          <Badge variant="muted">Connected</Badge>
        ) : (
          <Badge variant="muted">No key</Badge>
        )}
      </div>

      {viaOpencode && (
        <p className="text-[11px] text-muted-foreground -mt-1">
          Already signed in. You can use it as-is, or paste your
          own API key below to override.
        </p>
      )}

      <div className="space-y-2">
        <Label>API key</Label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Input
              type={showKey ? "text" : "password"}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={hasOwnKey ? "•••••••• (saved)" : "Paste your API key"}
              className="pr-9"
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showKey ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
          <Button onClick={onSave} disabled={saving || !apiKey.trim()}>
            {saving ? <Loader2 size={15} className="animate-spin" /> : "Save"}
          </Button>
        </div>
        <div className="flex items-center justify-between">
          <p className="text-[11px] text-muted-foreground">{provider.hint}</p>
          <a
            href={provider.keyUrl}
            target="_blank"
            rel="noreferrer"
            className="text-[11px] text-primary hover:underline flex items-center gap-1 shrink-0"
          >
            Get API key <ExternalLink size={10} />
          </a>
        </div>
        {hasOwnKey && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onRemove}
            className="h-7 text-xs text-destructive hover:text-destructive gap-1.5"
          >
            <Trash2 size={12} /> Remove key
          </Button>
        )}
      </div>

      <div className="space-y-2">
        <Label>Model</Label>
        {loadingModels ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
            <Loader2 size={13} className="animate-spin" /> Loading models…
          </div>
        ) : models.length > 0 ? (
          <>
            <Select value={activeModel} onValueChange={onSelectModel}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a model…" />
              </SelectTrigger>
              <SelectContent>
                {models.map((m) => (
                  <SelectItem key={m.full} value={m.full}>
                    <span className="flex items-center gap-2">
                      <span>{m.name || m.model}</span>
                      {m.toolCall && (
                        <span className="text-[10px] px-1 py-px rounded bg-emerald-100 text-emerald-700">
                          tools
                        </span>
                      )}
                      {m.free ? (
                        <span className="text-[10px] px-1 py-px rounded bg-sky-100 text-sky-700">
                          free
                        </span>
                      ) : (
                        <span className="text-[10px] text-muted-foreground">$</span>
                      )}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!connected && (
              <p className="text-[11px] text-muted-foreground">
                Pick a model, then add your API key above to start using it.
                Models tagged <span className="text-emerald-700 font-medium">tools</span> work
                best for building/editing files.
              </p>
            )}
          </>
        ) : (
          <p className="text-xs text-muted-foreground">
            No models found. Examples:{" "}
            <span className="font-mono">{provider.exampleModels.join(", ")}</span>
          </p>
        )}
      </div>

      {/* Ping-pong connectivity check (only when a model is active for this provider) */}
      {connected && activeModel && activeModel.startsWith(`${provider.id}/`) && (
        <CheckConnectionButton model={activeModel} />
      )}
    </div>
  )
}

function CustomProviderForm({
  saving,
  onSave,
}: {
  saving: boolean
  onSave: (cfg: {
    id: string
    name: string
    baseURL: string
    apiKey: string
    modelId: string
  }) => void
}) {
  const [id, setId] = useState("")
  const [name, setName] = useState("")
  const [baseURL, setBaseURL] = useState("")
  const [apiKey, setApiKey] = useState("")
  const [modelId, setModelId] = useState("")
  const [showKey, setShowKey] = useState(false)

  const valid = id.trim() && baseURL.trim() && modelId.trim()

  return (
    <div className="rounded-xl border p-4 space-y-4 bg-muted/30">
      <div className="flex items-center gap-2">
        <Settings2 size={14} className="text-muted-foreground" />
        <span className="text-sm font-medium text-foreground">
          Custom OpenAI-compatible provider
        </span>
      </div>
      <p className="text-[11px] text-muted-foreground -mt-1">
        Works with LM Studio, Ollama, Groq, or any endpoint exposing
        <span className="font-mono"> /v1/chat/completions</span>.
      </p>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Provider ID</Label>
          <Input
            value={id}
            onChange={(e) => setId(e.target.value)}
            placeholder="e.g. groq"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Display name</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Groq"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Base URL</Label>
        <Input
          value={baseURL}
          onChange={(e) => setBaseURL(e.target.value)}
          placeholder="https://api.groq.com/openai/v1"
        />
      </div>

      <div className="space-y-1.5">
        <Label>Model ID</Label>
        <Input
          value={modelId}
          onChange={(e) => setModelId(e.target.value)}
          placeholder="e.g. llama-3.3-70b-versatile"
        />
      </div>

      <div className="space-y-1.5">
        <Label>API key (optional)</Label>
        <div className="relative">
          <Input
            type={showKey ? "text" : "password"}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Leave empty for local endpoints"
            className="pr-9"
          />
          <button
            type="button"
            onClick={() => setShowKey(!showKey)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            {showKey ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        </div>
      </div>

      <Button
        className="w-full"
        disabled={!valid || saving}
        onClick={() =>
          onSave({ id: id.trim(), name: name.trim(), baseURL: baseURL.trim(), apiKey: apiKey.trim(), modelId: modelId.trim() })
        }
      >
        {saving ? <Loader2 size={15} className="animate-spin" /> : "Save & use this provider"}
      </Button>

      {valid && (
        <CheckConnectionButton model={`${id.trim()}/${modelId.trim()}`} />
      )}
    </div>
  )
}

function CheckConnectionButton({ model }: { model: string }) {
  const [state, setState] = useState<"idle" | "checking" | "ok" | "fail">("idle")
  const [message, setMessage] = useState<string>("")

  const run = async () => {
    setState("checking")
    setMessage("")
    try {
      const res = await window.electronAPI.aiCheckConnection(model)
      if (res.ok) {
        setState("ok")
        setMessage(`Model replied${res.ms ? ` in ${(res.ms / 1000).toFixed(1)}s` : ""}`)
        toast.success("Connection OK", { description: res.reply })
      } else {
        setState("fail")
        setMessage(res.error || "Connection failed")
        toast.error("Connection failed", { description: res.error })
      }
    } catch (err: any) {
      setState("fail")
      setMessage(err?.message || "Connection failed")
    }
  }

  return (
    <div className="space-y-1.5">
      <Button
        variant="outline"
        className="w-full gap-2"
        onClick={run}
        disabled={state === "checking"}
      >
        {state === "checking" ? (
          <>
            <Loader2 size={15} className="animate-spin" /> Pinging model…
          </>
        ) : (
          <>
            <Activity size={15} /> Check connection
          </>
        )}
      </Button>
      {state === "ok" && (
        <p className="text-xs text-emerald-600 flex items-center gap-1.5">
          <CircleCheck size={13} /> {message}
        </p>
      )}
      {state === "fail" && (
        <p className="text-xs text-destructive flex items-center gap-1.5">
          <CircleX size={13} /> {message}
        </p>
      )}
      <p className="text-[11px] text-muted-foreground">
        Sends a tiny test message to verify your key, model, and endpoint.
      </p>
    </div>
  )
}
