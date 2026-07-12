import { spawn, execSync } from "child_process"
import { createServer } from "net"
import http from "http"
import path from "path"
import fs from "fs"
import os from "os"

interface OpenCodeStatus {
  running: boolean
  mode: "http" | "cli" | "off"
  port: number
}

let serverProcess: ReturnType<typeof spawn> | null = null
let currentStatus: OpenCodeStatus = { running: false, mode: "off", port: 0 }
let activeSessionId: string | null = null
let currentProjectPath: string | null = null
let tempConfigDirs: string[] = []

function checkOpencodeInstalled(): boolean {
  try {
    execSync("opencode --version", { timeout: 5000, encoding: "utf-8" })
    return true
  } catch {
    return false
  }
}

async function findFreePort(): Promise<number> {
  return new Promise((resolve) => {
    const server = createServer()
    server.listen(0, "127.0.0.1", () => {
      const port = (server.address() as any).port
      server.close(() => resolve(port))
    })
  })
}

function writeTempConfig(): string | null {
  const config = {
    permissions: {
      read: "allow",
      write: "allow",
      edit: "allow",
      apply_patch: "allow",
      bash: "allow",
      grep: "allow",
      glob: "allow",
    },
  }
  try {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "quenzatex-"))
    tempConfigDirs.push(tmpDir)
    const configPath = path.join(tmpDir, "opencode.json")
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), "utf8")
    return configPath
  } catch {
    return null
  }
}

function cleanTempConfigs() {
  for (const dir of tempConfigDirs) {
    try {
      const configPath = path.join(dir, "opencode.json")
      if (fs.existsSync(configPath)) fs.unlinkSync(configPath)
      if (fs.existsSync(dir)) fs.rmdirSync(dir)
    } catch {}
  }
  tempConfigDirs = []
}

const MAX_START_RETRIES = 3

async function startHttpServer(projectDir?: string, retries = MAX_START_RETRIES): Promise<boolean> {
  if (!checkOpencodeInstalled()) return false

  const port = await findFreePort()
  const configPath = writeTempConfig()
  if (!configPath) return false

  return new Promise((resolve) => {
    const cwd = projectDir || process.cwd()
    const cmd = process.platform === "win32" ? "opencode.cmd" : "opencode"

    const args = [
      "serve",
      "--port", String(port),
      "--hostname", "127.0.0.1",
    ]

    console.log(`Starting opencode serve on port ${port}, cwd: ${cwd}, config: ${configPath}`)

    const proc = spawn(cmd, args, {
      cwd,
      shell: process.platform === "win32",
      stdio: ["ignore", "pipe", "pipe"],
      env: {
        ...process.env,
        OPENCODE_CONFIG: configPath,
      },
    })

    let started = false
    let errorData = ""

    const checkStarted = (data: Buffer) => {
      const text = data.toString()
      errorData += text
      if (!started && (text.includes("listening") || text.includes("Server") || text.includes("started"))) {
        started = true
        serverProcess = proc
        currentStatus = { running: true, mode: "http", port }
        console.log(`Opencode server is listening on http://127.0.0.1:${port}`)
        resolve(true)
      }
    }

    proc.stdout?.on("data", checkStarted)
    proc.stderr?.on("data", checkStarted)

    proc.on("error", (err) => {
      console.error("opencode serve spawn error:", err.message)
      if (!started) resolve(false)
    })

    proc.on("exit", (code) => {
      if (!started) {
        console.error(`opencode serve exited (code ${code}) on port ${port}. stderr:`, errorData.slice(0, 500))

        if (retries > 0) {
          console.log(`Retrying opencode serve... (${retries} attempts left)`)
          cleanTempConfigs()
          startHttpServer(projectDir, retries - 1).then(resolve)
        } else {
          resolve(false)
        }
      }
      serverProcess = null
      currentStatus = { running: false, mode: "off", port: 0 }
    })

    setTimeout(() => {
      if (!started) {
        console.error(`opencode serve timeout on port ${port}. stderr:`, errorData.slice(0, 500))
        proc.kill()
        if (retries > 0) {
          console.log(`Retrying opencode serve with new port... (${retries} attempts left)`)
          cleanTempConfigs()
          startHttpServer(projectDir, retries - 1).then(resolve)
        } else {
          resolve(false)
        }
      }
    }, 15000)
  })
}

function httpRequest(
  method: string,
  url: string,
  body?: any
): Promise<any> {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url)
    const options: http.RequestOptions = {
      hostname: urlObj.hostname,
      port: parseInt(urlObj.port, 10),
      path: urlObj.pathname + urlObj.search,
      method,
      headers: {
        "Content-Type": "application/json",
      },
      timeout: 60000,
    }

    const req = http.request(options, (res) => {
      let data = ""
      res.on("data", (chunk) => (data += chunk))
      res.on("end", () => {
        try {
          resolve(JSON.parse(data))
        } catch {
          resolve(data)
        }
      })
    })

    req.on("error", reject)
    req.on("timeout", () => {
      req.destroy()
      reject(new Error("Request timeout"))
    })

    if (body) req.write(JSON.stringify(body))
    req.end()
  })
}

