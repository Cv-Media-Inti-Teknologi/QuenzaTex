import { useState, useCallback, useEffect } from "react"
import { ExplorerPanel } from "./ExplorerPanel"
import { EditorPanel } from "./EditorPanel"
import { PreviewPanel } from "./PreviewPanel"
import { AIPanel } from "./AIPanel"
import { ResizeHandle } from "./ResizeHandle"
import { useFileExplorer } from "../../hooks/useFileExplorer"

export function AppLayout() {
  const [explorerWidth, setExplorerWidth] = useState(250)
  const [aiWidth, setAiWidth] = useState(320)
  const [explorerHidden, setExplorerHidden] = useState(false)
  const [aiHidden, setAiHidden] = useState(false)
  const [fileContent, setFileContent] = useState<string | null>(null)

  const {
    project,
    loading,
    openProject,
    expandDir,
    selectFile,
    getSelectedContent,
    getSelectedPath,
  } = useFileExplorer()

  const handleSelectFile = useCallback(async (path: string) => {
    selectFile(path)
    const content = await window.electronAPI.readFile(path)
    setFileContent(content)
  }, [selectFile])

  const handleSave = useCallback(async (content: string) => {
    const path = getSelectedPath()
    if (path) {
      await window.electronAPI.writeFile(path, content)
    }
  }, [getSelectedPath])

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.ctrlKey && e.key === "b") {
      e.preventDefault()
      setExplorerHidden((v) => !v)
    }
    if (e.ctrlKey && e.key === "j") {
      e.preventDefault()
      setAiHidden((v) => !v)
    }
    if (e.ctrlKey && e.key === "o") {
      e.preventDefault()
      openProject()
    }
  }, [openProject])

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
            project={project}
            onOpenProject={openProject}
            onSelectFile={handleSelectFile}
            onExpandDir={expandDir}
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
            <EditorPanel
              filePath={getSelectedPath()}
              fileContent={fileContent}
              onSave={handleSave}
            />
          </div>
          <ResizeHandle
            onResize={(delta) => {
              // editor/preview ratio resize
            }}
          />
          <div className="flex-1 min-w-0 flex flex-col">
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
