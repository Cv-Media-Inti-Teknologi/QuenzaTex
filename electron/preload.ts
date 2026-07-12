import { contextBridge, ipcRenderer } from "electron"

contextBridge.exposeInMainWorld("electronAPI", {
  openProject: () => ipcRenderer.invoke("project:open"),
  readFile: (path: string) => ipcRenderer.invoke("file:read", path),
  writeFile: (path: string, content: string) => ipcRenderer.invoke("file:write", path, content),
  listDir: (dir: string) => ipcRenderer.invoke("file:listDir", dir),
  opencodeSend: (message: string) => ipcRenderer.invoke("opencode:send", message),
  opencodeStatus: () => ipcRenderer.invoke("opencode:status"),
  compileLatex: (file: string) => ipcRenderer.invoke("latex:compile", file),
  getEnvStatus: () => ipcRenderer.invoke("env:status"),
})
