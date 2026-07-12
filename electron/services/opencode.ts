import { spawn, execSync } from "child_process"
import { createServer } from "net"
import http from "http"
import path from "path"

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

async function findFreePort(): Promise<number> {
  return new Promise((resolve) => {
    const server = createServer()
    server.listen(0, "127.0.0.1", () => {
      const port = (server.address() as any).port
      server.close(() => resolve(port))
    })
  })
}

async function startHttpServer(): Promise<boolean> {
  if (!checkOpencodeInstalled()) return false

  const port = await findFreePort()

  return new Promise((resolve) => {
    const proc = spawn(
      "opencode",
      [
        "serve",
        "--port", String(port),
        "--hostname", "127.0.0.1",
        "--config", JSON.stringify({
          permissions: {
            read: "allow",
            write: "allow",
            edit: "allow",
            apply_patch: "allow",
            bash: "allow",
            grep: "allow",
            glob: "allow",
          },
        }),
      ],
      {
        stdio: ["ignore", "pipe", "pipe"],
        shell: true,
      }
    )

    let started = false

    const checkStarted = (data: Buffer) => {
      const text = data.toString()
      if (!started && (text.includes("listening") || text.includes("Server"))) {
        started = true
        serverProcess = proc
        currentStatus = { running: true, mode: "http", port }
        resolve(true)
      }
    }

    proc.stdout?.on("data", checkStarted)
    proc.stderr?.on("data", checkStarted)

    proc.on("error", () => {
      if (!started) resolve(false)
    })

    proc.on("exit", () => {
      if (!started) resolve(false)
      serverProcess = null
      currentStatus = { running: false, mode: "off", port: 0 }
    })

    setTimeout(() => {
      if (!started) {
        proc.kill()
        resolve(false)
      }
    }, 10000)
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
  let context = `Project: ${projectPath}\n`
  if (fileList) {
    context += `Files:\n${fileList}`
  }
  return context
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
        text: `[System Context - this is the active project]\n${systemMsg}\n\n---\n\n`,
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
    prompt += `Project directory: ${projectContext.projectPath}\n`
    if (projectContext.fileList) {
      prompt += `Project files:\n${projectContext.fileList}\n`
    }
    prompt += "\n---\n\n"
  }
  prompt += message

  const escaped = prompt.replace(/"/g, '\\"')

  try {
    const output = execSync(
      `opencode run "${escaped}"`,
      { timeout: 120000, encoding: "utf-8" }
    )
    return output.trim()
  } catch (err: any) {
    return err.stdout?.trim() || err.message || "Failed to run opencode CLI."
  }
}

export function setProjectPath(projectPath: string | null) {
  currentProjectPath = projectPath
  if (currentStatus.mode === "http") {
    activeSessionId = null
  }
}

export async function startOpenCode(): Promise<OpenCodeStatus> {
  const httpOk = await startHttpServer()
  if (httpOk) return currentStatus

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
