/// <reference types="vite/client" />

interface ElectronAPI {
  readFile: (path: string) => Promise<string>
  writeFile: (path: string, content: string) => Promise<boolean>
  listDir: (dir: string) => Promise<{ name: string; isDirectory: boolean; path: string }[]>
  opencodeSend: (message: string) => Promise<string>
  opencodeStatus: () => Promise<{ running: boolean; mode: string }>
  compileLatex: (file: string) => Promise<{ success: boolean; output: string }>
  getEnvStatus: () => Promise<Record<string, { installed: boolean; version?: string }>>
}

interface Window {
  electronAPI: ElectronAPI
}
