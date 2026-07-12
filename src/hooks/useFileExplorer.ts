import { useState, useCallback, useEffect } from "react"

interface FileNode {
  name: string
  isDirectory: boolean
  path: string
  children?: FileNode[]
}

interface ProjectState {
  rootPath: string
  files: FileNode[]
  selectedFile: string | null
}

export function useFileExplorer() {
  const [project, setProject] = useState<ProjectState | null>(null)
  const [loading, setLoading] = useState(false)

  const buildTree = useCallback((entries: FileEntry[], parentPath: string): FileNode[] => {
    return entries.map((e) => ({
      name: e.name,
      isDirectory: e.isDirectory,
      path: e.path,
      children: e.isDirectory ? [] : undefined,
    }))
  }, [])

  const openProject = useCallback(async () => {
    setLoading(true)
    try {
      const result = await window.electronAPI.openProject()
      if (result) {
        setProject({
          rootPath: result.path,
          files: buildTree(result.files, result.path),
          selectedFile: null,
        })
      }
    } finally {
      setLoading(false)
    }
  }, [buildTree])

  const expandDir = useCallback(async (dirPath: string) => {
    if (!project) return
    try {
      const entries = await window.electronAPI.listDir(dirPath)
      const updateNode = (nodes: FileNode[]): FileNode[] =>
        nodes.map((n) => {
          if (n.path === dirPath) {
            return { ...n, children: buildTree(entries, dirPath) }
          }
          if (n.children) return { ...n, children: updateNode(n.children) }
          return n
        })
      setProject({ ...project, files: updateNode(project.files) })
    } catch {
      // ignore
    }
  }, [project, buildTree])

  const selectFile = useCallback(async (filePath: string) => {
    if (!project) return
    setProject({ ...project, selectedFile: filePath })
  }, [project])

  const getSelectedContent = useCallback(async () => {
    if (!project?.selectedFile) return null
    return window.electronAPI.readFile(project.selectedFile)
  }, [project])

  const getSelectedPath = useCallback(() => {
    return project?.selectedFile ?? null
  }, [project])

  const refreshFiles = useCallback(async () => {
    if (!project) return
    try {
      const entries = await window.electronAPI.listDir(project.rootPath)
      setProject((prev) => prev ? {
        ...prev,
        files: buildTree(entries, project.rootPath),
      } : prev)
    } catch {
      // ignore
    }
  }, [project, buildTree])

  return {
    project,
    loading,
    openProject,
    expandDir,
    selectFile,
    getSelectedContent,
    getSelectedPath,
    refreshFiles,
  }
}
