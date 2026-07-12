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
  custom?: boolean
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
  name?: string
  toolCall?: boolean
  free?: boolean
}

interface ElectronAPI {
  logFromRenderer: (...args: any[]) => void
  openProject: () => Promise<ProjectInfo | null>
  readFile: (path: string) => Promise<string | null>
  writeFile: (path: string, content: string) => Promise<boolean>
  listDir: (dir: string) => Promise<FileEntry[]>
  showItemInFolder: (path: string) => Promise<boolean>
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
  ) => Promise<{ response: string; changedFiles: string[] }>
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
  aiSaveCustomProvider: (cfg: {
    id: string
    name: string
    baseURL: string
    apiKey: string
    modelId: string
  }) => Promise<{ ok: boolean; error?: string; model?: string }>
  aiCheckConnection: (modelFull: string) => Promise<{
    ok: boolean
    error?: string
    reply?: string
    ms?: number
  }>
  sessionLoad: (projectPath: string) => Promise<ChatMessageData[]>
  sessionSave: (projectPath: string, messages: ChatMessageData[]) => Promise<boolean>
  sessionDelete: (projectPath: string) => Promise<boolean>
  sessionList: () => Promise<{ path: string; lastOpened: string }[]>
  onFilesChanged: (callback: (changedFiles?: string[]) => void) => () => void
  onMenuAction: (callback: (action: string) => void) => () => void
}

interface Window {
  electronAPI: ElectronAPI
}
