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
  mode: "http" | "cli" | "off"
  port: number
}

interface ElectronAPI {
  openProject: () => Promise<ProjectInfo | null>
  readFile: (path: string) => Promise<string | null>
  writeFile: (path: string, content: string) => Promise<boolean>
  listDir: (dir: string) => Promise<FileEntry[]>
  latexCompile: (file: string) => Promise<CompileResult>
  latexCheck: () => Promise<boolean>
  latexWatch: (file: string) => Promise<boolean>
  latexStopWatch: () => Promise<boolean>
  onLatexResult: (callback: (result: CompileResult) => void) => void
  opencodeStart: () => Promise<OpenCodeStatus>
  opencodeStop: () => Promise<boolean>
  opencodeSend: (message: string) => Promise<string>
  opencodeSendWithContext: (message: string, paths: string[]) => Promise<string>
  opencodeStatus: () => Promise<OpenCodeStatus>
  opencodeCheckInstalled: () => Promise<boolean>
  getEnvStatus: () => Promise<Record<string, { installed: boolean; version?: string }>>
}

interface Window {
  electronAPI: ElectronAPI
}
