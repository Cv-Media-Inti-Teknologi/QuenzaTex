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

function emit(icon: string, ...args: any[]) {
  const t = timestamp()
  const prefix = icons[icon] || "•"
  console.log(`[${t}] ${prefix}`, ...args)
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
