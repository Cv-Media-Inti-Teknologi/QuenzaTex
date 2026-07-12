import { execSync, spawnSync } from "child_process"

interface OpenCodeStatus {
  running: boolean
  mode: "cli" | "off"
}

let currentStatus: OpenCodeStatus = { running: false, mode: "off" }

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

export async function startOpenCode(): Promise<OpenCodeStatus> {
  if (checkOpencodeInstalled()) {
    currentStatus = { running: true, mode: "cli" }
  } else {
    currentStatus = { running: false, mode: "off" }
  }
  return currentStatus
}

export function stopOpenCode() {
  currentStatus = { running: false, mode: "off" }
}

export function getOpenCodeStatus(): OpenCodeStatus {
  return currentStatus
}

export function isOpenCodeInstalled(): boolean {
  return checkOpencodeInstalled()
}

function buildPrompt(
  message: string,
  options?: {
    projectPath?: string
    fileList?: string
    conversationHistory?: { role: string; content: string }[]
  }
): string {
  let prompt = ""

  if (options?.projectPath) {
    prompt += `You are working inside this project directory: ${options.projectPath}\n`
    prompt += `ALL file operations (create, read, edit, delete) MUST use absolute paths under this directory.\n`
    if (options.fileList) {
      prompt += `\nExisting project files:\n${options.fileList}\n`
    }
    prompt += "\n---\n\n"
  }

  if (options?.conversationHistory && options.conversationHistory.length > 0) {
    prompt += "[Previous conversation]\n"
    for (const msg of options.conversationHistory) {
      const role = msg.role === "user" ? "User" : "You"
      prompt += `${role}: ${msg.content}\n\n`
    }
    prompt += "---\n\n"
  }

  prompt += `User: ${message}`

  return prompt
}

function parseCliOutput(output: string, stderr: string): string {
  const combined = output + "\n" + stderr
  const lines = combined.split("\n")

  const responseLines: string[] = []
  let inResponse = false

  for (const line of lines) {
    const trimmed = line.trim()

    if (!inResponse && (trimmed.startsWith("←") || trimmed.includes("Wrote file") || trimmed.includes("Done."))) {
      inResponse = true
    }

    if (inResponse) {
      const clean = trimmed.replace(/^[\s←→]*\s*/, "")
      if (clean) responseLines.push(clean)
    }
  }

  if (responseLines.length > 0) return responseLines.join("\n")

  const noAnsi = output.replace(/\x1b\[[0-9;]*m/g, "").trim()
  const noPrefix = noAnsi.replace(/^.*?>\s*build\s*·\s*.*?\s*/, "").trim()
  return noPrefix || "No response from AI."
}

export async function sendOpenCodeMessage(
  message: string,
  options?: {
    projectPath?: string
    fileList?: string
    conversationHistory?: { role: string; content: string }[]
    model?: string
  }
): Promise<string> {
  if (!checkOpencodeInstalled()) {
    return "OpenCode is not installed. Please set up in Settings."
  }

  const prompt = buildPrompt(message, options)
  const cmd = getOpenCodeCmd()
  const args = ["run", "--auto"]
  if (options?.model && options.model !== "default") {
    args.push("--model", options.model)
  }
  args.push(prompt)

  try {
    const result = spawnSync(cmd, args, {
      cwd: options?.projectPath || process.cwd(),
      timeout: 120000,
      encoding: "utf-8" as const,
      maxBuffer: 10 * 1024 * 1024,
    })

    const output = result.stdout || ""
    const stderr = result.stderr || ""

    if (result.error) {
      throw result.error
    }

    return parseCliOutput(output, stderr)
  } catch (err: any) {
    return `Error: ${err.message || "Failed to run opencode CLI."}`
  }
}

export function setProjectPath(_projectPath: string | null) {
  // No-op: CLI mode uses CWD per-invocation, no server restart needed
}