function buildProjectContext(projectPath: string, fileList?: string): string {
  let ctx = `You are working inside this project directory: ${projectPath}\n`
  ctx += `ALL file operations (create, read, edit, delete) MUST use absolute paths under this directory.\n`
  ctx += `When the user asks you to create a file, always create it inside this directory.\n`
  if (fileList) {
    ctx += `\nExisting project files:\n${fileList}\n`
  }
  return ctx
}

async function sendViaHttp(
  message: string,
  projectContext?: { projectPath: string; fileList?: string }
): Promise<string> {
  if (!currentStatus.running || currentStatus.mode !== "http") {
    return "OpenCode server is not running."
  }

  const baseUrl = `http://127.0.0.1:${currentStatus.port}`

  try {
    const health = await httpRequest("GET", `${baseUrl}/global/health`)
    if (!health?.healthy) return "OpenCode server is not healthy."
  } catch (err) {
    return `Cannot connect to OpenCode server: ${err}`
  }

  try {
    if (!activeSessionId) {
      const session = await httpRequest("POST", `${baseUrl}/session`, {})
      activeSessionId = session.id
      console.log(`Created opencode session: ${activeSessionId}`)
    }

    const parts: any[] = []

    if (projectContext) {
      const systemMsg = buildProjectContext(
        projectContext.projectPath,
        projectContext.fileList
      )
      parts.push({
        type: "text",
        text: `[SYSTEM CONTEXT]\n${systemMsg}\n---\n\n`,
      })
    }

    parts.push({ type: "text", text: message })

    console.log(`Sending message to opencode session ${activeSessionId}...`)
    const response = await httpRequest(
      "POST",
      `${baseUrl}/session/${activeSessionId}/message`,
      { parts }
    )

    const textParts = (response.parts || [])
      .filter((p: any) => p.type === "text")
      .map((p: any) => p.text)
      .join("\n")

    return textParts || "No response from AI."
  } catch (err: any) {
    return `Error communicating with OpenCode: ${err.message}`
  }
}

async function sendViaCli(
  message: string,
  projectContext?: { projectPath: string; fileList?: string }
): Promise<string> {
  if (!checkOpencodeInstalled()) {
    return "OpenCode is not installed."
  }

  let prompt = ""
  if (projectContext) {
    prompt += `You are working inside this project directory: ${projectContext.projectPath}\n`
    prompt += `ALL file operations MUST use absolute paths under this directory.\n`
    if (projectContext.fileList) {
      prompt += `\nExisting project files:\n${projectContext.fileList}\n`
    }
    prompt += "\n---\n\n"
  }
  prompt += message

  try {
    const output = execSync(
      `"${getOpenCodeCmd()}" run "${prompt.replace(/"/g, '\\"')}"`,
      { cwd: projectContext?.projectPath || process.cwd(), timeout: 120000, encoding: "utf-8" }
    )
    return output.trim()
  } catch (err: any) {
    return err.stdout?.trim() || err.message || "Failed to run opencode CLI."
  }
}

function getOpenCodeCmd(): string {
  return process.platform === "win32" ? "opencode.cmd" : "opencode"
}

export async function setProjectPath(projectPath: string | null) {
  const changed = projectPath !== currentProjectPath
  currentProjectPath = projectPath
  activeSessionId = null

  if (changed && projectPath) {
    if (currentStatus.mode === "http") {
      console.log(`Project changed to ${projectPath}, restarting opencode server...`)
      stopOpenCode()
      const ok = await startHttpServer(projectPath)
      console.log(`Opencode server restart: ${ok ? "OK" : "FAILED"}, mode: ${currentStatus.mode}`)
    } else {
      console.log(`Project changed to ${projectPath} (CLI mode)`)
    }
  }
}

export async function startOpenCode(projectDir?: string): Promise<OpenCodeStatus> {
  if (projectDir) currentProjectPath = projectDir

  console.log("Starting opencode HTTP server...")
  const httpOk = await startHttpServer(currentProjectPath || undefined)

  if (httpOk) {
    console.log(`Opencode HTTP server running on port ${currentStatus.port}`)
    return currentStatus
  }

  console.log("Opencode HTTP server failed, falling back to CLI mode")
  if (checkOpencodeInstalled()) {
    currentStatus = { running: true, mode: "cli", port: 0 }
  } else {
    currentStatus = { running: false, mode: "off", port: 0 }
  }

  return currentStatus
}

export function stopOpenCode() {
  if (serverProcess) {
    serverProcess.kill()
    serverProcess = null
  }
  currentStatus = { running: false, mode: "off", port: 0 }
  activeSessionId = null
  cleanTempConfigs()
}

export function getOpenCodeStatus(): OpenCodeStatus {
  return currentStatus
}

export async function sendOpenCodeMessage(
  message: string,
  projectContext?: { projectPath: string; fileList?: string }
): Promise<string> {
  if (currentStatus.mode === "http") {
    return sendViaHttp(message, projectContext)
  }
  if (currentStatus.mode === "cli") {
    return sendViaCli(message, projectContext)
  }
  return "OpenCode is not configured. Please set up in Settings."
}

export function isOpenCodeInstalled(): boolean {
  return checkOpencodeInstalled()
}
