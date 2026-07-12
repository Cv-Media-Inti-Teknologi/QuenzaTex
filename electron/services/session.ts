import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs"
import path from "node:path"
import { createHash } from "node:crypto"
import { logger } from "./logger"

export interface ChatMessageData {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: string
}

interface SessionData {
  projectPath: string
  lastOpened: string
  messages: ChatMessageData[]
}

interface SessionIndex {
  projects: { path: string; hash: string; lastOpened: string }[]
}

function getSessionsDir(): string {
  const appData = process.env.APPDATA
    || (process.platform === "darwin"
      ? path.join(process.env.HOME || "", "Library", "Application Support")
      : path.join(process.env.HOME || "", ".config"))
  const dir = path.join(appData, "Quenzatex", "sessions")
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
  return dir
}

function getIndexPath(): string {
  return path.join(getSessionsDir(), "index.json")
}

function readIndex(): SessionIndex {
  const indexPath = getIndexPath()
  if (!existsSync(indexPath)) return { projects: [] }
  try {
    return JSON.parse(readFileSync(indexPath, "utf8"))
  } catch {
    return { projects: [] }
  }
}

function writeIndex(index: SessionIndex) {
  writeFileSync(getIndexPath(), JSON.stringify(index, null, 2), "utf8")
}

function hashPath(projectPath: string): string {
  return createHash("sha256").update(projectPath).digest("hex")
}

function sessionFilePath(projectPath: string): string {
  return path.join(getSessionsDir(), `${hashPath(projectPath)}.json`)
}

export function loadSession(projectPath: string): ChatMessageData[] {
  const filePath = sessionFilePath(projectPath)
  if (!existsSync(filePath)) return []
  try {
    const data: SessionData = JSON.parse(readFileSync(filePath, "utf8"))
    return data.messages || []
  } catch {
    return []
  }
}

export function saveSession(projectPath: string, messages: ChatMessageData[]) {
  const filePath = sessionFilePath(projectPath)
  const data: SessionData = {
    projectPath,
    lastOpened: new Date().toISOString(),
    messages,
  }
  writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8")

  const index = readIndex()
  const h = hashPath(projectPath)
  const existing = index.projects.find((p) => p.hash === h)
  if (existing) {
    existing.lastOpened = data.lastOpened
  } else {
    index.projects.push({ path: projectPath, hash: h, lastOpened: data.lastOpened })
  }
  writeIndex(index)
}

export function deleteSession(projectPath: string) {
  const filePath = sessionFilePath(projectPath)
  if (existsSync(filePath)) {
    try {
      const fs = require("node:fs")
      fs.unlinkSync(filePath)
    } catch {}
  }
  const index = readIndex()
  const h = hashPath(projectPath)
  index.projects = index.projects.filter((p) => p.hash !== h)
  writeIndex(index)
}

export function listSessions(): { path: string; lastOpened: string }[] {
  const index = readIndex()
  return index.projects
    .sort((a, b) => new Date(b.lastOpened).getTime() - new Date(a.lastOpened).getTime())
    .map((p) => ({ path: p.path, lastOpened: p.lastOpened }))
}
