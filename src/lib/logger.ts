function timestamp(): string {
  const d = new Date()
  return d.toLocaleTimeString("en-US", { hour12: false })
}

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

function log(icon: string, ...args: any[]) {
  const t = timestamp()
  const prefix = icons[icon] || "•"
  console.log(`[${t}] ${prefix}`, ...args)

  try {
    ;(window as any).electronAPI?.logFromRenderer?.(icon, ...args)
  } catch {}
}

export const logger = {
  file: (...args: any[]) => log("file", ...args),
  save: (...args: any[]) => log("save", ...args),
  key: (...args: any[]) => log("key", ...args),
  ai: (...args: any[]) => log("ai", ...args),
  latex: (...args: any[]) => log("latex", ...args),
  settings: (...args: any[]) => log("settings", ...args),
  session: (...args: any[]) => log("session", ...args),
  panel: (...args: any[]) => log("panel", ...args),
  clear: (...args: any[]) => log("clear", ...args),
  warn: (...args: any[]) => log("warn", ...args),
  error: (...args: any[]) => log("error", ...args),
  lifecycle: (...args: any[]) => log("lifecycle", ...args),
  ready: (...args: any[]) => log("ready", ...args),
  dir: (...args: any[]) => log("dir", ...args),
  info: (...args: any[]) => log("info", ...args),
}
