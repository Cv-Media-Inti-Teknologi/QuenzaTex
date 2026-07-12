import { describe, it, expect } from "vitest"
import { parseLatexErrors } from "./latex"

describe("parseLatexErrors", () => {
  it("returns empty array for clean output", () => {
    expect(parseLatexErrors("This is a happy compile.\nDone.")).toEqual([])
  })

  it("parses a single l.<num> error line", () => {
    const out = "! Undefined control sequence.\nl.12 \\badcommand"
    const errors = parseLatexErrors(out)
    expect(errors).toHaveLength(1)
    expect(errors[0]).toEqual({ line: 12, message: "\\badcommand" })
  })

  it("parses multiple error lines", () => {
    const out = [
      "l.3 first error",
      "some noise",
      "l.42 second error",
    ].join("\n")
    const errors = parseLatexErrors(out)
    expect(errors).toEqual([
      { line: 3, message: "first error" },
      { line: 42, message: "second error" },
    ])
  })

  it("trims trailing whitespace in the message", () => {
    const errors = parseLatexErrors("l.5 spaced message   ")
    expect(errors[0].message).toBe("spaced message")
  })

  it("returns empty array for empty input", () => {
    expect(parseLatexErrors("")).toEqual([])
  })
})
