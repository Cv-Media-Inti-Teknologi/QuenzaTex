import { app, BrowserWindow, ipcMain, dialog } from "electron"
import path from "path"
import fs from "fs"

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
}

app.whenReady().then(() => {
  registerIpcHandlers()
  createWindow()

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit()
})
