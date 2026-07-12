# Development Guide

## Prerequisites

- [Node.js](https://nodejs.org/) 18+ and npm 9+
- [TeX Live](https://tug.org/texlive/) with `latexmk`
- [opencode CLI](https://opencode.ai) (installed automatically via Setup Wizard)

---

## Setup

```bash
git clone https://github.com/Cv-Media-Inti-Teknologi/QuenzaTex.git
cd QuenzaTex
npm install
```

---

## Available Scripts

```bash
npm run dev         # Start dev server with HMR + DevTools
npm run build       # Production build (minified)
npm run build:dev   # Development build (source maps, verbose)
npm run preview     # Preview production build
npm run package     # Build + package for production
npm run package:dev # Build + package for development (debug symbols)
```

---

## Dual Build Mode

QuenzaTex uses `QUENZATEX_MODE` environment variable to switch between development and production modes.

| Aspect | Development | Production |
|--------|-------------|------------|
| `QUENZATEX_MODE` | `development` | `production` |
| DevTools | Auto-open | Hidden |
| Source Maps | Inline | Stripped |
| Minification | Disabled | esbuild |
| Window Title | `QuenzaTex [DEV]` | `QuenzaTex` |
| Output Name | `QuenzaTex Dev-*` | `QuenzaTex-*` |

---

## Project Structure

```
quenzatex/
├── electron/                  # Electron main process
│   ├── main.ts                # Entry point (IPC handlers, window management)
│   ├── preload.ts             # Preload script (contextBridge)
│   └── services/
│       ├── opencode.ts        # opencode serve/CLI manager
│       ├── latex.ts           # LaTeX compilation (latexmk)
│       ├── env-setup.ts       # Dependency checker
│       └── updater.ts         # Auto-updater (WIP)
├── src/                       # React frontend
│   ├── App.tsx                # Root component
│   ├── components/
│   │   ├── layout/            # 4-panel layout
│   │   ├── editor/            # Monaco editor wrapper
│   │   ├── preview/           # PDF.js preview
│   │   ├── ai/                # Chat UI components
│   │   ├── settings/          # Settings dialog
│   │   └── onboarding/        # Setup wizard
│   ├── hooks/                 # React hooks (useOpencode, useFileExplorer, etc.)
│   ├── lib/                   # Utility functions (mention parser, etc.)
│   └── store/                 # Context providers (Settings, AI, Project)
├── resources/                 # Icons and assets
├── docs/                      # Documentation
├── package.json
├── electron-builder.yml       # Production build config
├── electron-builder.dev.yml   # Development build config
├── electron.vite.config.ts    # Vite config with dual mode support
└── AGENTS.md                  # AI agent context (for opencode / Claude)
```

---

## Branch Strategy

```
feat/*  →  development  →  production
```

- **`production`** — Stable, release-ready. Protected: no direct pushes, PR with 1 approval required.
- **`development`** — Integration branch. All feat branches merge here.
- **`feat/*`** — Feature branches. Create a PR to `development`.

---

## Wiring a New Feature

1. Create branch from `development`: `git checkout -b feat/my-feature`
2. Implement changes
3. Push and create PR to `development`
4. After review and merge, `development` → `production` PR for release
