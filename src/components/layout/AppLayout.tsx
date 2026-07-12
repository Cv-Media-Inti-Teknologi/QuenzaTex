import { useState, useCallback, useEffect } from "react"
import { ExplorerPanel } from "./ExplorerPanel"
import { EditorPanel } from "./EditorPanel"
import { PreviewPanel } from "./PreviewPanel"
import { AIPanel } from "./AIPanel"
import { ResizeHandle } from "./ResizeHandle"

export function AppLayout() {
  const [explorerWidth, setExplorerWidth] = useState(250)
  const [aiWidth, setAiWidth] = useState(320)
  const [editorRatio, setEditorRatio] = useState(0.5)
  const [explorerHidden, setExplorerHidden] = useState(false)
  const [aiHidden, setAiHidden] = useState(false)

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.ctrlKey && e.key === "b") {
      e.preventDefault()
      setExplorerHidden((v) => !v)
    }
    if (e.ctrlKey && e.key === "j") {
      e.preventDefault()
      setAiHidden((v) => !v)
    }
  }, [])

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [handleKeyDown])

  return (
    <div className="h-screen w-screen flex bg-white overflow-hidden select-none">
      {!explorerHidden && (
        <>
          <ExplorerPanel
            width={explorerWidth}
            onClose={() => setExplorerHidden(true)}
          />
          <ResizeHandle
            onResize={(delta) =>
              setExplorerWidth((w) => Math.max(180, Math.min(500, w + delta)))
            }
          />
        </>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex flex-1 min-h-0">
          <div className="flex-1 min-w-0 flex flex-col">
            <EditorPanel />
          </div>
          <ResizeHandle
            onResize={(delta) => {
              const container = document.querySelector(".editor-preview-container")
              if (!container) return
              const rect = container.getBoundingClientRect()
              const ratio = (rect.width * editorRatio + delta) / rect.width
              setEditorRatio(Math.max(0.2, Math.min(0.8, ratio)))
            }}
          />
          <div
            className="flex-1 min-w-0 flex flex-col"
            style={{ flex: editorRatio > 0 ? 1 : undefined }}
          >
            <PreviewPanel />
          </div>
        </div>
      </div>

      {!aiHidden && (
        <>
          <ResizeHandle
            onResize={(delta) =>
              setAiWidth((w) => Math.max(280, Math.min(600, w + delta)))
            }
          />
          <AIPanel
            width={aiWidth}
            onClose={() => setAiHidden(true)}
          />
        </>
      )}
    </div>
  )
}
