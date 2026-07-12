# Quenzatex Implementation Plan

> **For agentic workers:** Tasks use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a cross-platform AI-powered LaTeX desktop editor using Electron + React + opencode.

**Architecture:** Electron main process manages opencode (serve/CLI), LaTeX compilation, and file system. React renderer with TailwindCSS renders a 4-panel resizable layout (File Explorer | Monaco Editor | PDF Preview | AI Chat).

**Tech Stack:** Electron, React 18, Vite, TailwindCSS, shadcn/ui, Monaco Editor, PDF.js, opencode, TeX Live

**Repo:** https://github.com/Cv-Media-Inti-Teknologi/QuenzaTex
**Branch Strategy:** Each phase is developed on its own branch, merged via PR to `main`.

---

## Phase 1: Project Scaffolding

**Branch:** `feat/project-setup`

### Task 1.1: Initialize Electron + Vite + React project

**Files:**
- Create: `package.json`
- Create: `vite.config.ts`
- Create: `tsconfig.json`
- Create: `tsconfig.node.json`
- Create: `electron-builder.yml`
- Create: `index.html`
- Create: `.gitignore`

- [ ] Create project with needed dependencies

Run: `npm create vite@latest . -- --template react-ts`

- [ ] Install Electron and build dependencies

```bash
npm install electron electron-builder electron-vite -D
npm install react react-dom
npm install @types/react @types/react-dom -D
npm install vite @vitejs/plugin-react -D
npm install tailwindcss @tailwindcss/vite
npm install lucide-react class-variance-authority clsx tailwind-merge
```

- [ ] Configure `vite.config.ts` with Tailwind plugin

```typescript
import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import path from "path"

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: "./",
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    outDir: "dist",
  },
})
```

- [ ] Create `.gitignore`

```
node_modules/
dist/
out/
.DS_Store
*.log
.env
```

- [ ] Configure `package.json` with Electron scripts

```json
{
  "name": "quenzatex",
  "version": "0.1.0",
  "description": "AI-Powered LaTeX Editor",
  "main": "electron/main.ts",
  "scripts": {
    "dev": "electron-vite dev",
    "build": "electron-vite build",
    "preview": "electron-vite preview",
    "package": "electron-vite build && electron-builder --config electron-builder.yml"
  }
}
```

- [ ] Create `electron-builder.yml`

```yaml
appId: com.quenzatex.app
productName: Quenzatex
directories:
  output: dist-electron
win:
  target: [nsis]
  icon: resources/icon.ico
mac:
  target: [dmg]
  icon: resources/icon.icns
linux:
  target: [AppImage, deb]
  icon: resources/icon.png
nsis:
  oneClick: false
  allowToChangeInstallationDirectory: true
```

- [ ] Create `index.html`

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Quenzatex</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Commit**: `git add . && git commit -m "feat: initial project scaffold with Electron + Vite + React"`

---

### Task 1.2: Basic Electron main process + TailwindCSS setup

**Files:**
- Create: `electron/main.ts`
- Create: `electron/preload.ts`
- Create: `src/main.tsx`
- Create: `src/App.tsx`
- Create: `src/index.css`
- Create: `src/components/ui/`

- [ ] Create `electron/main.ts`

```typescript
import { app, BrowserWindow } from "electron"
import path from "path"

let mainWindow: BrowserWindow | null = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    mainWindow.loadFile(path.join(__dirname, "../dist/index.html"))
  }
}

app.whenReady().then(createWindow)

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit()
})

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})
```

- [ ] Create `electron/preload.ts`

```typescript
import { contextBridge, ipcRenderer } from "electron"

contextBridge.exposeInMainWorld("electronAPI", {
  // File operations
  readFile: (path: string) => ipcRenderer.invoke("file:read", path),
  writeFile: (path: string, content: string) => ipcRenderer.invoke("file:write", path, content),
  listDir: (dir: string) => ipcRenderer.invoke("file:listDir", dir),
  // opencode operations
  opencodeSend: (message: string) => ipcRenderer.invoke("opencode:send", message),
  opencodeStatus: () => ipcRenderer.invoke("opencode:status"),
  // LaTeX operations
  compileLatex: (file: string) => ipcRenderer.invoke("latex:compile", file),
  // Environment
  getEnvStatus: () => ipcRenderer.invoke("env:status"),
})
```

