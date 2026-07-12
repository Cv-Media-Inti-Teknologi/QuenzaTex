import { PdfPreview } from "../preview/PdfPreview"
import { Play, FileText, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"

interface Props {
  pdfPath: string | null
  onCompile?: () => void
  compiling?: boolean
}

export function PreviewPanel({ pdfPath, onCompile, compiling }: Props) {
  return (
    <div className="h-full flex flex-col min-h-0 bg-background min-w-0">
      <div className="flex items-center justify-between px-4 h-11 border-b shrink-0">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <FileText size={15} className="text-muted-foreground" />
          <span>Preview</span>
        </div>
        {onCompile && (
          <Button
            size="sm"
            onClick={onCompile}
            disabled={compiling}
            className="h-7 gap-1.5 text-xs"
          >
            {compiling ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <Play size={13} />
            )}
            {compiling ? "Compiling…" : "Compile"}
          </Button>
        )}
      </div>
      <div className="flex flex-1 min-h-0">
        <PdfPreview pdfPath={pdfPath} />
      </div>
    </div>
  )
}
