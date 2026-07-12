/// <reference types="vite/client" />

interface FileEntry {
  name: string
  isDirectory: boolean
  path: string
}

interface ProjectInfo {
  path: string
  files: FileEntry[]
}

interface CompileResult {
  success: boolean
  output: string
  pdfPath: string | null
  errors: { line: number; message: string }[]
}

interface OpenCodeStatus {
  running: boolean
  mode: "cli" | "off"
}

interface ChatMessageData {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: string
}

interface CuratedProvider {
  id: string
  name: string
  keyUrl: string
  hint: string
  exampleModels: string[]
}

interface ProviderStatus {
  id: string
  connected: boolean
  authType: string | null
}

interface ModelEntry {
  provider: string
  model: string
  full: string
}

interface ElectronAPI {
  logFromRenderer: (...args: any[]) => void
  openProject: () => Promise<ProjectInfo | null>
  readFile: (path: string) => Promise<string | null>
  writeFile: (path: string, content: string) => Promise<boolean>
  listDir: (dir: string) => Promise<FileEntry[]>
  latexCompile: (file: string) => Promise<CompileResult>
  latexCheck: () => Promise<boolean>
  latexWatch: (file: string) => Promise<boolean>
  latexStopWatch: () => Promise<boolean>
  readPdf: (path: string) => Promise<ArrayBuffer | null>
  readImage: (path: string) => Promise<{ bytes: ArrayBuffer; mime: string } | null>
  onLatexResult: (callback: (result: CompileResult) => void) => void
  opencodeStatus: () => Promise<OpenCodeStatus>
  opencodeCheckInstalled: () => Promise<boolean>
  opencodeSendWithContext: (
    message: string,
    projectPath: string,
    fileList?: string,
    history?: { role: string; content: string }[],
    model?: string
  ) => Promise<string>
  checkEnvironment: () => Promise<{
    node: { found: boolean; version: string }
    opencode: { found: boolean; version: string }
    texlive: { found: boolean; version: string; latexmk: boolean }
  }>
  installOpencode: () => Promise<boolean>
  aiListProviders: () => Promise<{ curated: CuratedProvider[]; status: ProviderStatus[] }>
  aiListModels: (providerId?: string) => Promise<ModelEntry[]>
  aiSaveKey: (providerId: string, key: string) => Promise<{ ok: boolean; error?: string }>
  aiRemoveKey: (providerId: string) => Promise<{ ok: boolean; error?: string }>
  aiGetStatus: () => Promise<ProviderStatus[]>
  sessionLoad: (projectPath: string) => Promise<ChatMessageData[]>
  sessionSave: (projectPath: string, messages: ChatMessageData[]) => Promise<boolean>
  sessionDelete: (projectPath: string) => Promise<boolean>
  sessionList: () => Promise<{ path: string; lastOpened: string }[]>
  onFilesChanged: (callback: () => void) => () => void
}

interface Window {
  electronAPI: ElectronAPI
}
