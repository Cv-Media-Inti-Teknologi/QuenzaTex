import { execSync, spawnSync } from "child_process"
import { existsSync } from "node:fs"
import path from "node:path"
import { logger } from "./logger"

interface OpenCodeStatus {
  running: boolean
  mode: "cli" | "off"
}

let currentStatus: OpenCodeStatus = { running: false, mode: "off" }

// Cache the resolved binary path so we don't re-resolve on every call.
let resolvedBinary: string | null = null

/**
 * Resolve the REAL opencode executable so we can spawn with shell:false.
 *
 * On Windows, the npm-installed `opencode` is a `.ps1`/`.cmd` shim. Spawning
 * the `.cmd` requires shell:true, which re-parses argv through cmd.exe and
 * MANGLES multi-line prompts (newlines, em-dashes, backticks) — the model then
 * receives a broken message and just replies "I'm ready to help".
 *
 * Passing the underlying `opencode.exe` with shell:false hands the prompt to
 * opencode verbatim, which is what makes file creation work reliably.
 */
export function resolveOpenCodeBinary(): string {
  if (resolvedBinary && existsSync(resolvedBinary)) return resolvedBinary

  if (process.platform === "win32") {
    const candidates = [
      // Global npm install location
      process.env.APPDATA &&
        path.join(process.env.APPDATA, "npm", "node_modules", "opencode-ai", "bin", "opencode.exe"),
      // Alternative user-local install
      process.env.LOCALAPPDATA &&
        path.join(process.env.LOCALAPPDATA, "npm", "node_modules", "opencode-ai", "bin", "opencode.exe"),
    ].filter(Boolean) as string[]

    for (const c of candidates) {
      if (existsSync(c)) {
        resolvedBinary = c
        return c
      }
    }

    // Fallback: try to locate via `where opencode.exe`
    try {
      const out = execSync("where opencode.exe", { encoding: "utf-8", timeout: 5000 }).trim()
      const first = out.split(/\r?\n/)[0]?.trim()
      if (first && existsSync(first)) {
        resolvedBinary = first
        return first
      }
    } catch {
      // ignore
    }

    // Last resort: the .cmd shim (will require shell:true fallback)
    resolvedBinary = "opencode.cmd"
    return resolvedBinary
  }

  // Unix: the `opencode` binary on PATH works fine with shell:false
  try {
    const out = execSync("which opencode", { encoding: "utf-8", timeout: 5000 }).trim()
    const first = out.split(/\r?\n/)[0]?.trim()
    if (first && existsSync(first)) {
      resolvedBinary = first
      return first
    }
  } catch {
    // ignore
  }
  resolvedBinary = "opencode"
  return resolvedBinary
}

function checkOpencodeInstalled(): boolean {
  try {
    execSync("opencode --version", { timeout: 5000, encoding: "utf-8" })
    return true
  } catch {
    return false
  }
}

