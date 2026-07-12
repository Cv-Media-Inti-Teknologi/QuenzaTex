# Quenzatex — Agent Mode & Session Persistence

> Adding AI agent capabilities (file create/edit/delete) and per-project chat memory to Quenzatex.

**Date:** 2026-07-12
**Status:** Approved

---

## Issues

1. **UI Padding** — All panels (Explorer, Chat, Preview, Editor) too cramped; buttons and inputs lack breathing room.
2. **AI lacks project context** — Opencode doesn't know the project path or file list, so it can't create/edit files in the right location.
3. **No session memory** — Chat history resets on app restart; no per-project persistence.

---

## Solution: Agent Mode

### Architecture

```
Renderer (React)                    Main Process (Node.js)
─────────────────                   ─────────────────────
useOpencode ──IPC──►  opencode.ts ──spawn──► opencode serve
  │                                        │  (auto-approve tools)
  │  POST /session ───────────────────────►│  create session
  │  POST /session/:id/message ───────────►│  AI + tools
  │◄──── response (text + tool exec) ─────│
  │                                        │
useSession ──IPC──►  session.ts
  │                  │
  │  session:load ◄──┤  %APPDATA%/Quenzatex/sessions/
  │  session:save ──►│  <project-hash>.json
```

### Opencode Config (Auto-Approve)

When spawning `opencode serve`, inject config that auto-allows all tools:

```json
{
  "permissions": {
    "read": "allow",
    "write": "allow",
    "edit": "allow",
    "apply_patch": "allow",
    "bash": "allow",
    "grep": "allow",
    "glob": "allow"
  }
}
```

Errors are caught by opencode's internal error handling and surfaced in the response.

### Project Context Injection

Every message sent to opencode includes:

```
Project: /path/to/belajar_latex
Files:
- main.tex
- bab1.tex
- preamble.sty

User message: [original message]
```

The file list refreshes on project open / file tree change.

### Session Persistence

**Storage location** (per OS):
| OS | Path |
|----|------|
| Windows | `%APPDATA%/Quenzatex/sessions/` |
| Linux | `~/.config/quenzatex/sessions/` |
| macOS | `~/Library/Application Support/quenzatex/sessions/` |

**File structure** — each project gets one JSON file named `<sha256-of-abs-path>.json`:

```json
{
  "projectPath": "C:/Users/teguh/Works/myself/belajar_latex",
  "lastOpened": "2026-07-12T11:30:00.000Z",
  "messages": [
    {
      "id": "msg_abc123",
      "role": "user",
      "content": "Buat file latex tentang Jakarta",
      "timestamp": "2026-07-12T11:30:00.000Z"
    }
  ]
}
```

Plus an `index.json` for reverse lookups:

```json
{
  "projects": [
    {
      "path": "C:/Users/teguh/Works/myself/belajar_latex",
      "hash": "sha256hex...",
      "lastOpened": "2026-07-12T11:30:00.000Z"
    }
  ]
}
```

**Flow:**
1. User opens project → `useSession` fires `session:load(projectPath)` → get messages from app data
2. Chat runs as normal via `useOpencode`
3. Every message update → `session:save(projectPath, messages)` (debounced 1s)
4. User switches project → save current session → load new session

---

## Files Changed

### New Files

| File | Purpose |
|------|---------|
| `electron/services/session.ts` | Persistence service for chat history |
| `src/hooks/useSession.ts` | React hook for auto-load/save |

### Modified Files

| File | Changes |
|------|---------|
| `electron/services/opencode.ts` | Auto-approve config, accept project path, session-aware messaging |
| `electron/main.ts` | Add session IPC handlers, pass project path to opencode |
| `electron/preload.ts` | Expose session + opencode APIs with project path |
| `src/hooks/useOpencode.ts` | Accept project context, inject file list, integrate session |
| `src/components/ai/ChatView.tsx` | Padding fix + show tool execution results |
| `src/components/ai/MessageInput.tsx` | Padding fix |
| `src/components/layout/AIPanel.tsx` | Padding fix, pass project context |
| `src/components/layout/ExplorerPanel.tsx` | Padding fix |
| `src/components/layout/PreviewPanel.tsx` | Padding fix |
| `src/components/layout/AppLayout.tsx` | Wire session + project context to AI |
| `src/vite-env.d.ts` | Types for new APIs |

---

## UI Padding Fixes (per component)

| Component | Before | After |
|-----------|--------|-------|
| `ExplorerPanel` header | `px-3` | `px-4` |
| `ExplorerPanel` tree items | `px-2` | `pl-3 pr-2` |
| `ChatView` messages | `p-2` | `px-4 py-3` with `gap-3` |
| `MessageInput` container | `p-2` | `p-4` with `gap-3` |
| `MessageInput` send button | no margin | `ml-auto` + `size-9` |
| `PreviewPanel` toolbar | `p-2` | `px-4 py-3` |
| `AIPanel` header | `px-3` | `px-4` |
