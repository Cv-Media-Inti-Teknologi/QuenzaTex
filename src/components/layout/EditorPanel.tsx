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
      <div className="h-full flex flex-col bg-white min-w-0 flex-1">
        <div className="flex items-center px-3 h-10 border-b border-[var(--border)] shrink-0">
          <span className="text-sm text-gray-500">untitled.tex</span>
        </div>
        <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
          <div className="text-center">
            <p className="text-lg mb-1">Open a .tex file to start editing</p>
            <p className="text-xs text-gray-300">or press Ctrl+O to open a folder</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-white min-w-0 flex-1">
      <div className="flex items-center justify-between px-3 h-10 border-b border-[var(--border)] shrink-0">
        <span className="text-sm text-gray-600 font-medium truncate">{fileName}</span>
      </div>
      <div className="flex-1">
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
