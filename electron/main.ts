import { app, BrowserWindow, ipcMain, dialog } from "electron"
import path from "path"
import fs from "fs"
import { compileLatex, checkLatexInstallation, startLatexWatch } from "./services/latex"
import {
  getOpenCodeStatus,
  sendOpenCodeMessage,
  isOpenCodeInstalled,
  startOpenCode,
} from "./services/opencode"
import { checkEnvironment, installOpencode } from "./services/env-setup"
import {
  loadSession,
  saveSession,
  deleteSession,
  listSessions,
  type ChatMessageData,
} from "./services/session"

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

  if (process.env.QUENZATEX_MODE === "development" || process.env.NODE_ENV === "development") {
    mainWindow.webContents.openDevTools()
    mainWindow.maximize()
    mainWindow.setTitle("Quenzatex [DEV]")
  }

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

  ipcMain.handle("opencode:status", async () => {
    return getOpenCodeStatus()
  })

  ipcMain.handle("opencode:check-installed", async () => {
    return isOpenCodeInstalled()
  })

  ipcMain.handle(
    "opencode:send-with-context",
    async (
      _,
      message: string,
      projectPath: string,
      fileList?: string,
      conversationHistory?: { role: string; content: string }[],
      model?: string
    ) => {
      const response = await sendOpenCodeMessage(message, {
        projectPath,
        fileList,
        conversationHistory,
        model,
      })
      mainWindow?.webContents.send("project:files-changed")
      return response
    }
  )

  ipcMain.handle("env:check", async () => {
    return checkEnvironment()
  })

  ipcMain.handle("env:install-opencode", async () => {
    return installOpencode()
  })

  ipcMain.handle("session:load", async (_, projectPath: string) => {
    return loadSession(projectPath)
  })

  ipcMain.handle("session:save", async (_, projectPath: string, messages: ChatMessageData[]) => {
    saveSession(projectPath, messages)
    return true
  })

  ipcMain.handle("session:delete", async (_, projectPath: string) => {
    deleteSession(projectPath)
    return true
  })

  ipcMain.handle("session:list", async () => {
    return listSessions()
  })
}

app.whenReady().then(() => {
  registerIpcHandlers()
  createWindow()

  startOpenCode()

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit()
})
