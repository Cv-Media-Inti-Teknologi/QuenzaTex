import { PdfPreview } from "../preview/PdfPreview"
import { ImagePreview } from "../preview/ImagePreview"
import { Play, FileText, Image as ImageIcon, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"

interface Props {
  previewKind: "pdf" | "image" | null
  pdfPath: string | null
  pdfVersion?: number
  imagePath: string | null
  imageVersion?: number
  onCompile?: () => void
  compiling?: boolean
}

export function PreviewPanel({
  previewKind,
  pdfPath,
  pdfVersion,
  imagePath,
  imageVersion,
  onCompile,
  compiling,
}: Props) {
  const isImage = previewKind === "image"
  const title = isImage
    ? imagePath?.split(/[/\\]/).pop() || "Image"
    : "Preview"

  return (
    <div className="h-full flex flex-col min-h-0 bg-background min-w-0">
      <div className="flex items-center justify-between px-4 h-11 border-b shrink-0">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground min-w-0">
          {isImage ? (
            <ImageIcon size={15} className="text-muted-foreground shrink-0" />
          ) : (
            <FileText size={15} className="text-muted-foreground shrink-0" />
          )}
          <span className="truncate">{title}</span>
        </div>
        {/* Compile only makes sense for the LaTeX/PDF context */}
        {!isImage && onCompile && (
          <Button
            size="sm"
            onClick={onCompile}
            disabled={compiling}
            className="h-7 gap-1.5 text-xs shrink-0"
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
        {isImage ? (
          <ImagePreview imagePath={imagePath} imageVersion={imageVersion} />
        ) : (
          <PdfPreview pdfPath={pdfPath} pdfVersion={pdfVersion} />
        )}
      </div>
    </div>
  )
}
