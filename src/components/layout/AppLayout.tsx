import { useState, useCallback, useEffect, useRef } from "react"
import { ExplorerPanel } from "./ExplorerPanel"
import { EditorPanel } from "./EditorPanel"
import { PreviewPanel } from "./PreviewPanel"
import { AIPanel } from "./AIPanel"
import { ResizeHandle } from "./ResizeHandle"
import { SetupWizard } from "../onboarding/SetupWizard"
import { SettingsDialog } from "../settings/SettingsDialog"
import { useFileExplorer } from "../../hooks/useFileExplorer"
import { useOpencode } from "../../hooks/useOpencode"

export function AppLayout() {
  const [explorerWidth, setExplorerWidth] = useState(250)
  const [aiWidth, setAiWidth] = useState(320)
  const [explorerHidden, setExplorerHidden] = useState(false)
  const [aiHidden, setAiHidden] = useState(false)
  const [fileContent, setFileContent] = useState<string | null>(null)
  const [pdfPath, setPdfPath] = useState<string | null>(null)
  const [compiling, setCompiling] = useState(false)
  const [showSetup, setShowSetup] = useState(() => !localStorage.getItem("quenzatex-setup-done"))
  const [showSettings, setShowSettings] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const {
    project,
    openProject,
    expandDir,
    selectFile,
    getSelectedPath,
  } = useFileExplorer()

  const {
    status: opencodeStatus,
    messages: chatMessages,
    sending: chatSending,
    sendMessage: sendChatMessage,
    clearMessages,
  } = useOpencode()

  const handleSelectFile = useCallback(async (path: string) => {
    selectFile(path)
    const content = await window.electronAPI.readFile(path)
    setFileContent(content)
    if (path.endsWith(".tex")) {
      setPdfPath(null)
    }
  }, [selectFile])

  const handleSave = useCallback(async (content: string) => {
    const path = getSelectedPath()
    if (path) {
      await window.electronAPI.writeFile(path, content)
    }
  }, [getSelectedPath])

  const handleCompile = useCallback(async () => {
    const path = getSelectedPath()
    if (!path || !path.endsWith(".tex")) return
    setCompiling(true)
    try {
      const result = await window.electronAPI.latexCompile(path)
      if (result.pdfPath) {
        setPdfPath(result.pdfPath)
      }
    } finally {
      setCompiling(false)
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
    if (e.ctrlKey && e.key === ",") {
      e.preventDefault()
      setShowSettings(true)
    }
    if (e.ctrlKey && e.key === "Enter" && getSelectedPath()?.endsWith(".tex")) {
      e.preventDefault()
      handleCompile()
    }
  }, [openProject, handleCompile, getSelectedPath])

  const handleSetupComplete = useCallback(() => {
    localStorage.setItem("quenzatex-setup-done", "true")
    setShowSetup(false)
  }, [])

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [handleKeyDown])

  return (
    <div ref={containerRef} className="h-screen w-screen flex bg-white overflow-hidden select-none">
      {!explorerHidden && (
        <>
          <ExplorerPanel
            width={explorerWidth}
            onClose={() => setExplorerHidden(true)}
            project={project}
            onOpenProject={openProject}
            onSelectFile={handleSelectFile}
            onExpandDir={expandDir}
            onOpenSettings={() => setShowSettings(true)}
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
            <PreviewPanel
              pdfPath={pdfPath}
              onCompile={handleCompile}
              compiling={compiling}
            />
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
            messages={chatMessages}
            sending={chatSending}
            onSend={sendChatMessage}
            onClear={clearMessages}
            status={opencodeStatus}
          />
        </>
      )}

      {showSetup && <SetupWizard onComplete={handleSetupComplete} />}
      {showSettings && <SettingsDialog onClose={() => setShowSettings(false)} />}
    </div>
  )
}
