# Contributing Guide

## How to Contribute

1. Fork the repository (or create a feature branch if you're a team member)
2. Create your feature branch from `development`
3. Make your changes
4. Ensure the build passes: `npm run build`
5. Submit a Pull Request to `development`

---

## Branch Naming

Use descriptive kebab-case names with a type prefix:

```
feat/layout-panels
feat/latex-preview
fix/pdf-rendering
docs/readme-update
refactor/ipc-handler
chore/dependency-update
```

---

## PR Workflow

```
feature branch  →  PR  →  development  →  PR  →  production
```

1. **Feature → Development:** PR with 1 review approval. All `feat/*` branches go here.
2. **Development → Production:** PR with 1 review approval (typically project lead). Merged when stable.

> **Note:** `production` is a protected branch. Direct pushes are blocked.

---

## Coding Conventions

### Naming

- **React components:** PascalCase (`AppLayout.tsx`, `ChatView.tsx`)
- **Hooks:** camelCase with `use` prefix (`useOpencode.ts`)
- **Electron services:** camelCase (`opencode.ts`, `latex.ts`)
- **Utility files:** kebab-case (`opencode-client.ts`)
- **IPC channels:** `namespace:action` (`file:read`, `opencode:send`)

### Structure

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

- **React Context** for global state (Settings, AI, Project)
- **local state / hooks** for component-specific UI state

### Electron IPC

```typescript
// preload.ts
contextBridge.exposeInMainWorld("electronAPI", {
  readFile: (path: string) => ipcRenderer.invoke("file:read", path),
})

// Renderer
const content = await window.electronAPI.readFile("/path/file.tex")
```

---

## Commit Messages

Use conventional commits:

```
feat: add PDF preview with PDF.js and LaTeX compilation
fix: resolve editor crash on empty file
docs: update README with build instructions
refactor: extract mention parser to separate module
chore: update dependencies
```

---

## Build Verification

Always verify your changes compile before pushing:

```bash
npm run build        # Production build
npm run build:dev    # Development build (optional, for testing source maps)
```

---

## Code of Conduct

Be respectful, constructive, and inclusive. Focus on the code, not the person.
