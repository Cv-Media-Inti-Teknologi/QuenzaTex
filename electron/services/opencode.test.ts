import { describe, it, expect } from "vitest"
import {
  buildPrompt,
  parseCliOutput,
  extractChangedFileNames,
  summarizeChangedFiles,
} from "./opencode"

describe("buildPrompt", () => {
  it("returns the plain message when no options given", () => {
    expect(buildPrompt("hello")).toBe("hello")
  })

  it("includes the project path and file list", () => {
    const out = buildPrompt("do it", {
      projectPath: "C:/proj",
      fileList: "- a.tex\n- b.tex",
    })
    expect(out).toContain("working inside this project: C:/proj")
    expect(out).toContain("Existing files:")
    expect(out).toContain("- a.tex")
    expect(out).toContain("do it")
  })

  it("notes an empty directory when file list is blank", () => {
    const out = buildPrompt("start", { projectPath: "C:/proj", fileList: "" })
    expect(out).toContain("currently empty")
  })

  it("includes recent user context (excluding the current turn) when >1 user msg", () => {
    const out = buildPrompt("latest", {
      projectPath: "C:/p",
      conversationHistory: [
        { role: "user", content: "first" },
        { role: "assistant", content: "reply" },
        { role: "user", content: "second" },
      ],
    })
    expect(out).toContain("Recent context:")
    expect(out).toContain("- first")
    // the last user message is dropped from the context block
    expect(out).not.toContain("- second")
  })

  it("omits recent context when only one user message exists", () => {
    const out = buildPrompt("only", {
      projectPath: "C:/p",
      conversationHistory: [{ role: "user", content: "only" }],
    })
    expect(out).not.toContain("Recent context:")
  })
})

describe("parseCliOutput", () => {
  it("returns fallback when stdout is empty", () => {
    expect(parseCliOutput("", "")).toBe("No response from AI.")
  })

  it("strips ANSI escape codes", () => {
    const out = parseCliOutput("\x1b[32mHello there world\x1b[0m", "")
    expect(out).toBe("Hello there world")
  })

  it("keeps Write tool traces wrapped in backticks", () => {
    const out = parseCliOutput("Write main.tex\nFile created successfully here", "")
    expect(out).toContain("Write main.tex")
  })

  it("drops Read/Edit/Bash tool traces", () => {
    const out = parseCliOutput("Read foo.tex\nThis is the actual answer text", "")
    expect(out).not.toContain("Read foo.tex")
    expect(out).toContain("This is the actual answer text")
  })

  it("keeps normal response lines longer than 8 chars", () => {
    const out = parseCliOutput("This is a normal reply from the model", "")
    expect(out).toContain("This is a normal reply")
  })
})

describe("extractChangedFileNames", () => {
  it("detects a file from a Write tool trace", () => {
    const names = extractChangedFileNames("Write mendoan.tex\nDone", "")
    expect(names).toContain("mendoan.tex")
  })

  it("detects a file from 'Wrote file' phrasing", () => {
    const names = extractChangedFileNames("Wrote file report.tex successfully", "")
    expect(names).toContain("report.tex")
  })

  it("detects an apply_patch add-file marker", () => {
    const names = extractChangedFileNames("*** Add File: chapters/intro.tex", "")
    expect(names).toContain("intro.tex")
  })

  it("detects 'X.tex created' narration (verbose models)", () => {
    const names = extractChangedFileNames("mendoan.tex created with a minimal article", "")
    expect(names).toContain("mendoan.tex")
  })

  it("returns empty when no files are mentioned", () => {
    expect(extractChangedFileNames("just some chatter", "")).toEqual([])
  })

  it("does not duplicate the same file", () => {
    const names = extractChangedFileNames("Write a.tex\na.tex created", "")
    expect(names.filter((n) => n === "a.tex")).toHaveLength(1)
  })
})

describe("summarizeChangedFiles", () => {
  it("returns empty string when nothing changed", () => {
    expect(summarizeChangedFiles([])).toBe("")
  })

  it("summarizes a single file", () => {
    const out = summarizeChangedFiles(["a.tex"])
    expect(out).toContain("Updated file:")
    expect(out).toContain("a.tex")
  })

  it("summarizes multiple files", () => {
    const out = summarizeChangedFiles(["a.tex", "b.tex"])
    expect(out).toContain("Updated files:")
    expect(out).toContain("a.tex")
    expect(out).toContain("b.tex")
  })
})
