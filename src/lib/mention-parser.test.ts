import { describe, it, expect } from "vitest"
import { parseMentions, buildPromptWithContext } from "./mention-parser"

describe("parseMentions", () => {
  it("returns empty array when there are no mentions", () => {
    expect(parseMentions("hello world")).toEqual([])
  })

  it("parses a single @file mention with extension", () => {
    const result = parseMentions("please edit @main.tex now")
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe("main.tex")
    expect(result[0].fullMatch).toBe("@main.tex")
    expect(result[0].path).toBeNull()
  })

  it("parses multiple mentions", () => {
    const result = parseMentions("compare @a.tex and @b.bib")
    expect(result.map((m) => m.name)).toEqual(["a.tex", "b.bib"])
  })

  it("does NOT match a mention without an extension", () => {
    expect(parseMentions("mention @folder here")).toEqual([])
  })

  it("matches paths with slashes", () => {
    const result = parseMentions("see @chapters/intro.tex")
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe("chapters/intro.tex")
  })

  it("records the index of each mention", () => {
    const result = parseMentions("x @a.tex")
    expect(result[0].index).toBe(2)
  })
})

describe("buildPromptWithContext", () => {
  it("returns the message unchanged when there are no file contexts", () => {
    expect(buildPromptWithContext("hi", [])).toBe("hi")
  })

  it("injects a single file context before the user request", () => {
    const out = buildPromptWithContext("summarize", [
      { path: "a.tex", content: "\\section{A}" },
    ])
    expect(out).toContain("[File: a.tex]")
    expect(out).toContain("\\section{A}")
    expect(out).toContain("User request:\nsummarize")
    // context comes before the request
    expect(out.indexOf("[File: a.tex]")).toBeLessThan(out.indexOf("User request:"))
  })

  it("joins multiple file contexts", () => {
    const out = buildPromptWithContext("do it", [
      { path: "a.tex", content: "AAA" },
      { path: "b.tex", content: "BBB" },
    ])
    expect(out).toContain("[File: a.tex]")
    expect(out).toContain("[File: b.tex]")
    expect(out).toContain("AAA")
    expect(out).toContain("BBB")
  })
})
