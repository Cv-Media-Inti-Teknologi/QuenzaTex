# QuenzaTex

**AI-Powered LaTeX Editor for Desktop**

QuenzaTex is a cross-platform desktop application that combines a professional LaTeX editor, real-time PDF preview, and an AI chat assistant powered by [opencode](https://opencode.ai) — all in one seamless interface.

Built with Electron + React, QuenzaTex provides a modern, distraction-free environment for writing LaTeX documents with AI-assisted editing, smart file suggestions, and automated compilation.

---

## Features

- **Monaco Editor** — Full-featured LaTeX editing with syntax highlighting, autocomplete, and minimap
- **Live PDF Preview** — Real-time rendering via PDF.js with hot-reload compilation (`latexmk -pvc`)
- **AI Chat Assistant** — Context-aware AI help powered by opencode with `@file.tex` mention support
- **File Explorer** — Tree-based project navigation with quick file switching
- **4-Panel Layout** — Resizable panels (Explorer / Editor / Preview / AI Chat) with keyboard toggles
  - `Ctrl+B` toggle Explorer
  - `Ctrl+J` toggle AI Panel
  - `Ctrl+,` open Settings
- **Environment Wizard** — First-run setup for Node.js, opencode CLI, and TeX Live
- **Cross-Platform** — Windows (NSIS), Linux (AppImage, deb), macOS (DMG)

---

## Quick Start

```bash
# Clone the repository
git clone https://github.com/Cv-Media-Inti-Teknologi/QuenzaTex.git
cd QuenzaTex

# Install dependencies
npm install

# Start development mode (with DevTools + HMR)
npm run dev
```

> **Prerequisites:** Node.js 18+, npm 9+, TeX Live with `latexmk`, and [opencode CLI](https://opencode.ai).

---

## Documentation

| Document | Description |
|----------|-------------|
| [Development Guide](docs/DEVELOPMENT.md) | Setup, build modes, project structure, and scripts |
| [Contributing Guide](docs/CONTRIBUTING.md) | Branch strategy, PR workflow, and coding conventions |
| [Architecture Overview](docs/ARCHITECTURE.md) | Tech stack, IPC flow, and design decisions |

---

## Build Modes

| Mode | Command | DevTools | Source Maps | Package Name |
|------|---------|----------|-------------|--------------|
| Development | `npm run package:dev` | ✅ | ✅ | `QuenzaTex Dev-Setup-{version}-dev.exe` |
| Production | `npm run package` | ❌ | ❌ | `QuenzaTex-Setup-{version}.exe` |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Desktop Shell | Electron + electron-vite |
| Frontend | React 18 + TypeScript + Vite |
| Editor | Monaco Editor (`@monaco-editor/react`) |
| PDF Preview | PDF.js (`pdfjs-dist`) |
| AI Engine | [opencode](https://opencode.ai) (HTTP serve + CLI fallback) |
| LaTeX Engine | TeX Live + `latexmk` |
| Styling | TailwindCSS + shadcn/ui |
| Build & Package | electron-builder |

---

## License

MIT
