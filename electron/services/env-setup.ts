import { execSync, exec } from "node:child_process"
import { existsSync } from "node:fs"
import path from "node:path"

export interface EnvStatus {
  node: { found: boolean; version: string }
  opencode: { found: boolean; version: string }
  texlive: { found: boolean; version: string; latexmk: boolean }
}

function execCmd(cmd: string): string {
  try {
    return execSync(cmd, { encoding: "utf8", timeout: 15000 }).trim()
  } catch {
    return ""
  }
}

export async function checkEnvironment(): Promise<EnvStatus> {
  const nodeVersion = execCmd("node --version")
  const npmVersion = execCmd("npm --version")

  const opencodeVersion = execCmd("opencode --version")
  const opencodeFound = !!opencodeVersion

  const texVersion = execCmd("tex --version")
  const texFound = texVersion.includes("TeX Live") || texVersion.includes("MiKTeX")
  const texLiveVersion = texFound ? texVersion.split("\n")[0] || "" : ""

  const latexmkFound = execCmd("latexmk --version").includes("Latexmk")

  return {
    node: {
      found: !!nodeVersion,
      version: nodeVersion || "not found",
    },
    opencode: {
      found: opencodeFound,
      version: opencodeVersion || "not found",
    },
    texlive: {
      found: texFound,
      version: texLiveVersion || "not found",
      latexmk: latexmkFound,
    },
  }
}

export function getOpencodeConfigPath(): string {
  const home = process.env.USERPROFILE || process.env.HOME || ""
  return path.join(home, ".config", "opencode", "opencode.json")
}

export function readOpencodeConfig(): Record<string, unknown> | null {
  const configPath = getOpencodeConfigPath()
  if (!existsSync(configPath)) return null
  try {
    const content = require("node:fs").readFileSync(configPath, "utf8")
    return JSON.parse(content)
  } catch {
    return null
  }
}

export function writeOpencodeConfig(config: Record<string, unknown>): boolean {
  try {
    const configPath = getOpencodeConfigPath()
    const dir = path.dirname(configPath)
    if (!existsSync(dir)) {
      execSync(`mkdir -p "${dir}"`, { encoding: "utf8" })
    }
    require("node:fs").writeFileSync(configPath, JSON.stringify(config, null, 2), "utf8")
    return true
  } catch {
    return false
  }
}

export async function installOpencode(): Promise<boolean> {
  return new Promise((resolve) => {
    const proc = exec("npm install -g opencode", { encoding: "utf8" })
    proc.on("close", (code) => resolve(code === 0))
    proc.on("error", () => resolve(false))
  })
}
