import { PdfPreview } from "../preview/PdfPreview"
import { Play } from "lucide-react"

interface Props {
  pdfPath: string | null
  onCompile?: () => void
  compiling?: boolean
}

export function PreviewPanel({ pdfPath, onCompile, compiling }: Props) {
  return (
    <div className="h-full flex flex-col bg-white min-w-0 flex-1">
      <div className="flex items-center justify-between px-4 h-11 border-b border-[var(--border)] shrink-0">
        <span className="text-sm font-medium text-gray-600">Preview</span>
        {onCompile && (
          <button
            onClick={onCompile}
            disabled={compiling}
            className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium bg-blue-500 text-white rounded-lg
              hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Play size={13} />
            {compiling ? "Compiling..." : "Compile"}
          </button>
        )}
      </div>
      <div className="flex-1 flex min-h-0">
        <PdfPreview pdfPath={pdfPath} />
      </div>
    </div>
  )
}
