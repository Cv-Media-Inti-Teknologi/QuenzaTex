# Quenzatex — Design Spec

> AI-Powered LaTeX Editor (Desktop)

**Version:** 1.0.0
**Date:** 2026-07-12
**Repo:** https://github.com/Cv-Media-Inti-Teknologi/QuenzaTex

---

## Overview

Quenzatex is a cross-platform desktop LaTeX editor powered by AI via opencode. It provides a VS Code-like experience tailored specifically for LaTeX files, with an integrated AI chat panel that can generate, edit, and analyze LaTeX documents.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Desktop Shell | Electron |
| Frontend | React 18 + Vite |
| Styling | TailwindCSS + shadcn/ui |
| Editor | Monaco Editor (`@monaco-editor/react`) |
| PDF Preview | PDF.js (`pdfjs-dist`) |
| AI Engine | opencode (serve HTTP API primary, CLI fallback) |
| Build/Package | electron-builder |
| Language | Node.js (main) + LaTeX (TeX Live) |

---

## Architecture

### Layout (4-panel, resizable + toggleable)

```
┌────────────┬──────────────────┬──────────────────┬────────────┐
│ File       │  Monaco Editor   │  PDF Preview     │ AI Chat    │
│ Explorer   │                  │                  │ Panel      │
│            │                  │                  │            │
│ ◄ toggle   │  ◄ resize ►      │  ◄ resize ►      │ ► toggle   │
└────────────┴──────────────────┴──────────────────┴────────────┘
```

- All panels are resizable via drag handles
- Explorer toggle: `Ctrl+B`
- AI Panel toggle: `Ctrl+J`
- Editor/Preview split: resizable horizontal

### Project Structure

```
quenzatex/
├── electron/                  # Electron main process
│   ├── main.ts
│   ├── preload.ts
│   └── services/
│       ├── opencode.ts        # opencode serve/CLI manager
│       ├── latex.ts           # LaTeX compilation
│       ├── env-setup.ts       # Dependency checker/installer
│       └── updater.ts
├── src/                       # React frontend (renderer)
│   ├── App.tsx
│   ├── components/
│   │   ├── layout/
│   │   │   ├── ExplorerPanel.tsx
│   │   │   ├── EditorPanel.tsx
│   │   │   ├── PreviewPanel.tsx
│   │   │   ├── AIPanel.tsx
│   │   │   └── AppLayout.tsx
│   │   ├── editor/
│   │   │   └── LatexEditor.tsx
│   │   ├── preview/
│   │   │   └── PdfPreview.tsx
│   │   ├── ai/
│   │   │   ├── ChatView.tsx
│   │   │   ├── MessageInput.tsx
│   │   │   └── MentionDropdown.tsx
│   │   ├── settings/
│   │   │   ├── SettingsDialog.tsx
│   │   │   ├── AiProviderConfig.tsx
│   │   │   └── EnvStatus.tsx
│   │   └── onboarding/
│   │       └── SetupWizard.tsx
│   ├── hooks/
│   │   ├── useOpencode.ts
│   │   ├── useLatex.ts
│   │   └── useFileExplorer.ts
│   ├── lib/
│   │   ├── opencode-client.ts
│   │   └── latex-builder.ts
│   └── store/
│       ├── ProjectContext.tsx
│       ├── AiContext.tsx
│       └── SettingsContext.tsx
├── resources/
├── package.json
├── electron-builder.yml
├── tailwind.config.js
├── vite.config.ts
└── planning.md
```

---

## AI Integration (opencode)

### Modes

1. **HTTP Server (default)**: `opencode serve --port 4097` — spawned as child process by Electron main
   - Streaming chat via REST API + SSE
   - AI has access to native tools (read, grep, glob) for file exploration
   - Provider/model configurable via opencode.json

2. **CLI (fallback)**: `opencode run "prompt"` — spawned per message
   - Limited AI capabilities (no tool calls)
   - Context injected manually via @mention

### Chat Flow

```
1. User types message + optional @file.tex mentions
2. Frontend parses @mentions, fetches file content via IPC
3. If HTTP mode: POST /session/:id/message with streaming
4. If CLI mode: spawn opencode run with injected context
5. Response streamed/displayed in AI Panel
```

### @Mention System

- `@filename.tex` — referenced file content injected as context
- Parse regex: `/@([\w\/\-]+\.\w+)/g`
- File content fetched from workspace via main process IPC

---

## LaTeX Pipeline

### Environment Setup (First Run)

```
Wizard:
1. Check Node.js → install if missing (LTS)
2. npm install -g opencode
3. Check TeX Live → install if missing
4. Verify latexmk available
```

### Compilation

- `latexmk -pvc -pdf -interaction=nonstopmode <file>` (watch mode)
- Auto-compile on file save
- Output PDF → reload PDF.js
- Parse errors/warnings → display in Problems panel

### SyncTeX (future)

- PDF click → editor cursor jump
- Editor cursor → PDF highlight

---

## Settings

| Tab | Options |
|-----|---------|
| General | Font size, theme, language, auto-save |
| AI Provider | Model selector, API keys for custom providers |
| OpenCode | Mode (HTTP/CLI), port, restart, status |
| LaTeX | TeX Live path, latexmk args, output dir |
| Environment | Component status, install/update buttons |

---

## Branch Strategy

- `main` — stable, release-ready
- `feat/project-setup` — initial Electron + Vite setup
- `feat/layout-panels` — 4-panel layout with resize/toggle
- `feat/opencode-integration` — AI engine integration
- `feat/latex-pipeline` — compilation + preview
- `feat/environment-setup` — dependency checker/wizard
- `feat/settings` — settings dialog
- Each branch is merged via PR after review

---

## Constraints

- Electron for desktop shell
- React + TailwindCSS + shadcn/ui for UI
- Monaco Editor for LaTeX editing
- PDF.js for preview
- opencode as single AI engine (no other AI provider directly)
- Cross-platform: Windows, Linux, macOS
- Light mode material design (dark mode later)
