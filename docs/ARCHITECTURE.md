# Architecture Overview

## Tech Stack

```
┌─────────────────────────────────────────────────┐
│                Electron Shell                    │
│  ┌──────────────┐         ┌──────────────────┐  │
│  │  Main Process │◄──IPC──►│  Renderer (Vite) │  │
│  │  (Node.js)    │         │  (React 18 + TS) │  │
│  ├──────────────┤         ├──────────────────┤  │
│  │ opencode.ts  │         │ Monaco Editor    │  │
│  │ latex.ts     │         │ PDF.js Preview   │  │
│  │ env-setup.ts │         │ AI Chat Panel    │  │
│  │ updater.ts   │         │ File Explorer    │  │
│  └──────────────┘         └──────────────────┘  │
└─────────────────────────────────────────────────┘
```

---

## IPC Communication

All renderer → main communication goes through `contextBridge` exposed as `window.electronAPI`:

| Channel | Direction | Purpose |
|---------|-----------|---------|
| `file:read` | Renderer → Main | Read file contents |
| `file:write` | Renderer → Main | Save file |
| `file:listDir` | Renderer → Main | List directory contents |
| `project:open` | Renderer → Main | Open folder dialog |
| `latex:compile` | Renderer → Main | Compile .tex to PDF |
| `latex:watch` | Renderer → Main | Start auto-recompile |
| `latex:compile-result` | Main → Renderer | Compilation result event |
| `opencode:send` | Renderer → Main | Send message to AI |
| `opencode:status` | Renderer → Main | Get AI server status |
| `env:check` | Renderer → Main | Check dependencies |

---

## 4-Panel Layout

```
┌──────────┬───────────────────┬──────────┬─────────┐
│ Explorer │    Monaco Editor  │  PDF     │ AI Chat │
│          │                   │ Preview  │ Panel   │
│ Ctrl+B   │                   │          │ Ctrl+J  │
│ toggle   │                   │          │ toggle  │
├──────────┤                   │          │         │
│ File     │                   │          │         │
│ Tree     │                   │          │         │
└──────────┴───────────────────┴──────────┴─────────┘
     ← drag →       ← drag →        ← drag →
```

All panels are resizable via drag handles and toggleable with keyboard shortcuts.

---

## AI Integration (opencode)

```
┌──────────────┐     HTTP/CLI      ┌──────────────┐
│  AI Chat     │ ────────────────►  │  opencode    │
│  Panel       │ ◄────────────────  │  serve/run   │
│  (React)     │     response       │  (Node.js)   │
└──────┬───────┘                    └──────┬───────┘
       │ @file.tex mention                  │
       ▼                                    │
┌──────────────┐                            │
│ File System  │ ◄─ file content ───────────┘
└──────────────┘
```

- **Primary:** `opencode serve --port 4097` (HTTP API for streaming chat)
- **Fallback:** `opencode run "prompt"` (CLI mode if serve fails)
- **@mention:** `@filename.tex` parsed in frontend, file content injected as context

---

## LaTeX Pipeline

```
.tex file  ──►  latexmk -pvc -pdf  ──►  .pdf  ──►  PDF.js render
                 (file watcher)               (page-by-page)
                      │
                      ▼
               Error parsing ──► Display in panel
```

- Uses `latexmk -pvc` for continuous compilation on file change
- Output PDF is rendered page-by-page via PDF.js
- Errors/warnings parsed from log output and displayed in the UI
