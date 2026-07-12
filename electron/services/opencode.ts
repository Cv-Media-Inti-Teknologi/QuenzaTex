import { execSync, spawnSync } from "child_process"
import { existsSync, readdirSync, statSync } from "node:fs"
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

/** File names touched, detected from write/edit/create markers in the output. */
export function extractChangedFileNames(output: string, stderr: string): string[] {
  const text = (output + "\n" + stderr).replace(/\x1b\[[0-9;]*m/g, "")
  const found = new Set<string>()

  // Match tool traces like "Write main.tex", "Wrote file main.tex", apply_patch markers
  const patterns = [
    /(?:Write|Wrote file|Edit|Created|Creating)\s+([^\s`"']+\.[A-Za-z0-9]+)/g,
    /\*\*\*\s*(?:Add|Update) File:\s*([^\s`"']+\.[A-Za-z0-9]+)/g,
    /\b([A-Za-z0-9_\-./\\]+\.tex)\b\s+(?:created|written|saved|updated)/gi,
  ]
  for (const re of patterns) {
    let m: RegExpExecArray | null
    while ((m = re.exec(text)) !== null) {
      const name = m[1].replace(/[.,;:]+$/, "").split(/[/\\]/).pop()
      if (name) found.add(name)
    }
  }
  return Array.from(found)
}

/**
 * Build a concise summary line for file operations so the chat clearly shows
 * what the agent produced (verbose models like GPT bury this in narration).
 */
export function summarizeChangedFiles(fileNames: string[]): string {
  if (fileNames.length === 0) return ""
  const label = fileNames.length === 1 ? "file" : "files"
  return `📝 Updated ${label}: ${fileNames.map((f) => `\`${f}\``).join(", ")}`
}

export interface OpenCodeResult {
  response: string
  changedFiles: string[]
}

/** Snapshot of file name → mtimeMs for the project directory (shallow). */
function snapshotDir(dir: string): Map<string, number> {
  const snap = new Map<string, number>()
  try {
    for (const name of readdirSync(dir)) {
      try {
        const st = statSync(path.join(dir, name))
        if (st.isFile()) snap.set(name, st.mtimeMs)
      } catch {
        // ignore
      }
    }
  } catch {
    // ignore
  }
  return snap
}

/** Files that were created or modified between two snapshots. */
function diffSnapshots(before: Map<string, number>, after: Map<string, number>): string[] {
  const changed: string[] = []
  for (const [name, mtime] of Array.from(after)) {
    const prev = before.get(name)
    if (prev === undefined || mtime > prev) changed.push(name)
  }
  return changed
}

export async function sendOpenCodeMessage(
  message: string,
  options?: {
    projectPath?: string
    fileList?: string
    conversationHistory?: { role: string; content: string }[]
    model?: string
  }
): Promise<OpenCodeResult> {
  if (!checkOpencodeInstalled()) {
    return { response: "OpenCode is not installed. Please set up in Settings.", changedFiles: [] }
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

    const projectDir = options?.projectPath || process.cwd()
    const before = snapshotDir(projectDir)

    try {
      const start = Date.now()
      const result = spawnSync(bin, args, {
        cwd: projectDir,
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
        return {
          response:
            "⚠️ Couldn't reach the AI model — it looks like this model needs credentials.\n\n" +
            "• The free default model may require a free opencode account, or\n" +
            "• The selected provider needs an API key.\n\n" +
            "Open **Settings → AI Provider** (Ctrl+,) to add your API key or switch models.",
          changedFiles: [],
        }
      }

      // Detect changed files via filesystem snapshot (reliable) + output markers.
      const after = snapshotDir(projectDir)
      const changedFiles = Array.from(
        new Set([
          ...diffSnapshots(before, after),
          ...extractChangedFileNames(output, stderr),
        ])
      )
      logger.file(`AI changed ${changedFiles.length} file(s): ${changedFiles.join(", ") || "none"}`)

      let parsed = parseCliOutput(output, stderr)
      const summary = summarizeChangedFiles(changedFiles)
      if (summary) parsed = `${summary}\n\n${parsed}`
      logger.ai(`Parsed response: ${parsed.length}B`)
      return { response: parsed, changedFiles }
    } catch (err: any) {
      logger.error(`CLI failed: ${err.message}`)
      return { response: `Error: ${err.message || "Failed to run opencode CLI."}`, changedFiles: [] }
    }
}

export function setProjectPath(_projectPath: string | null) {
  // No-op: CLI mode uses CWD per-invocation, no server restart needed
}
