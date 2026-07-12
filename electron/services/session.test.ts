import { describe, it, expect, vi, beforeEach } from "vitest"

const files = new Map<string, string>()

vi.mock("node:fs", () => ({
  existsSync: (p: string) => files.has(p),
  readFileSync: (p: string) => {
    if (!files.has(p)) throw new Error("ENOENT")
    return files.get(p)!
  },
  writeFileSync: (p: string, data: string) => {
    files.set(p, data)
  },
  mkdirSync: () => undefined,
  unlinkSync: (p: string) => {
    files.delete(p)
  },
}))

process.env.APPDATA = "C:/fake/appdata"

import { loadSession, saveSession, listSessions, deleteSession } from "./session"

const MSG = [
  { id: "1", role: "user" as const, content: "hi", timestamp: "2026-01-01T00:00:00Z" },
]

beforeEach(() => {
  files.clear()
})

describe("session persistence", () => {
  it("returns empty array when no session exists", () => {
    expect(loadSession("C:/proj")).toEqual([])
  })

  it("saves and loads a session round-trip", () => {
    saveSession("C:/proj", MSG)
    expect(loadSession("C:/proj")).toEqual(MSG)
  })

  it("maps the same project path to the same file (stable hashing)", () => {
    saveSession("C:/proj", MSG)
    const keysAfterFirst = Array.from(files.keys()).filter((k) => k.endsWith(".json") && !k.endsWith("index.json"))
    saveSession("C:/proj", [
      { id: "2", role: "assistant", content: "yo", timestamp: "2026-01-02T00:00:00Z" },
    ])
    const keysAfterSecond = Array.from(files.keys()).filter((k) => k.endsWith(".json") && !k.endsWith("index.json"))
    expect(keysAfterSecond).toEqual(keysAfterFirst) // same file, overwritten
  })

  it("records the project in the index", () => {
    saveSession("C:/proj", MSG)
    const list = listSessions()
    expect(list.map((s) => s.path)).toContain("C:/proj")
  })

  it("does not duplicate index entries on repeated saves", () => {
    saveSession("C:/proj", MSG)
    saveSession("C:/proj", MSG)
    expect(listSessions().filter((s) => s.path === "C:/proj")).toHaveLength(1)
  })

  it("deletes a session and removes it from the index", () => {
    saveSession("C:/proj", MSG)
    deleteSession("C:/proj")
    expect(loadSession("C:/proj")).toEqual([])
    expect(listSessions().map((s) => s.path)).not.toContain("C:/proj")
  })

  it("sorts sessions by most recently opened", () => {
    const spy = vi.spyOn(Date.prototype, "toISOString")
    spy.mockReturnValueOnce("2026-01-01T00:00:00.000Z") // C:/old
    saveSession("C:/old", MSG)
    spy.mockReturnValueOnce("2026-06-01T00:00:00.000Z") // C:/new (later)
    saveSession("C:/new", MSG)
    spy.mockRestore()
    const list = listSessions()
    // most recent save should come first
    expect(list[0].path).toBe("C:/new")
  })
})
