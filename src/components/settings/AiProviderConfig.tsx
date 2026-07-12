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

export function AiProviderConfig() {
  const { settings, updateAi } = useSettings()
  const [curated, setCurated] = useState<CuratedProvider[]>([])
  const [status, setStatus] = useState<ProviderStatus[]>([])
  const [selectedProvider, setSelectedProvider] = useState<string>(
    settings.ai.provider === "opencode" ? "" : settings.ai.provider
  )
  const [apiKey, setApiKey] = useState("")
  const [showKey, setShowKey] = useState(false)
  const [saving, setSaving] = useState(false)
  const [models, setModels] = useState<ModelEntry[]>([])
  const [loadingModels, setLoadingModels] = useState(false)

  const usingFree = settings.ai.provider === "opencode"

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

  // Load models for the selected provider
  useEffect(() => {
    if (!selectedProvider) {
      setModels([])
      return
    }
    let cancelled = false
    setLoadingModels(true)
    window.electronAPI
      .aiListModels(selectedProvider)
      .then((list) => {
        if (!cancelled) setModels(list)
      })
      .finally(() => {
        if (!cancelled) setLoadingModels(false)
      })
    return () => {
      cancelled = true
    }
  }, [selectedProvider])

  const statusFor = (id: string) => status.find((s) => s.id === id)

  const handleUseFree = () => {
    updateAi({ provider: "opencode", model: "default" })
    setSelectedProvider("")
    toast.success("Using free default model", {
      description: "No API key needed.",
    })
  }

  const handleSaveKey = async () => {
    if (!selectedProvider || !apiKey.trim()) return
    setSaving(true)
    try {
      const res = await window.electronAPI.aiSaveKey(selectedProvider, apiKey.trim())
      if (res.ok) {
        toast.success("API key saved", {
          description: `${curated.find((c) => c.id === selectedProvider)?.name} is now connected.`,
        })
        setApiKey("")
        await refreshStatus()
        // Reload models now that provider is authenticated
        const list = await window.electronAPI.aiListModels(selectedProvider)
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
      if (settings.ai.provider === providerId) {
        handleUseFree()
      }
      await refreshStatus()
    } else {
      toast.error("Failed to remove key", { description: res.error })
    }
  }

  const handleSelectModel = (modelFull: string) => {
    if (!selectedProvider) return
    updateAi({ provider: selectedProvider, model: modelFull })
    toast.success("Model selected", { description: modelFull })
  }

  return (
    <div className="space-y-5">
      {/* Free default card */}
      <button
        onClick={handleUseFree}
        className={cn(
          "w-full text-left rounded-xl border p-4 transition-colors",
          usingFree
            ? "border-primary bg-accent"
            : "border-border hover:bg-muted/50"
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
              Bundled opencode model — no API key required. Great for getting
              started.
            </p>
            <p className="text-[11px] text-muted-foreground/70 mt-1 font-mono">
              {FREE_MODEL}
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
          Have an OpenAI, Gemini, or Anthropic subscription? Add your API key to
          use your own models.
        </p>

        {/* Provider selector */}
        <div className="space-y-2">
          <Label>Provider</Label>
          <Select
            value={selectedProvider}
            onValueChange={(v) => setSelectedProvider(v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Choose a provider…" />
            </SelectTrigger>
            <SelectContent>
              {curated.map((prov) => {
                const st = statusFor(prov.id)
                return (
                  <SelectItem key={prov.id} value={prov.id}>
                    <span className="flex items-center gap-2">
                      {prov.name}
                      {st?.connected && (
                        <span className="text-emerald-600 text-xs">•
                          connected</span>
                      )}
                    </span>
                  </SelectItem>
                )
              })}
            </SelectContent>
          </Select>
        </div>

        {selectedProvider && (
          <ProviderDetail
            provider={curated.find((c) => c.id === selectedProvider)!}
            connected={!!statusFor(selectedProvider)?.connected}
            apiKey={apiKey}
            setApiKey={setApiKey}
            showKey={showKey}
            setShowKey={setShowKey}
            saving={saving}
            onSave={handleSaveKey}
            onRemove={() => handleRemoveKey(selectedProvider)}
            models={models}
            loadingModels={loadingModels}
            activeModel={settings.ai.model}
            onSelectModel={handleSelectModel}
          />
        )}
      </div>
    </div>
  )
}

function ProviderDetail({
  provider,
  connected,
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
  connected: boolean
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
  return (
    <div className="rounded-xl border p-4 space-y-4 bg-muted/30">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-foreground">
          {provider.name}
        </span>
        {connected ? (
          <Badge variant="success" className="gap-1">
            <Check size={11} /> Connected
          </Badge>
        ) : (
          <Badge variant="muted">No key</Badge>
        )}
      </div>

      {/* API key input */}
      <div className="space-y-2">
        <Label>API key</Label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Input
              type={showKey ? "text" : "password"}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={connected ? "•••••••• (saved)" : "Paste your API key"}
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
        {connected && (
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

      {/* Model selector */}
      {connected && (
        <div className="space-y-2">
          <Label>Model</Label>
          {loadingModels ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
              <Loader2 size={13} className="animate-spin" /> Loading models…
            </div>
          ) : models.length > 0 ? (
            <Select value={activeModel} onValueChange={onSelectModel}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a model…" />
              </SelectTrigger>
              <SelectContent>
                {models.map((m) => (
                  <SelectItem key={m.full} value={m.full}>
                    {m.model}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <p className="text-xs text-muted-foreground">
              No models found. Examples:{" "}
              <span className="font-mono">{provider.exampleModels.join(", ")}</span>
            </p>
          )}
        </div>
      )}
    </div>
  )
}
