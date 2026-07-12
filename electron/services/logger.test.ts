import { describe, it, expect } from "vitest"
import {
  levelFor,
  fileTimestamp,
  dailyLogFileName,
  formatArgs,
  formatLogLine,
  filesToPrune,
} from "./logger"

describe("levelFor", () => {
  it("maps error/warn/info categories", () => {
    expect(levelFor("error")).toBe("ERROR")
    expect(levelFor("warn")).toBe("WARN")
    expect(levelFor("ai")).toBe("INFO")
    expect(levelFor("file")).toBe("INFO")
  })
})

describe("fileTimestamp", () => {
  it("formats a full timestamp", () => {
    const d = new Date(2026, 6, 12, 9, 5, 3) // 2026-07-12 09:05:03
    expect(fileTimestamp(d)).toBe("2026-07-12 09:05:03")
  })
})

describe("dailyLogFileName", () => {
  it("produces a padded daily filename", () => {
    const d = new Date(2026, 0, 5) // 2026-01-05
    expect(dailyLogFileName(d)).toBe("quenzatex-2026-01-05.log")
  })
})

describe("formatArgs", () => {
  it("joins strings", () => {
    expect(formatArgs(["a", "b"])).toBe("a b")
  })

  it("serializes objects as JSON", () => {
    expect(formatArgs([{ x: 1 }])).toBe('{"x":1}')
  })

  it("expands Error with name and message", () => {
    const out = formatArgs([new Error("boom")])
    expect(out).toContain("Error: boom")
  })
})

describe("formatLogLine", () => {
  it("builds a full log line with level and timestamp", () => {
    const d = new Date(2026, 6, 12, 15, 0, 0)
    const line = formatLogLine("error", ["something failed"], d)
    expect(line).toBe("[2026-07-12 15:00:00] [ERROR] something failed")
  })

  it("uses INFO for non-error/warn categories", () => {
    const d = new Date(2026, 6, 12, 15, 0, 0)
    expect(formatLogLine("ai", ["hello"], d)).toContain("[INFO] hello")
  })
})

describe("filesToPrune", () => {
  const now = new Date(2026, 6, 12) // 2026-07-12

  it("prunes files older than the retention window", () => {
    const names = [
      "quenzatex-2026-07-12.log", // today → keep
      "quenzatex-2026-07-01.log", // 11 days old → keep (within 14)
      "quenzatex-2026-06-20.log", // 22 days old → prune
      "quenzatex-2026-06-01.log", // very old → prune
    ]
    const prune = filesToPrune(names, 14, now)
    expect(prune).toContain("quenzatex-2026-06-20.log")
    expect(prune).toContain("quenzatex-2026-06-01.log")
    expect(prune).not.toContain("quenzatex-2026-07-12.log")
    expect(prune).not.toContain("quenzatex-2026-07-01.log")
  })

  it("ignores non-log files", () => {
    const prune = filesToPrune(["index.json", "notes.txt", "quenzatex-bad.log"], 14, now)
    expect(prune).toEqual([])
  })
})