export async function startOpenCode(): Promise<OpenCodeStatus> {
  const installed = checkOpencodeInstalled()
  logger.ai(`Start: ${installed ? "found v" + execSync("opencode --version", { encoding: "utf-8", timeout: 5000 }).trim() : "NOT installed"}`)
  if (installed) {
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

export function buildPrompt(
  message: string,
  options?: {
    projectPath?: string
    fileList?: string
    conversationHistory?: { role: string; content: string }[]
  }
): string {
  // Keep the prompt plain and natural. The prior "CRITICAL / STOP" coercion was
  // never the problem (the free model writes files fine); the shell:true arg
  // mangling was. A clean prompt lets the build agent choose the right tool
  // (Write / Edit / apply_patch / bash) for any intent, not just file creation.
  let prompt = ""

  if (options?.projectPath) {
    prompt += `You are a LaTeX assistant working inside this project: ${options.projectPath}\n`
    if (options.fileList && options.fileList.trim().length > 0) {
      prompt += `Existing files:\n${options.fileList}\n`
    } else {
      prompt += "The project directory is currently empty.\n"
    }
    prompt += "Use your file tools (Write, Edit, Read, apply_patch, bash) to carry out the request directly.\n\n"
  }

  // Include a little recent context (last few user turns) as plain background.
  if (options?.conversationHistory && options.conversationHistory.length > 0) {
    const recent = options.conversationHistory
      .filter((m) => m.role === "user")
      .slice(-3)
      .map((m) => m.content)
    if (recent.length > 1) {
      prompt += "Recent context:\n"
      for (const msg of recent.slice(0, -1)) {
        prompt += `- ${msg}\n`
      }
      prompt += "\n"
    }
  }

  prompt += message

  return prompt
}

export function parseCliOutput(output: string, stderr: string): string {
  const stdoutClean = output.replace(/\x1b\[[0-9;]*m/g, "").trim()
  if (!stdoutClean) return "No response from AI."

  const lines = stdoutClean.split("\n")
  const parts: string[] = []

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue

    const clean = trimmed.replace(/^[←→\s]*/, "")

    if (clean.startsWith("Write ") || clean.startsWith("Wrote file")) {
      parts.push(`\`${clean}\``)
    } else if (clean.startsWith("Read ") || clean.startsWith("Edit ") ||
               clean.startsWith("Bash ") || clean.startsWith("Glob ") ||
               clean.startsWith("Grep ")) {
      continue
    } else if (clean.startsWith("File") && clean.includes("error")) {
      parts.push(clean)
    } else if (clean.length > 8) {
      parts.push(clean)
    }
  }

  return parts.length > 0 ? parts.join("\n") : stdoutClean
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
    const bin = resolveOpenCodeBinary()
    // Use shell only as a last-resort fallback when we couldn't resolve the
    // real executable (i.e. we fell back to the .cmd shim). Resolving the .exe
    // lets us pass the multi-line prompt verbatim with shell:false.
    const needsShell = bin.endsWith(".cmd")

    // Default to the free bundled model + build agent (all tools enabled) so
    // file operations are reliable.
    const model =
      options?.model && options.model !== "default"
        ? options.model
        : "opencode/deepseek-v4-flash-free"

    const args = [
      "run",
      "--auto",
      "--print-logs",
      "--agent",
      "build",
      "--model",
      model,
      prompt,
    ]

    logger.ai(`CLI: ${bin} run --auto --agent build --model ${model} (prompt: ${prompt.length}B, shell:${needsShell})`)
    logger.ai(`PROMPT CONTENT:\n${prompt.slice(0, 2000)}`)

    try {
      const start = Date.now()
      const result = spawnSync(bin, args, {
        cwd: options?.projectPath || process.cwd(),
        shell: needsShell,
        timeout: 180000,
        encoding: "utf-8" as const,
        maxBuffer: 1024 * 1024 * 20,
      })
      const duration = Date.now() - start

      const output = result.stdout || ""
      const stderr = result.stderr || ""

      logger.ai(`CLI done (${duration}ms): stdout ${output.length}B, stderr ${stderr.length}B`)
      if (stderr.length > 0) logger.ai(`CLI stderr: ${stderr.slice(0, 1000)}`)
      if (output.length > 0) logger.ai(`CLI stdout (raw): ${output.slice(0, 1000)}`)

      if (result.error) {
        const errAny = result.error as NodeJS.ErrnoException
        logger.error(`CLI spawn error: ${errAny.code}`, errAny.message)
        throw result.error
      }

      // Detect auth/credential failures (e.g. free Zen model needs an account,
      // or a chosen provider has no API key) and return a friendly hint.
      const authProblem =
        /unauthor|api[\s_-]?key|not\s+authenticated|no\s+credentials|ProviderAuth|401|forbidden|please\s+sign\s+in|auth\s+error/i
      if (authProblem.test(stderr) || authProblem.test(output)) {
        logger.warn("AI auth problem detected in output")
        return (
          "⚠️ Couldn't reach the AI model — it looks like this model needs credentials.\n\n" +
          "• The free default model may require a free opencode account, or\n" +
          "• The selected provider needs an API key.\n\n" +
          "Open **Settings → AI Provider** (Ctrl+,) to add your API key or switch models."
        )
      }

      const parsed = parseCliOutput(output, stderr)
      logger.ai(`Parsed response: ${parsed.length}B`)
      return parsed
    } catch (err: any) {
      logger.error(`CLI failed: ${err.message}`)
      return `Error: ${err.message || "Failed to run opencode CLI."}`
    }
}

export function setProjectPath(_projectPath: string | null) {
  // No-op: CLI mode uses CWD per-invocation, no server restart needed
}
