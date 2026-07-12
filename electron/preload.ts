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
  opencodeStart: () => ipcRenderer.invoke("opencode:start"),
  opencodeStop: () => ipcRenderer.invoke("opencode:stop"),
  opencodeSend: (message: string) => ipcRenderer.invoke("opencode:send", message),
  opencodeSendWithContext: (message: string, paths: string[]) =>
    ipcRenderer.invoke("opencode:send-with-context", message, paths),
  opencodeStatus: () => ipcRenderer.invoke("opencode:status"),
  opencodeCheckInstalled: () => ipcRenderer.invoke("opencode:check-installed"),
  checkEnvironment: () => ipcRenderer.invoke("env:check"),
  installOpencode: () => ipcRenderer.invoke("env:install-opencode"),
})
