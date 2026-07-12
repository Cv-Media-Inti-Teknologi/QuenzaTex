import { useEffect, useRef, useState } from "react"
import { Loader2, ImageOff, ZoomIn, ZoomOut, Maximize } from "lucide-react"
import { Button } from "@/components/ui/button"

interface Props {
  imagePath: string | null
  imageVersion?: number
}

export function ImagePreview({ imagePath, imageVersion }: Props) {
  const [url, setUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [scale, setScale] = useState(1)
  const urlRef = useRef<string | null>(null)

  useEffect(() => {
    if (!imagePath) {
      setUrl(null)
      setError(null)
      return
    }

    let cancelled = false
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await window.electronAPI.readImage(imagePath)
        if (cancelled) return
        if (!res) {
          setError("Could not read the image file.")
          return
        }
        const blob = new Blob([res.bytes], { type: res.mime })
        const objectUrl = URL.createObjectURL(blob)
        // revoke the previous url
        if (urlRef.current) URL.revokeObjectURL(urlRef.current)
        urlRef.current = objectUrl
        setUrl(objectUrl)
        setScale(1)
      } catch (err: any) {
        if (!cancelled) setError(err?.message || "Failed to load image")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [imagePath, imageVersion])

  // Clean up object URL on unmount
  useEffect(() => {
    return () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current)
    }
  }, [])

  if (!imagePath) {
    return (
      <div className="flex flex-1 items-center justify-center text-muted-foreground text-sm">
        Select an image to preview
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center">
        <ImageOff size={28} className="text-destructive" />
        <p className="text-sm font-medium text-foreground">Couldn't display image</p>
        <p className="text-xs text-muted-foreground max-w-xs">{error}</p>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col min-h-0">
      <div className="relative flex-1 min-h-0 overflow-auto bg-[repeating-conic-gradient(#f1f5f9_0%_25%,#ffffff_0%_50%)] bg-[length:20px_20px]">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/60 z-10">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 size={16} className="animate-spin" /> Loading image…
            </div>
          </div>
        )}
        <div className="flex min-h-full items-center justify-center p-4">
          {url && (
            <img
              src={url}
              alt="preview"
              style={{ transform: `scale(${scale})` }}
              className="max-w-full origin-center shadow-lg transition-transform"
            />
          )}
        </div>
      </div>

      <div className="flex items-center justify-end gap-1 px-3 h-11 border-t shrink-0 bg-background">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setScale((s) => Math.max(0.2, +(s - 0.2).toFixed(2)))}
          disabled={scale <= 0.2}
        >
          <ZoomOut size={15} />
        </Button>
        <span className="text-xs text-muted-foreground tabular-nums min-w-[3rem] text-center">
          {Math.round(scale * 100)}%
        </span>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setScale((s) => Math.min(5, +(s + 0.2).toFixed(2)))}
          disabled={scale >= 5}
        >
          <ZoomIn size={15} />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setScale(1)}
          title="Reset zoom"
        >
          <Maximize size={14} />
        </Button>
      </div>
    </div>
  )
}