- [ ] Create `src/main.tsx`

```tsx
import React from "react"
import ReactDOM from "react-dom/client"
import App from "./App"
import "./index.css"

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
```

- [ ] Create `src/index.css`

```css
@import "tailwindcss";

:root {
  --background: #ffffff;
  --foreground: #1a1a2e;
}

body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  background: var(--background);
  color: var(--foreground);
}
```

- [ ] Create `src/App.tsx` (placeholder)

```tsx
function App() {
  return (
    <div className="h-screen w-screen flex items-center justify-center bg-[#f8f9fa]">
      <h1 className="text-2xl font-semibold text-gray-700">Quenzatex</h1>
    </div>
  )
}

export default App
```

- [ ] **Commit**: `git add . && git commit -m "feat: add Electron main process and TailwindCSS setup"`

---

## Phase 2: 4-Panel Resizable Layout

**Branch:** `feat/layout-panels`

### Task 2.1: App layout with 4 resizable panels

**Files:**
- Create: `src/components/layout/AppLayout.tsx`
- Create: `src/components/layout/ExplorerPanel.tsx`
- Create: `src/components/layout/EditorPanel.tsx`
- Create: `src/components/layout/PreviewPanel.tsx`
- Create: `src/components/layout/AIPanel.tsx`
- Create: `src/components/layout/ResizeHandle.tsx`
- Create: `src/hooks/usePanelResize.ts`
- Modify: `src/App.tsx`

- [ ] Create `usePanelResize.ts` hook

```typescript
import { useState, useCallback } from "react"

interface PanelSizes {
  explorer: number
  editor: number
  preview: number
  ai: number
}

export function usePanelSizes() {
  const [sizes, setSizes] = useState<PanelSizes>({
    explorer: 250,
    editor: 1,
    preview: 1,
    ai: 320,
  })

  const resize = useCallback((panel: keyof PanelSizes, delta: number) => {
    setSizes(prev => ({
      ...prev,
      [panel]: Math.max(200, Math.min(600, prev[panel] + delta)),
    }))
  }, [])

  return { sizes, resize }
}
```

- [ ] Create `AppLayout.tsx` with ResizeHandle components

```tsx
import { useState } from "react"
import ExplorerPanel from "./ExplorerPanel"
import EditorPanel from "./EditorPanel"
import PreviewPanel from "./PreviewPanel"
import AIPanel from "./AIPanel"

export default function AppLayout() {
  const [explorerWidth, setExplorerWidth] = useState(250)
  const [aiWidth, setAiWidth] = useState(320)
  const [explorerHidden, setExplorerHidden] = useState(false)
  const [aiHidden, setAiHidden] = useState(false)

  return (
    <div className="h-screen w-screen flex bg-white overflow-hidden select-none">
      {!explorerHidden && (
        <>
          <ExplorerPanel
            width={explorerWidth}
            onToggle={() => setExplorerHidden(true)}
          />
          <ResizeHandle onResize={(d) => setExplorerWidth(w => Math.max(180, Math.min(500, w + d)))} />
        </>
      )}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex flex-1 min-h-0">
          <EditorPanel />
          <ResizeHandle onResize={(d) => {/* editor/preview ratio */}} />
          <PreviewPanel />
        </div>
      </div>
      {!aiHidden && (
        <>
          <ResizeHandle onResize={(d) => setAiWidth(w => Math.max(280, Math.min(600, w + d)))} />
          <AIPanel
            width={aiWidth}
            onToggle={() => setAiHidden(true)}
          />
        </>
      )}
    </div>
  )
}

function ResizeHandle({ onResize }: { onResize: (delta: number) => void }) {
  // Drag handler logic here
}
```

- [ ] Update `App.tsx`

```tsx
import AppLayout from "./components/layout/AppLayout"

function App() {
  return <AppLayout />
}

export default App
```

- [ ] **Commit**: `git add . && git commit -m "feat: add 4-panel resizable layout"`

---

## Phase 3: File Explorer + Monaco Editor

**Branch:** `feat/editor-explorer`

### Task 3.1: File Explorer Panel

