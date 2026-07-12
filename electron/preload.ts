import { contextBridge, ipcRenderer } from "electron"

contextBridge.exposeInMainWorld("electronAPI", {
  logFromRenderer: (...args: any[]) => ipcRenderer.send("log:from-renderer", ...args),
  openProject: () => ipcRenderer.invoke("project:open"),
  readFile: (path: string) => ipcRenderer.invoke("file:read", path),
  writeFile: (path: string, content: string) => ipcRenderer.invoke("file:write", path, content),
  listDir: (dir: string) => ipcRenderer.invoke("file:listDir", dir),
  showItemInFolder: (path: string) => ipcRenderer.invoke("file:show-in-folder", path),
  latexCompile: (file: string) => ipcRenderer.invoke("latex:compile", file),
  latexCheck: () => ipcRenderer.invoke("latex:check"),
  latexWatch: (file: string) => ipcRenderer.invoke("latex:watch", file),
  latexStopWatch: () => ipcRenderer.invoke("latex:stop-watch"),
  readPdf: (path: string) => ipcRenderer.invoke("pdf:read", path),
  readImage: (path: string) => ipcRenderer.invoke("image:read", path),
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
  aiListProviders: () => ipcRenderer.invoke("ai:list-providers"),
  aiListModels: (providerId?: string) => ipcRenderer.invoke("ai:list-models", providerId),
  aiSaveKey: (providerId: string, key: string) => ipcRenderer.invoke("ai:save-key", providerId, key),
  aiRemoveKey: (providerId: string) => ipcRenderer.invoke("ai:remove-key", providerId),
  aiGetStatus: () => ipcRenderer.invoke("ai:get-status"),
  aiSaveCustomProvider: (cfg: { id: string; name: string; baseURL: string; apiKey: string; modelId: string }) =>
    ipcRenderer.invoke("ai:save-custom-provider", cfg),
  aiCheckConnection: (modelFull: string) => ipcRenderer.invoke("ai:check-connection", modelFull),
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
  onMenuAction: (callback: (action: string) => void) => {
    const handler = (_: unknown, action: string) => callback(action)
    ipcRenderer.on("menu:action", handler)
    return () => {
      ipcRenderer.removeListener("menu:action", handler)
    }
  },
})
