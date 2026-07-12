import { useState, useEffect } from "react"
import { LatexEditor } from "../editor/LatexEditor"

interface Props {
  filePath: string | null
  fileContent?: string | null
  onContentChange?: (content: string | undefined) => void
  onSave?: (content: string) => void
}

export function EditorPanel({ filePath, fileContent, onContentChange, onSave }: Props) {
  const [content, setContent] = useState(fileContent || "")

  useEffect(() => {
    if (fileContent !== undefined && fileContent !== null) {
      setContent(fileContent)
    }
  }, [fileContent])

  const fileName = filePath ? filePath.split(/[/\\]/).pop() : "untitled.tex"

  if (!filePath) {
    return (
      <div className="h-full flex flex-col min-h-0 bg-background min-w-0">
        <div className="flex items-center px-4 h-11 border-b shrink-0">
          <span className="text-sm text-muted-foreground">untitled.tex</span>
        </div>
        <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
          <div className="text-center">
            <p className="text-base font-medium text-foreground mb-1">Open a .tex file to start editing</p>
            <p className="text-xs text-muted-foreground">or press Ctrl+O to open a folder</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col min-h-0 bg-background min-w-0">
      <div className="flex items-center justify-between px-4 h-11 border-b shrink-0">
        <span className="text-sm text-foreground font-medium truncate">{fileName}</span>
      </div>
      <div className="flex-1 min-h-0">
        <LatexEditor
          value={content}
          filePath={filePath}
          onChange={(v) => {
            setContent(v || "")
            onContentChange?.(v)
          }}
          onSave={(v) => onSave?.(v)}
        />
      </div>
    </div>
  )
}
