import { useEffect, useRef, useState } from "react"

interface Props {
  pdfPath: string | null
}

export function PdfPreview({ pdfPath }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [pageNum, setPageNum] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const pdfDocRef = useRef<any>(null)

  useEffect(() => {
    if (!pdfPath) {
      setError(null)
      pdfDocRef.current = null
      setTotalPages(0)
      setPageNum(1)
      return
    }

    const loadPdf = async () => {
      try {
        setError(null)
        const pdfjsLib = await import("pdfjs-dist")
        pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
          "pdfjs-dist/build/pdf.worker.min.mjs",
          import.meta.url
        ).toString()

        const loadingTask = pdfjsLib.getDocument(pdfPath)
        const pdf = await loadingTask.promise
        pdfDocRef.current = pdf
        setTotalPages(pdf.numPages)
        setPageNum(1)
        renderPage(pdf, 1)
      } catch (err: any) {
        setError(err.message || "Failed to load PDF")
      }
    }

    loadPdf()
  }, [pdfPath])

  const renderPage = async (pdf: any, num: number) => {
    if (!canvasRef.current) return
    const page = await pdf.getPage(num)
    const viewport = page.getViewport({ scale: 1.5 })
    const canvas = canvasRef.current
    canvas.width = viewport.width
    canvas.height = viewport.height
    const ctx = canvas.getContext("2d")!
    await page.render({ canvasContext: ctx, viewport }).promise
  }

  const changePage = async (delta: number) => {
    const newPage = pageNum + delta
    if (newPage < 1 || newPage > totalPages || !pdfDocRef.current) return
    setPageNum(newPage)
    await renderPage(pdfDocRef.current, newPage)
  }

  if (!pdfPath) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
        PDF preview will appear here after compilation
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center text-red-400 text-sm p-4 text-center">
        {error}
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col items-center bg-gray-100 overflow-y-auto">
      <canvas ref={canvasRef} className="shadow-lg my-4 max-w-full" />
      {totalPages > 0 && (
        <div className="flex items-center gap-3 pb-4">
          <button
            onClick={() => changePage(-1)}
            disabled={pageNum <= 1}
            className="px-3 py-1 text-sm bg-white border border-[var(--border)] rounded
              disabled:opacity-30 hover:bg-[var(--muted)]"
          >
            Prev
          </button>
          <span className="text-sm text-gray-600">
            {pageNum} / {totalPages}
          </span>
          <button
            onClick={() => changePage(1)}
            disabled={pageNum >= totalPages}
            className="px-3 py-1 text-sm bg-white border border-[var(--border)] rounded
              disabled:opacity-30 hover:bg-[var(--muted)]"
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}
