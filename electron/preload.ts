import { contextBridge, ipcRenderer } from "electron"

contextBridge.exposeInMainWorld("electronAPI", {
  openProject: () => ipcRenderer.invoke("project:open"),
  readFile: (path: string) => ipcRenderer.invoke("file:read", path),
  writeFile: (path: string, content: string) => ipcRenderer.invoke("file:write", path, content),
  listDir: (dir: string) => ipcRenderer.invoke("file:listDir", dir),
  latexCompile: (file: string) => ipcRenderer.invoke("latex:compile", file),
  latexCheck: () => ipcRenderer.invoke("latex:check"),
  latexWatch: (file: string) => ipcRenderer.invoke("latex:watch", file),
  latexStopWatch: () => ipcRenderer.invoke("latex:stop-watch"),
  onLatexResult: (callback: (result: any) => void) => {
    ipcRenderer.on("latex:compile-result", (_, result) => callback(result))
  },
  opencodeStatus: () => ipcRenderer.invoke("opencode:status"),
  opencodeCheckInstalled: () => ipcRenderer.invoke("opencode:check-installed"),
  opencodeSendWithContext: (
    message: string,
    projectPath: string,
    fileList?: string,
    history?: { role: string; content: string }[],
    model?: string
  ) => ipcRenderer.invoke("opencode:send-with-context", message, projectPath, fileList, history, model),
  checkEnvironment: () => ipcRenderer.invoke("env:check"),
  installOpencode: () => ipcRenderer.invoke("env:install-opencode"),
  sessionLoad: (projectPath: string) => ipcRenderer.invoke("session:load", projectPath),
  sessionSave: (projectPath: string, messages: any[]) =>
    ipcRenderer.invoke("session:save", projectPath, messages),
  sessionDelete: (projectPath: string) => ipcRenderer.invoke("session:delete", projectPath),
  sessionList: () => ipcRenderer.invoke("session:list"),
  onFilesChanged: (callback: () => void) => {
    const handler = () => callback()
    ipcRenderer.on("project:files-changed", handler)
    return () => {
      ipcRenderer.removeListener("project:files-changed", handler)
    }
  },
})
