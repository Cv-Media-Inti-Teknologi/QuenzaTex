import { describe, it, expect } from "vitest"
import { cn } from "./utils"

describe("cn", () => {
  it("merges multiple class strings", () => {
    expect(cn("a", "b")).toBe("a b")
  })

  it("ignores falsy values", () => {
    expect(cn("a", false, null, undefined, "b")).toBe("a b")
  })

  it("resolves conflicting tailwind classes (last wins)", () => {
    expect(cn("p-2", "p-4")).toBe("p-4")
  })

  it("supports conditional object syntax", () => {
    expect(cn("base", { active: true, hidden: false })).toBe("base active")
  })

  it("returns empty string with no args", () => {
    expect(cn()).toBe("")
  })
})