**Files:**
- Modify: `src/components/layout/ExplorerPanel.tsx`
- Create: `src/hooks/useFileExplorer.ts`
- Modify: `electron/main.ts` (add IPC handlers for file ops)
- Modify: `electron/preload.ts` (expose file ops)

- [ ] Add file system IPC handlers in electron/main.ts

```typescript
import { ipcMain } from "electron"
import fs from "fs"
import path from "path"

ipcMain.handle("file:read", async (_, filePath: string) => {
  return fs.readFileSync(filePath, "utf-8")
})

ipcMain.handle("file:write", async (_, filePath: string, content: string) => {
  fs.writeFileSync(filePath, content, "utf-8")
  return true
})

ipcMain.handle("file:listDir", async (_, dirPath: string) => {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true })
  return entries.map(e => ({
    name: e.name,
    isDirectory: e.isDirectory(),
    path: path.join(dirPath, e.name),
  }))
})
```

- [ ] **Commit**: `git add . && git commit -m "feat: add file system IPC handlers"`

### Task 3.2: Monaco Editor Integration

**Files:**
- Modify: `src/components/layout/EditorPanel.tsx`
- Create: `src/components/editor/LatexEditor.tsx`

- [ ] Install Monaco

```bash
npm install @monaco-editor/react monaco-editor
```

- [ ] **Commit**: `git add . && git commit -m "feat: integrate Monaco Editor for LaTeX editing"`

---

## Phase 4: PDF Preview + LaTeX Compilation

**Branch:** `feat/latex-preview`

### Task 4.1: PDF.js Preview

**Files:**
- Modify: `src/components/layout/PreviewPanel.tsx`
- Create: `src/components/preview/PdfPreview.tsx`

- [ ] Install PDF.js

```bash
npm install pdfjs-dist
```

### Task 4.2: LaTeX Compilation Service

**Files:**
- Create: `electron/services/latex.ts`
- Modify: `electron/main.ts` (add IPC handler)

- [ ] **Commit**: `git add . && git commit -m "feat: add PDF preview and LaTeX compilation"`

---

## Phase 5: opencode AI Integration

**Branch:** `feat/opencode-integration`

### Task 5.1: opencode Service Manager

**Files:**
- Create: `electron/services/opencode.ts`
- Modify: `electron/main.ts`
- Modify: `electron/preload.ts`

### Task 5.2: AI Chat Panel

**Files:**
- Modify: `src/components/layout/AIPanel.tsx`
- Create: `src/components/ai/ChatView.tsx`
- Create: `src/components/ai/MessageInput.tsx`
- Create: `src/components/ai/MentionDropdown.tsx`
- Create: `src/lib/opencode-client.ts`
- Create: `src/hooks/useOpencode.ts`

### Task 5.3: @Mention File Parser

**Files:**
- Create: `src/lib/mention-parser.ts`

- [ ] **Commit**: `git add . && git commit -m "feat: add opencode AI engine integration and chat panel with @mention"`

---

## Phase 6: Environment Setup Wizard

**Branch:** `feat/env-setup`

### Task 6.1: Environment Checker

**Files:**
- Create: `electron/services/env-setup.ts`
- Modify: `electron/main.ts`
- Create: `src/components/onboarding/SetupWizard.tsx`

- [ ] **Commit**: `git add . && git commit -m "feat: add environment setup wizard"`

---

## Phase 7: Settings Dialog

**Branch:** `feat/settings`

### Task 7.1: Settings with AI Provider config

**Files:**
- Create: `src/components/settings/SettingsDialog.tsx`
- Create: `src/components/settings/AiProviderConfig.tsx`
- Create: `src/components/settings/EnvStatus.tsx`
- Create: `src/store/SettingsContext.tsx`

- [ ] **Commit**: `git add . && git commit -m "feat: add settings dialog with AI provider configuration"`

---

## Phase 8: Polish & Cross-Platform Testing

**Branch:** `feat/polish`

### Task 8.1: Keyboard shortcuts, icons, theming

- [ ] Add keyboard shortcuts for panel toggle, save, compile
- [ ] Add toolbar icons and status bar
- [ ] Light theme polish (material design)
- [ ] Test on Windows, Linux, macOS

- [ ] **Commit**: `git add . && git commit -m "feat: add keyboard shortcuts, toolbar, and theme polish"`
