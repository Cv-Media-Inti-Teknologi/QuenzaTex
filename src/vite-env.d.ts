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

interface ElectronAPI {
  openProject: () => Promise<ProjectInfo | null>
  readFile: (path: string) => Promise<string | null>
  writeFile: (path: string, content: string) => Promise<boolean>
  listDir: (dir: string) => Promise<FileEntry[]>
  opencodeSend: (message: string) => Promise<string>
  opencodeStatus: () => Promise<{ running: boolean; mode: string }>
  compileLatex: (file: string) => Promise<{ success: boolean; output: string }>
  getEnvStatus: () => Promise<Record<string, { installed: boolean; version?: string }>>
}

interface Window {
  electronAPI: ElectronAPI
}
