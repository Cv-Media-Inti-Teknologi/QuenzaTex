# Quenzatex — AI Agent Guidelines

## Project Overview

**Quenzatex** adalah aplikasi desktop AI-powered LaTeX editor berbasis Electron + React. Aplikasi ini menggabungkan editor LaTeX (Monaco Editor), PDF preview (PDF.js), dan AI chat panel yang ditenagai oleh opencode sebagai engine AI.

**Tech Stack:**
- Desktop Shell: Electron + electron-vite
- Frontend: React 18 + TypeScript + Vite
- Styling: TailwindCSS + shadcn/ui (light mode, material modern)
- Editor: Monaco Editor (`@monaco-editor/react`)
- Preview: PDF.js (`pdfjs-dist`)
- AI Engine: opencode (HTTP serve API primary, CLI fallback)
- LaTeX Engine: TeX Live + latexmk (cross-platform)
- Build: electron-builder (Windows, Linux, macOS)

---

## Folder Structure

```
quenzatex/
├── electron/                  # Electron main process
│   ├── main.ts                # Entry point Electron
│   ├── preload.ts             # Preload script (contextBridge)
│   └── services/
│       ├── opencode.ts        # opencode serve/CLI manager
│       ├── latex.ts           # LaTeX compilation (latexmk)
│       ├── env-setup.ts       # Dependency checker/installer
│       └── updater.ts         # Auto-updater
├── src/                       # React frontend (renderer)
│   ├── App.tsx
│   ├── components/
│   │   ├── layout/            # 4-panel layout
│   │   │   ├── AppLayout.tsx
│   │   │   ├── ExplorerPanel.tsx
│   │   │   ├── EditorPanel.tsx
│   │   │   ├── PreviewPanel.tsx
│   │   │   └── AIPanel.tsx
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
├── resources/                 # Icons, assets
├── docs/
│   └── opencode_docs/         # Referensi dokumentasi opencode
├── package.json
├── electron-builder.yml
├── planning.md                # Implementation plan
└── AGENTS.md                  # Ini
```

---

## Key Files Reference

### Design Spec
`docs/superpowers/specs/2026-07-12-quenzatex-design.md`
Berisi arsitektur lengkap aplikasi, layout, alur data, dan keputusan desain.

### Implementation Plan
`planning.md`
Berisi task breakdown per fase, branch strategy, dan step-by-step implementasi.

### opencode Documentation
`docs/opencode_docs/`
Dokumentasi opencode CLI, server API, konfigurasi provider/model, dan integrasi.

---

## Konvensi Coding

### Naming
- **Komponen React**: PascalCase (`AppLayout.tsx`, `ChatView.tsx`)
- **Hooks**: camelCase dengan prefix `use` (`useOpencode.ts`)
- **Services (electron)**: camelCase (`opencode.ts`, `latex.ts`)
- **Files**: kebab-case untuk utility (`opencode-client.ts`)
- **IPC Channels**: namespace:action (`file:read`, `opencode:send`, `latex:compile`)

### Struktur Komponen
```tsx
interface Props {
  filePath: string;
  onSave?: (content: string) => void;
}

export function LatexEditor({ filePath, onSave }: Props) {
  // implementation
}
```

### State Management
- **React Context** untuk global state (Settings, AI, Project)
- **local state / hooks** untuk UI component state

### Electron IPC Pattern
```typescript
// preload.ts
contextBridge.exposeInMainWorld("electronAPI", {
  readFile: (path: string) => ipcRenderer.invoke("file:read", path),
})

// Renderer
const content = await window.electronAPI.readFile("/path/file.tex")
```

---

## Available Scripts

```bash
# Development
npm run dev         # Start electron-vite dev mode

# Build
npm run build       # Build for production
npm run preview     # Preview production build

# Package
npm run package     # Build + package with electron-builder
```

---

## Architecture Rules

### 4-Panel Layout (semua resizable + toggleable)
```
[File Explorer | Monaco Editor | PDF Preview | AI Chat Panel]
```
- Explorer toggle: `Ctrl+B`
- AI Panel toggle: `Ctrl+J`
- Semua panel bisa di-resize via drag handle

### AI Integration (opencode)
- **Default**: spawn `opencode serve --port 4097` di background, HTTP API untuk chat
- **Fallback**: `opencode run "prompt"` via CLI jika serve gagal
- **@mention file**: Parse `@file.tex` di frontend, inject konten ke prompt
- Provider/model bisa diganti di Settings (ubah `opencode.json` config)

### LaTeX Pipeline
- Auto-compile via `latexmk -pvc -pdf -interaction=nonstopmode <file>` (watch mode)
- Output PDF langsung di-render oleh PDF.js
- Error/warning parsing ditampilkan di panel

### Environment Setup
- First run: cek Node.js → npm install opencode → cek TeX Live
- Semua bisa di-install otomatis via Setup Wizard

---

## Branch Strategy

- `main` — stable, release-ready
- `feat/*` — fitur baru (merge via PR ke main)
- Setiap fase development punya branch sendiri

---

## Important Notes

### opencode sebagai Single AI Engine
Tidak boleh integrasi langsung ke provider AI lain. Semua permintaan AI harus melalui opencode. Provider/model diatur via config opencode di Settings.

### Cross-Platform
Aplikasi harus bisa di-build untuk Windows (NSIS), Linux (AppImage/deb), dan macOS (DMG).

### LaTeX Engine Wajib
Komputer pengguna WAJIB memiliki TeX Live + latexmk. Environment Setup Wizard akan membantu instalasi.

### File @Mention
Format: `@namafile.tex`. AI akan membaca konten file yang di-mention sebagai konteks tambahan.

---

**Last Updated**: July 2026
