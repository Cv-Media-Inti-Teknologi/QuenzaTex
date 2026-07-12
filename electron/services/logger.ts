import { appendFileSync, existsSync, mkdirSync, readdirSync, unlinkSync, statSync } from "node:fs"
import path from "node:path"

// ---------------------------------------------------------------------------
// Pure helpers (unit-tested)
// ---------------------------------------------------------------------------

const icons: Record<string, string> = {
  file: "📂",
  save: "💾",
  key: "⌨️",
  ai: "🤖",
  latex: "📄",
  settings: "⚙️",
  session: "🔄",
  panel: "📐",
  clear: "🗑️",
  warn: "⚠️",
  error: "❌",
  lifecycle: "🚀",
  ready: "✅",
  dir: "📁",
  info: "ℹ️",
}

/** Map a category to a text log level for the file (Laravel-style). */
export function levelFor(category: string): "ERROR" | "WARN" | "INFO" {
  if (category === "error") return "ERROR"
  if (category === "warn") return "WARN"
  return "INFO"
}

/** Short console timestamp (HH:MM:SS). */
function consoleTimestamp(d = new Date()): string {
  return d.toLocaleTimeString("en-US", { hour12: false })
}

/** Full timestamp for file lines: YYYY-MM-DD HH:MM:SS. */
export function fileTimestamp(d = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0")
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ` +
    `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  )
}

/** Daily log file name, e.g. quenzatex-2026-07-12.log */
export function dailyLogFileName(d = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0")
  return `quenzatex-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}.log`
}

/** Serialize args into a single log message string. */
export function formatArgs(args: any[]): string {
  return args
    .map((a) => {
      if (typeof a === "string") return a
      if (a instanceof Error) return `${a.name}: ${a.message}${a.stack ? "\n" + a.stack : ""}`
      try {
        return JSON.stringify(a)
      } catch {
        return String(a)
      }
    })
    .join(" ")
}

/** Build a single file log line. */
export function formatLogLine(category: string, args: any[], d = new Date()): string {
  return `[${fileTimestamp(d)}] [${levelFor(category)}] ${formatArgs(args)}`
}

/**
 * Given a list of log file names, return the ones older than `retentionDays`
 * (based on the date encoded in the filename).
 */
export function filesToPrune(fileNames: string[], retentionDays: number, now = new Date()): string[] {
  const cutoff = new Date(now)
  cutoff.setHours(0, 0, 0, 0)
  cutoff.setDate(cutoff.getDate() - retentionDays)

  return fileNames.filter((name) => {
    const m = name.match(/^quenzatex-(\d{4})-(\d{2})-(\d{2})\.log$/)
    if (!m) return false
    const fileDate = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
    return fileDate < cutoff
  })
}

// ---------------------------------------------------------------------------
// File logging state
// ---------------------------------------------------------------------------

const RETENTION_DAYS = 14

let logDir: string | null = null
let fileLoggingEnabled = false

/**
 * Initialize file logging. Call once from the main process at startup.
 * @param dir  directory to write logs into (e.g. userData/logs)
 * @param enable  whether to write to file (typically: production, or always)
 */
export function initLogging(dir: string, enable: boolean) {
  fileLoggingEnabled = enable
  if (!enable) return
  try {
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
    logDir = dir
    pruneOldLogs()
    writeLine(formatLogLine("lifecycle", ["==== Logging started ===="]))
  } catch (err) {
    // Never let logging crash the app
    console.error("Failed to initialize file logging:", err)
    fileLoggingEnabled = false
  }
}

export function getLogDir(): string | null {
  return logDir
}

function currentLogPath(): string | null {
  if (!logDir) return null
  return path.join(logDir, dailyLogFileName())
}

function writeLine(line: string) {
  if (!fileLoggingEnabled || !logDir) return
  const p = currentLogPath()
  if (!p) return
  try {
    appendFileSync(p, line + "\n", "utf-8")
  } catch {
    // ignore write failures (disk full, permissions, etc.)
  }
}

function pruneOldLogs() {
  if (!logDir) return
  try {
    const names = readdirSync(logDir)
    for (const name of filesToPrune(names, RETENTION_DAYS)) {
      try {
        unlinkSync(path.join(logDir, name))
      } catch {
        // ignore
      }
    }
  } catch {
    // ignore
  }
}

// ---------------------------------------------------------------------------
// Emit (console + file)
// ---------------------------------------------------------------------------

function emit(category: string, ...args: any[]) {
  const prefix = icons[category] || "•"
  console.log(`[${consoleTimestamp()}] ${prefix}`, ...args)
  writeLine(formatLogLine(category, args))
}

export const logger = {
  file: (...args: any[]) => emit("file", ...args),
  save: (...args: any[]) => emit("save", ...args),
  key: (...args: any[]) => emit("key", ...args),
  ai: (...args: any[]) => emit("ai", ...args),
  latex: (...args: any[]) => emit("latex", ...args),
  settings: (...args: any[]) => emit("settings", ...args),
  session: (...args: any[]) => emit("session", ...args),
  panel: (...args: any[]) => emit("panel", ...args),
  clear: (...args: any[]) => emit("clear", ...args),
  warn: (...args: any[]) => emit("warn", ...args),
  error: (...args: any[]) => emit("error", ...args),
  lifecycle: (...args: any[]) => emit("lifecycle", ...args),
  ready: (...args: any[]) => emit("ready", ...args),
  dir: (...args: any[]) => emit("dir", ...args),
  info: (...args: any[]) => emit("info", ...args),
}

export function logFromRenderer(_event: any, ...args: any[]) {
  const [icon, ...rest] = args
  if (typeof icon === "string" && icons[icon]) {
    emit(icon, ...rest)
  } else {
    emit("info", ...args)
  }
}
