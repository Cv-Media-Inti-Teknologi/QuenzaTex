import { useState } from "react"
import { FolderTree, PanelLeftClose, Folder, File, ChevronRight, ChevronDown, FolderOpen, Settings2 } from "lucide-react"

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

interface Props {
  width: number
  onClose: () => void
  project: ProjectState | null
  onOpenProject: () => void
  onSelectFile: (path: string) => void
  onExpandDir: (path: string) => void
  onOpenSettings?: () => void
}

function FileTreeNode({
  node,
  depth,
  selectedPath,
  onSelect,
  onExpand,
}: {
  node: FileNode
  depth: number
  selectedPath: string | null
  onSelect: (path: string) => void
  onExpand: (path: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const isSelected = selectedPath === node.path

  const handleClick = () => {
    if (node.isDirectory) {
      setExpanded(!expanded)
      if (!expanded) onExpand(node.path)
    } else {
      onSelect(node.path)
    }
  }

  return (
    <div>
      <button
        onClick={handleClick}
        className={`w-full flex items-center gap-1.5 px-2 py-1 text-sm rounded
          hover:bg-[var(--muted)] text-left
          ${isSelected ? "bg-blue-50 text-blue-700 font-medium" : "text-gray-700"}`}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
      >
        {node.isDirectory ? (
          <>
            {expanded ? <ChevronDown size={14} className="shrink-0" /> : <ChevronRight size={14} className="shrink-0" />}
            {expanded ? <FolderOpen size={15} className="shrink-0 text-yellow-500" /> : <Folder size={15} className="shrink-0 text-yellow-600" />}
          </>
        ) : (
          <>
            <span className="w-4" />
            <File size={15} className="shrink-0 text-blue-500" />
          </>
        )}
        <span className="truncate">{node.name}</span>
      </button>
      {node.isDirectory && expanded && node.children && (
        <div>
          {node.children.length === 0 ? (
            <p
              className="text-xs text-gray-400 italic px-2 py-1"
              style={{ paddingLeft: `${(depth + 1) * 16 + 8}px` }}
            >
              empty
            </p>
          ) : (
            node.children.map((child) => (
              <FileTreeNode
                key={child.path}
                node={child}
                depth={depth + 1}
                selectedPath={selectedPath}
                onSelect={onSelect}
                onExpand={onExpand}
              />
            ))
          )}
        </div>
      )}
    </div>
  )
}

export function ExplorerPanel({ width, onClose, project, onOpenProject, onSelectFile, onExpandDir, onOpenSettings }: Props) {
  return (
    <div
      className="h-full flex flex-col bg-white border-r border-[var(--border)]"
      style={{ width, minWidth: 180, maxWidth: 500 }}
    >
      <div className="flex items-center justify-between px-3 h-10 border-b border-[var(--border)] shrink-0">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-600">
          <FolderTree size={15} />
          <span>Explorer</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onOpenSettings}
            className="p-1 rounded hover:bg-[var(--muted)] text-gray-400 hover:text-gray-600"
            title="Settings (Ctrl+,)"
          >
            <Settings2 size={14} />
          </button>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-[var(--muted)] text-gray-400 hover:text-gray-600"
          >
            <PanelLeftClose size={15} />
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto py-1">
        {!project ? (
          <div className="p-3 text-center">
            <p className="text-sm text-gray-400 mb-3">No project opened</p>
            <button
              onClick={onOpenProject}
              className="px-4 py-2 text-sm bg-blue-500 text-white rounded-lg
                hover:bg-blue-600 transition-colors"
            >
              Open Folder
            </button>
          </div>
        ) : (
          <div>
            <div className="px-3 py-1 text-xs text-gray-400 font-medium uppercase tracking-wider">
              {project.rootPath.split(/[/\\]/).pop()}
            </div>
            {project.files.map((node) => (
              <FileTreeNode
                key={node.path}
                node={node}
                depth={0}
                selectedPath={project.selectedFile}
                onSelect={onSelectFile}
                onExpand={onExpandDir}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
