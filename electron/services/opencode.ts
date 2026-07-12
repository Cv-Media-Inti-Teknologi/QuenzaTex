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

function checkOpencodeInstalled(): boolean {
  try {
    execSync("opencode --version", { timeout: 5000, encoding: "utf-8" })
    return true
  } catch {
    return false
  }
}

function getOpenCodeCmd(): string {
  return process.platform === "win32" ? "opencode.cmd" : "opencode"
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
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "quenzatex-"))
  const configPath = path.join(tmpDir, "opencode.json")
  try {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), "utf8")
    return configPath
  } catch {
    return null
  }
}

async function startHttpServer(projectDir?: string): Promise<boolean> {
  if (!checkOpencodeInstalled()) return false

  const port = await findFreePort()
  const configPath = writeTempConfig()
  if (!configPath) return false

  return new Promise((resolve) => {
    const cwd = projectDir || process.cwd()
    const cmd = getOpenCodeCmd()

    const args = [
      "serve",
      "--port", String(port),
      "--hostname", "127.0.0.1",
      "--config", configPath,
    ]

    const proc = spawn(cmd, args, {
      cwd,
      stdio: ["ignore", "pipe", "pipe"],
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
        resolve(true)
      }
    }

    proc.stdout?.on("data", checkStarted)
    proc.stderr?.on("data", checkStarted)

    proc.on("error", (err) => {
      console.error("opencode serve error:", err.message)
      if (!started) resolve(false)
    })

    proc.on("exit", (code) => {
      if (!started) {
        console.error("opencode serve exited with code", code, "stderr:", errorData)
        resolve(false)
      }
      serverProcess = null
      currentStatus = { running: false, mode: "off", port: 0 }
    })

    setTimeout(() => {
      if (!started) {
        console.error("opencode serve timeout. stderr:", errorData)
        proc.kill()
        resolve(false)
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
  } catch {
    return "Cannot connect to OpenCode server."
  }

  try {
    if (!activeSessionId) {
      const session = await httpRequest("POST", `${baseUrl}/session`, {})
      activeSessionId = session.id
    }

    const parts: any[] = []

    if (projectContext) {
      const systemMsg = buildProjectContext(
        projectContext.projectPath,
        projectContext.fileList
      )
      parts.push({
        type: "text",
        text: `[SYSTEM CONTEXT - PROJECT DIRECTORY]\n${systemMsg}\n---\n\n`,
      })
    }

    parts.push({ type: "text", text: message })

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
      `opencode run "${prompt.replace(/"/g, '\\"')}"`,
      { cwd: projectContext?.projectPath || process.cwd(), timeout: 120000, encoding: "utf-8" }
    )
    return output.trim()
  } catch (err: any) {
    return err.stdout?.trim() || err.message || "Failed to run opencode CLI."
  }
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
      // In CLI mode, just update the path — CLI picks up cwd on each call
      console.log(`Project changed to ${projectPath} (CLI mode)`)
    }
  }
}

export async function startOpenCode(projectDir?: string): Promise<OpenCodeStatus> {
  if (projectDir) {
    currentProjectPath = projectDir
  }

  const httpOk = await startHttpServer(currentProjectPath || undefined)
  if (httpOk) {
    console.log(`Opencode HTTP server started on port ${currentStatus.port}`)
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
