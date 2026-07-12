import { execSync, spawn } from "child_process"
import path from "path"
import fs from "fs"
import { logger } from "./logger"

function getLatexmkPath(): string | null {
  try {
    const result = execSync("where latexmk 2>nul || which latexmk 2>/dev/null", {
      encoding: "utf-8",
      timeout: 5000,
    })
    return result.trim().split("\n")[0] || null
  } catch {
    return null
  }
}

interface CompileResult {
  success: boolean
  output: string
  pdfPath: string | null
  errors: { line: number; message: string }[]
}

export function checkLatexInstallation(): boolean {
  return getLatexmkPath() !== null
}

export function compileLatex(filePath: string): CompileResult {
  const latexmk = getLatexmkPath()
  if (!latexmk) {
    logger.error(`latexmk not found for: ${filePath}`)
    return {
      success: false,
      output: "latexmk not found. Please install TeX Live.",
      pdfPath: null,
      errors: [{ line: 0, message: "latexmk not found" }],
    }
  }

  const dir = path.dirname(filePath)
  const baseName = path.basename(filePath, ".tex")

  try {
    const output = execSync(
      `"${latexmk}" -pdf -interaction=nonstopmode -halt-on-error "${filePath}"`,
      {
        cwd: dir,
        timeout: 60000,
        encoding: "utf-8",
      }
    )

    const pdfPath = path.join(dir, `${baseName}.pdf`)
    const hasPdf = fs.existsSync(pdfPath)

    return {
      success: hasPdf,
      output,
      pdfPath: hasPdf ? pdfPath : null,
      errors: parseLatexErrors(output),
    }
  } catch (err: any) {
    const output = err.stdout || err.stderr || String(err)
    const pdfPath = path.join(dir, `${baseName}.pdf`)
    const hasPdf = fs.existsSync(pdfPath)

    return {
      success: hasPdf,
      output,
      pdfPath: hasPdf ? pdfPath : null,
      errors: parseLatexErrors(output),
    }
  }
}

export function startLatexWatch(
  filePath: string,
  onCompile: (result: CompileResult) => void
) {
  const latexmk = getLatexmkPath()
  if (!latexmk) {
    onCompile({
      success: false,
      output: "latexmk not found",
      pdfPath: null,
      errors: [{ line: 0, message: "latexmk not found" }],
    })
    return null
  }

  const dir = path.dirname(filePath)

  const child = spawn(latexmk, [
    "-pvc",
    "-pdf",
    "-interaction=nonstopmode",
    filePath,
  ], {
    cwd: dir,
    stdio: ["ignore", "pipe", "pipe"],
  })

  let buffer = ""

  child.stdout?.on("data", (data: Buffer) => {
    buffer += data.toString()
  })

  child.stderr?.on("data", (data: Buffer) => {
    buffer += data.toString()
  })

  // Poll for PDF changes
  const baseName = path.basename(filePath, ".tex")
  const pdfPath = path.join(dir, `${baseName}.pdf`)
  let lastMtime = 0

  const watcher = setInterval(() => {
    try {
      if (fs.existsSync(pdfPath)) {
        const stat = fs.statSync(pdfPath)
        if (stat.mtimeMs > lastMtime) {
          lastMtime = stat.mtimeMs
          onCompile({
            success: true,
            output: buffer,
            pdfPath,
            errors: parseLatexErrors(buffer),
          })
          buffer = ""
        }
      }
    } catch {
      // ignore
    }
  }, 1000)

  return {
    stop: () => {
      child.kill()
      clearInterval(watcher)
    },
  }
}

export function parseLatexErrors(output: string): { line: number; message: string }[] {
  const errors: { line: number; message: string }[] = []
  const regex = /^l\.(\d+)\s+(.+)$/gm
  let match
  while ((match = regex.exec(output)) !== null) {
    errors.push({
      line: parseInt(match[1], 10),
      message: match[2].trim(),
    })
  }
  return errors
}
