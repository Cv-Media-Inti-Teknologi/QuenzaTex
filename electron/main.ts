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
  getCuratedProviders,
  getProviderStatus,
  saveApiKey,
  removeApiKey,
  listModels,
  listModelsForProvider,
} from "./services/ai-config"
import {
  loadSession,
  saveSession,
  deleteSession,
  listSessions,
  type ChatMessageData,
} from "./services/session"
import { logger, logFromRenderer } from "./services/logger"

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
    logger.file("Open project dialog...")
    if (!mainWindow) return null
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ["openDirectory"],
    })
    if (result.canceled || result.filePaths.length === 0) {
      logger.file("Project open canceled")
      return null
    }
    currentProjectDir = result.filePaths[0]
    const files = getAllFiles(currentProjectDir)
    logger.file(`Opened project: ${currentProjectDir} (${files.length} items)`)
    return { path: currentProjectDir, files }
  })

  ipcMain.handle("file:read", async (_, filePath: string) => {
    try {
      const content = fs.readFileSync(filePath, "utf-8")
      logger.file(`Read: ${path.basename(filePath)} (${content.length}B)`)
      return content
    } catch (err) {
      logger.warn(`Read failed: ${filePath}`, err)
      return null
    }
  })

  ipcMain.handle("file:write", async (_, filePath: string, content: string) => {
    try {
      fs.writeFileSync(filePath, content, "utf-8")
      logger.save(`Saved: ${path.basename(filePath)} (${content.length}B)`)
      return true
    } catch (err) {
      logger.error(`Save failed: ${filePath}`, err)
      return false
    }
  })

  ipcMain.handle("file:listDir", async (_, dirPath: string) => {
    const entries = getAllFiles(dirPath)
    logger.dir(`List dir: ${path.basename(dirPath)} (${entries.length} items)`)
    return entries
  })

  let latexWatcher: { stop: () => void } | null = null

  ipcMain.handle("latex:compile", async (_, filePath: string) => {
    const start = Date.now()
    logger.latex(`Compile: ${path.basename(filePath)}...`)
    const result = compileLatex(filePath)
    const duration = Date.now() - start
    if (result.success) {
      logger.latex(`Compile OK (${duration}ms): ${path.basename(filePath)} → PDF ready`)
    } else {
      logger.latex(`Compile FAILED (${duration}ms): ${result.errors.length} errors`)
    }
    return result
  })

  ipcMain.handle("latex:check", async () => {
    logger.latex("Checking LaTeX installation...")
    const result = checkLatexInstallation()
    logger.latex(`LaTeX check: ${result ? "found" : "not found"}`)
    return result
  })

  ipcMain.handle("latex:watch", async (_, filePath: string) => {
    if (latexWatcher) {
      latexWatcher.stop()
      logger.info("Stopped previous LaTeX watcher")
    }

    latexWatcher = startLatexWatch(filePath, (result) => {
      if (result.success) {
        logger.latex(`Watch auto-compile OK: ${result.pdfPath}`)
      } else {
        logger.latex(`Watch auto-compile FAILED: ${result.errors.length} errors`)
      }
      mainWindow?.webContents.send("latex:compile-result", result)
    })

    logger.latex(`Started watch: ${path.basename(filePath)}`)
    return true
  })

  ipcMain.handle("latex:stop-watch", async () => {
    if (latexWatcher) {
      latexWatcher.stop()
      latexWatcher = null
      logger.latex("Stopped LaTeX watcher")
    }
    return true
  })

  ipcMain.handle("opencode:status", async () => {
    const status = getOpenCodeStatus()
    logger.ai(`Status check: ${status.mode}`)
    return status
  })

  ipcMain.handle("opencode:check-installed", async () => {
    const installed = isOpenCodeInstalled()
    logger.ai(`Installed check: ${installed}`)
    return installed
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
      const msgPreview = message.length > 60 ? message.slice(0, 60) + "..." : message
      const historyCount = conversationHistory?.length || 0
      const promptSize = message.length + (fileList?.length || 0)
      logger.ai(`Send: "${msgPreview}" (history: ${historyCount}, prompt: ~${promptSize}B, model: ${model || "default"})`)

      const start = Date.now()
      const response = await sendOpenCodeMessage(message, {
        projectPath,
        fileList,
        conversationHistory,
        model,
      })
      const duration = Date.now() - start

      const respPreview = response.length > 80 ? response.slice(0, 80) + "..." : response
      logger.ai(`Response (${duration}ms): "${respPreview}"`)

      mainWindow?.webContents.send("project:files-changed")
      logger.file("File tree refresh triggered (AI may have changed files)")
      return response
    }
  )

  ipcMain.handle("env:check", async () => {
    logger.lifecycle("Checking environment...")
    const result = await checkEnvironment()
    logger.ready(`Node: ${result.node.version}, opencode: ${result.opencode.version}, TeX: ${result.texlive.found ? result.texlive.version : "not found"}`)
    return result
  })

  ipcMain.handle("env:install-opencode", async () => {
    logger.lifecycle("Installing opencode...")
    const ok = await installOpencode()
    logger.lifecycle(`Install opencode: ${ok ? "OK" : "FAILED"}`)
    return ok
  })

  // --- AI provider / model configuration ---
  ipcMain.handle("ai:list-providers", async () => {
    const curated = getCuratedProviders()
    const status = getProviderStatus()
    return { curated, status }
  })

  ipcMain.handle("ai:list-models", async (_, providerId?: string) => {
    const models = providerId ? listModelsForProvider(providerId) : listModels()
    logger.ai(`List models${providerId ? ` for ${providerId}` : ""}: ${models.length}`)
    return models
  })

  ipcMain.handle("ai:save-key", async (_, providerId: string, key: string) => {
    return saveApiKey(providerId, key)
  })

  ipcMain.handle("ai:remove-key", async (_, providerId: string) => {
    return removeApiKey(providerId)
  })

  ipcMain.handle("ai:get-status", async () => {
    return getProviderStatus()
  })

  ipcMain.handle("session:load", async (_, projectPath: string) => {
    const messages = loadSession(projectPath)
    logger.session(`Loaded: ${path.basename(projectPath)} (${messages.length} messages)`)
    return messages
  })

  ipcMain.handle("session:save", async (_, projectPath: string, messages: ChatMessageData[]) => {
    saveSession(projectPath, messages)
    logger.session(`Saved: ${path.basename(projectPath)} (${messages.length} messages)`)
    return true
  })

  ipcMain.handle("session:delete", async (_, projectPath: string) => {
    deleteSession(projectPath)
    logger.clear(`Session deleted: ${path.basename(projectPath)}`)
    return true
  })

  ipcMain.handle("session:list", async () => {
    const sessions = listSessions()
    logger.session(`List sessions: ${sessions.length} found`)
    return sessions
  })
}

app.whenReady().then(() => {
  logger.lifecycle("App starting...")

  const mode = process.env.QUENZATEX_MODE === "development" || process.env.NODE_ENV === "development"
    ? "development"
    : "production"
  logger.lifecycle(`Mode: ${mode}`)

  registerIpcHandlers()
  createWindow()
  logger.ready("Window created")

  startOpenCode()
  logger.ready("opencode initialized")

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      logger.lifecycle("Reactivated (macOS)")
      createWindow()
    }
  })
})

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    logger.lifecycle("All windows closed, quitting")
    app.quit()
  }
})

ipcMain.on("log:from-renderer", logFromRenderer)
