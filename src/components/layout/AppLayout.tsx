import { useState, useCallback, useEffect, useRef } from "react"
import { logger } from "../../lib/logger"
import { ExplorerPanel } from "./ExplorerPanel"
import { EditorPanel } from "./EditorPanel"
import { PreviewPanel } from "./PreviewPanel"
import { AIPanel } from "./AIPanel"
import { SetupWizard } from "../onboarding/SetupWizard"
import { SettingsDialog } from "../settings/SettingsDialog"
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable"
import { useFileExplorer } from "../../hooks/useFileExplorer"
import { useOpencode } from "../../hooks/useOpencode"
import { useSession } from "../../hooks/useSession"
import { useSettings } from "../../store/SettingsContext"
import type { ChatMessage } from "../../hooks/useOpencode"

export function AppLayout() {
  const [explorerHidden, setExplorerHidden] = useState(false)
  const [aiHidden, setAiHidden] = useState(false)
  const [fileContent, setFileContent] = useState<string | null>(null)
  const [pdfPath, setPdfPath] = useState<string | null>(null)
  const [pdfVersion, setPdfVersion] = useState(0)
  const [compiling, setCompiling] = useState(false)
  const [showSetup, setShowSetup] = useState(() => !localStorage.getItem("quenzatex-setup-done"))
  const [showSettings, setShowSettings] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const prevProjectPathRef = useRef<string | null>(null)

  const {
    project,
    openProject,
    expandDir,
    selectFile,
    getSelectedPath,
    refreshFiles,
  } = useFileExplorer()

  const {
    messages: chatMessages,
    sending: chatSending,
    sendMessage: sendChatMessage,
    clearMessages,
    setProjectContext,
    restoreMessages,
  } = useOpencode()

  const session = useSession()
  const { settings } = useSettings()

  // When project changes, load session + set AI context
  useEffect(() => {
    const path = project?.rootPath || null
    if (!path || path === prevProjectPathRef.current) return

    prevProjectPathRef.current = path

    const setup = async () => {
      const stored = await session.load(path)
      if (stored.length > 0) {
        const restored: ChatMessage[] = stored.map((m) => ({
          ...m,
          timestamp: new Date(m.timestamp),
        }))
        restoreMessages(restored)
      }

      const fileList = project?.files
        ?.filter((f) => !f.isDirectory)
        .map((f) => `- ${f.name}`)
        .join("\n")

      setProjectContext({ projectPath: path, fileList, model: settings.ai.model })
    }

    setup()
  }, [project?.rootPath, project?.files])

  // Propagate model changes from Settings without needing to reopen the project
  useEffect(() => {
    const path = project?.rootPath
    if (!path) return
    const fileList = project?.files
      ?.filter((f) => !f.isDirectory)
      .map((f) => `- ${f.name}`)
      .join("\n")
    setProjectContext({ projectPath: path, fileList, model: settings.ai.model })
  }, [settings.ai.model])

  // Auto-save chat when messages change
  useEffect(() => {
    const path = prevProjectPathRef.current
    if (!path || chatMessages.length === 0) return
    const serialized = chatMessages.map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      timestamp: m.timestamp.toISOString(),
    }))
    session.save(path, serialized)
  }, [chatMessages])

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
        setPdfVersion(Date.now())
      }
    } finally {
      setCompiling(false)
    }
  }, [getSelectedPath])

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.ctrlKey && e.key === "b") {
      e.preventDefault()
      setExplorerHidden((v) => { const n = !v; logger.key(`Ctrl+B → Explorer ${n ? "hidden" : "shown"}`); return n })
    }
    if (e.ctrlKey && e.key === "j") {
      e.preventDefault()
      setAiHidden((v) => { const n = !v; logger.key(`Ctrl+J → AI Panel ${n ? "hidden" : "shown"}`); return n })
    }
    if (e.ctrlKey && e.key === "o") {
      e.preventDefault()
      logger.key("Ctrl+O → Open project")
      openProject()
    }
    if (e.ctrlKey && e.key === ",") {
      e.preventDefault()
      logger.key("Ctrl+, → Settings")
      setShowSettings(true)
    }
    if (e.ctrlKey && e.key === "Enter" && getSelectedPath()?.endsWith(".tex")) {
      e.preventDefault()
      logger.key("Ctrl+Enter → Compile LaTeX")
      handleCompile()
    }
  }, [openProject, handleCompile, getSelectedPath])

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [handleKeyDown])

  // Refresh file tree when AI creates/changes files
  useEffect(() => {
    if (typeof window.electronAPI.onFilesChanged !== "function") return
    const unsub = window.electronAPI.onFilesChanged(() => {
      logger.file("AI changed files, refreshing tree")
      refreshFiles()
    })
    return () => { if (typeof unsub === "function") unsub() }
  }, [refreshFiles])

  const handleSetupComplete = useCallback(() => {
    localStorage.setItem("quenzatex-setup-done", "true")
    setShowSetup(false)
    logger.lifecycle("Setup wizard completed")
  }, [])

  return (
    <div ref={containerRef} className="h-screen w-screen bg-background overflow-hidden select-none">
      <ResizablePanelGroup direction="horizontal" className="h-full w-full">
        {!explorerHidden && (
          <>
            <ResizablePanel
              defaultSize={18}
              minSize={12}
              maxSize={30}
              className="min-w-0"
            >
              <ExplorerPanel
                onClose={() => setExplorerHidden(true)}
                project={project}
                onOpenProject={openProject}
                onSelectFile={handleSelectFile}
                onExpandDir={expandDir}
                onOpenSettings={() => setShowSettings(true)}
              />
            </ResizablePanel>
            <ResizableHandle />
          </>
        )}

        <ResizablePanel defaultSize={aiHidden ? 82 : 58} minSize={30}>
          <ResizablePanelGroup direction="horizontal" className="h-full w-full">
            <ResizablePanel defaultSize={50} minSize={20} className="min-w-0">
              <EditorPanel
                filePath={getSelectedPath()}
                fileContent={fileContent}
                onSave={handleSave}
              />
            </ResizablePanel>
            <ResizableHandle />
            <ResizablePanel defaultSize={50} minSize={20} className="min-w-0">
              <PreviewPanel
                pdfPath={pdfPath}
                pdfVersion={pdfVersion}
                onCompile={handleCompile}
                compiling={compiling}
              />
            </ResizablePanel>
          </ResizablePanelGroup>
        </ResizablePanel>

        {!aiHidden && (
          <>
            <ResizableHandle />
            <ResizablePanel
              defaultSize={24}
              minSize={18}
              maxSize={40}
              className="min-w-0"
            >
              <AIPanel
                onClose={() => setAiHidden(true)}
                messages={chatMessages}
                sending={chatSending}
                onSend={sendChatMessage}
                onClear={clearMessages}
              />
            </ResizablePanel>
          </>
        )}
      </ResizablePanelGroup>

      {showSetup && <SetupWizard onComplete={handleSetupComplete} />}
      {showSettings && <SettingsDialog onClose={() => setShowSettings(false)} />}
    </div>
  )
}
