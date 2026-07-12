import { useRef, useCallback } from "react"
import Editor, { OnMount } from "@monaco-editor/react"
import type { editor } from "monaco-editor"

interface Props {
  value: string
  filePath: string
  onChange?: (value: string | undefined) => void
  onSave?: (content: string) => void
}

export function LatexEditor({ value, filePath, onChange, onSave }: Props) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null)

  const handleMount: OnMount = (editor) => {
    editorRef.current = editor
    editor.onDidChangeModelContent(() => {
      onChange?.(editor.getValue())
    })
    editor.addAction({
      id: "save-file",
      label: "Save File",
      keybindings: [2048 | 49],
      run: () => {
        onSave?.(editor.getValue())
      },
    })
  }

  const fileName = filePath.split(/[/\\]/).pop() || "untitled.tex"

  return (
    <Editor
      height="100%"
      defaultLanguage="latex"
      value={value}
      path={fileName}
      theme="light"
      onMount={handleMount}
      options={{
        fontSize: 14,
        fontFamily: "'Cascadia Code', 'Fira Code', 'JetBrains Mono', monospace",
        minimap: { enabled: false },
        lineNumbers: "on",
        renderLineHighlight: "line",
        scrollBeyondLastLine: false,
        wordWrap: "on",
        tabSize: 2,
        automaticLayout: true,
        padding: { top: 8 },
        bracketPairColorization: { enabled: true },
        suggest: { showKeywords: true, showSnippets: true },
      }}
    />
  )
}
