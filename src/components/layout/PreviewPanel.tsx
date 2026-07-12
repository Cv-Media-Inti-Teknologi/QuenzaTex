import { PdfPreview } from "../preview/PdfPreview"

interface Props {
  pdfPath: string | null
  onCompile?: () => void
  compiling?: boolean
}

export function PreviewPanel({ pdfPath, onCompile, compiling }: Props) {
  return (
    <div className="h-full flex flex-col bg-white min-w-0 flex-1">
      <div className="flex items-center justify-between px-3 h-10 border-b border-[var(--border)] shrink-0">
        <span className="text-sm text-gray-600 font-medium">Preview</span>
        {onCompile && (
          <button
            onClick={onCompile}
            disabled={compiling}
            className="px-3 py-1 text-xs bg-blue-500 text-white rounded
              hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
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
