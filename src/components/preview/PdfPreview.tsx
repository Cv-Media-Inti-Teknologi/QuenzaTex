import { useEffect, useRef, useState, useCallback } from "react"
import { Loader2, FileWarning, ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from "lucide-react"
import { Button } from "@/components/ui/button"

interface Props {
  pdfPath: string | null
  /** bump to force a reload even when pdfPath is unchanged (e.g. re-compile) */
  pdfVersion?: number
}

export function PdfPreview({ pdfPath, pdfVersion }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const pdfDocRef = useRef<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pageNum, setPageNum] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [scale, setScale] = useState(1.4)

  const renderPage = useCallback(async (pdf: any, num: number, s: number) => {
    if (!canvasRef.current) return
    const page = await pdf.getPage(num)
    const viewport = page.getViewport({ scale: s })
    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")!
    // Handle HiDPI for crisp rendering
    const dpr = window.devicePixelRatio || 1
    canvas.width = Math.floor(viewport.width * dpr)
    canvas.height = Math.floor(viewport.height * dpr)
    canvas.style.width = `${Math.floor(viewport.width)}px`
    canvas.style.height = `${Math.floor(viewport.height)}px`
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    await page.render({ canvasContext: ctx, viewport }).promise
  }, [])

  useEffect(() => {
    if (!pdfPath) {
      pdfDocRef.current = null
      setError(null)
      setTotalPages(0)
      setPageNum(1)
      return
    }

    let cancelled = false
    const loadPdf = async () => {
      setLoading(true)
      setError(null)
      try {
        const buffer = await window.electronAPI.readPdf(pdfPath)
        if (cancelled) return
        if (!buffer) {
          setError("Could not read the compiled PDF file.")
          return
        }

        const pdfjsLib = await import("pdfjs-dist")
        pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
          "pdfjs-dist/build/pdf.worker.min.mjs",
          import.meta.url
        ).toString()

        // pdf.js needs its own copy of the bytes (it transfers/detaches them)
        const data = new Uint8Array(buffer.slice(0))
        const loadingTask = pdfjsLib.getDocument({ data })
        const pdf = await loadingTask.promise
        if (cancelled) return

        pdfDocRef.current = pdf
        setTotalPages(pdf.numPages)
        setPageNum(1)
        await renderPage(pdf, 1, scale)
      } catch (err: any) {
        if (!cancelled) setError(err?.message || "Failed to load PDF")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadPdf()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pdfPath, pdfVersion])

  // Re-render current page when scale changes
  useEffect(() => {
    if (pdfDocRef.current) {
      renderPage(pdfDocRef.current, pageNum, scale)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scale])

  const changePage = useCallback(
    async (delta: number) => {
      const next = pageNum + delta
      if (next < 1 || next > totalPages || !pdfDocRef.current) return
      setPageNum(next)
      await renderPage(pdfDocRef.current, next, scale)
    },
    [pageNum, totalPages, scale, renderPage]
  )

  if (!pdfPath) {
    return (
      <div className="flex flex-1 items-center justify-center text-muted-foreground text-sm">
        PDF preview will appear here after compilation
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center">
        <FileWarning size={28} className="text-destructive" />
        <p className="text-sm font-medium text-foreground">Couldn't display PDF</p>
        <p className="text-xs text-muted-foreground max-w-xs">{error}</p>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col min-h-0">
      {/* Viewer */}
      <div className="relative flex-1 min-h-0 overflow-auto bg-muted/40">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/60 z-10">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 size={16} className="animate-spin" /> Loading PDF…
            </div>
          </div>
        )}
        <div className="min-w-max min-h-full flex items-start justify-center p-4">
          <canvas ref={canvasRef} className="shadow-lg rounded-sm bg-white" />
        </div>
      </div>

      {/* Toolbar */}
      {totalPages > 0 && (
        <div className="flex items-center justify-between px-3 h-11 border-t shrink-0 bg-background">
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => changePage(-1)}
              disabled={pageNum <= 1}
            >
              <ChevronLeft size={16} />
            </Button>
            <span className="text-xs text-muted-foreground tabular-nums min-w-[3.5rem] text-center">
              {pageNum} / {totalPages}
            </span>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => changePage(1)}
              disabled={pageNum >= totalPages}
            >
              <ChevronRight size={16} />
            </Button>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setScale((s) => Math.max(0.5, +(s - 0.2).toFixed(2)))}
              disabled={scale <= 0.5}
            >
              <ZoomOut size={15} />
            </Button>
            <span className="text-xs text-muted-foreground tabular-nums min-w-[3rem] text-center">
              {Math.round(scale * 100)}%
            </span>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setScale((s) => Math.min(3, +(s + 0.2).toFixed(2)))}
              disabled={scale >= 3}
            >
              <ZoomIn size={15} />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
