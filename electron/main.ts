import { app, BrowserWindow, ipcMain, dialog } from "electron"
import path from "path"
import fs from "fs"
import { compileLatex, checkLatexInstallation, startLatexWatch } from "./services/latex"
import {
  startOpenCode,
  stopOpenCode,
  getOpenCodeStatus,
  sendOpenCodeMessage,
  isOpenCodeInstalled,
} from "./services/opencode"

let mainWindow: BrowserWindow | null = null
let currentProjectDir: string | null = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  mainWindow.on("ready-to-show", () => {
    mainWindow?.show()
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"))
  }
}

function getAllFiles(dir: string): { name: string; isDirectory: boolean; path: string }[] {
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true })
    return entries
      .filter((e) => !e.name.startsWith("."))
      .map((e) => ({
        name: e.name,
        isDirectory: e.isDirectory(),
        path: path.join(dir, e.name),
      }))
      .sort((a, b) => {
        if (a.isDirectory && !b.isDirectory) return -1
        if (!a.isDirectory && b.isDirectory) return 1
        return a.name.localeCompare(b.name)
      })
  } catch {
    return []
  }
}

function registerIpcHandlers() {
  ipcMain.handle("project:open", async () => {
    if (!mainWindow) return null
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ["openDirectory"],
    })
    if (result.canceled || result.filePaths.length === 0) return null
    currentProjectDir = result.filePaths[0]
    return { path: currentProjectDir, files: getAllFiles(currentProjectDir) }
  })

  ipcMain.handle("file:read", async (_, filePath: string) => {
    try {
      return fs.readFileSync(filePath, "utf-8")
    } catch {
      return null
    }
  })

  ipcMain.handle("file:write", async (_, filePath: string, content: string) => {
    try {
      fs.writeFileSync(filePath, content, "utf-8")
      return true
    } catch {
      return false
    }
  })

  ipcMain.handle("file:listDir", async (_, dirPath: string) => {
    return getAllFiles(dirPath)
  })

  let latexWatcher: { stop: () => void } | null = null

  ipcMain.handle("latex:compile", async (_, filePath: string) => {
    return compileLatex(filePath)
  })

  ipcMain.handle("latex:check", async () => {
    return checkLatexInstallation()
  })

  ipcMain.handle("latex:watch", async (_, filePath: string) => {
    if (latexWatcher) latexWatcher.stop()

    latexWatcher = startLatexWatch(filePath, (result) => {
      mainWindow?.webContents.send("latex:compile-result", result)
    })

    return true
  })

  ipcMain.handle("latex:stop-watch", async () => {
    if (latexWatcher) {
      latexWatcher.stop()
      latexWatcher = null
    }
    return true
  })

  ipcMain.handle("opencode:start", async () => {
    return startOpenCode()
  })

  ipcMain.handle("opencode:stop", async () => {
    stopOpenCode()
    return true
  })

  ipcMain.handle("opencode:status", async () => {
    return getOpenCodeStatus()
  })

  ipcMain.handle("opencode:send", async (_, message: string) => {
    return sendOpenCodeMessage(message)
  })

  ipcMain.handle("opencode:send-with-context", async (_, message: string, paths: string[]) => {
    return sendOpenCodeMessage(message, paths)
  })

  ipcMain.handle("opencode:check-installed", async () => {
    return isOpenCodeInstalled()
  })
}

app.whenReady().then(() => {
  registerIpcHandlers()
  createWindow()

  startOpenCode().then((status) => {
    console.log(`OpenCode started: ${status.mode} mode`)
  })

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on("before-quit", () => {
  stopOpenCode()
})

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit()
})
