import { useState } from "react"
import {
  FolderTree,
  PanelLeftClose,
  Folder,
  File,
  ChevronRight,
  ChevronDown,
  FolderOpen,
  FolderOpen as OpenIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import { cn } from "@/lib/utils"

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
  width?: number
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
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <button
            onClick={handleClick}
            className={cn(
              "group w-full flex items-center gap-1.5 pr-2 py-1.5 text-sm rounded-md text-left transition-colors",
              isSelected
                ? "bg-accent text-accent-foreground font-medium"
                : "text-foreground/80 hover:bg-muted"
            )}
            style={{ paddingLeft: `${depth * 14 + 10}px` }}
          >
            {node.isDirectory ? (
              <>
                {expanded ? (
                  <ChevronDown size={14} className="shrink-0 text-muted-foreground" />
                ) : (
                  <ChevronRight size={14} className="shrink-0 text-muted-foreground" />
                )}
                {expanded ? (
                  <FolderOpen size={15} className="shrink-0 text-amber-500" />
                ) : (
                  <Folder size={15} className="shrink-0 text-amber-500" />
                )}
              </>
            ) : (
              <>
                <span className="w-3.5 shrink-0" />
                <File size={15} className="shrink-0 text-sky-500" />
              </>
            )}
            <span className="truncate">{node.name}</span>
          </button>
        </ContextMenuTrigger>
        <ContextMenuContent>
          {node.isDirectory ? (
            <ContextMenuItem onClick={() => window.electronAPI.showItemInFolder(node.path)}>
              Reveal in Explorer
            </ContextMenuItem>
          ) : (
            <>
              <ContextMenuItem onClick={() => onSelect(node.path)}>
                {node.name.toLowerCase().endsWith(".pdf") ? "Open in Preview" : "Open in Editor"}
              </ContextMenuItem>
              <ContextMenuSeparator />
              <ContextMenuItem onClick={() => window.electronAPI.showItemInFolder(node.path)}>
                Reveal in Explorer
              </ContextMenuItem>
            </>
          )}
        </ContextMenuContent>
      </ContextMenu>
      {node.isDirectory && expanded && node.children && (
        <div>
          {node.children.length === 0 ? (
            <p
              className="text-xs text-muted-foreground italic py-1"
              style={{ paddingLeft: `${(depth + 1) * 14 + 12}px` }}
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

export function ExplorerPanel({
  onClose,
  project,
  onOpenProject,
  onSelectFile,
  onExpandDir,
  onOpenSettings,
}: Props) {
  return (
    <div className="h-full w-full flex flex-col min-h-0 bg-sidebar border-r">
      {/* Header */}
      <div className="flex items-center justify-between pl-4 pr-2 h-11 border-b shrink-0">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <FolderTree size={15} className="text-muted-foreground" />
          <span>Explorer</span>
        </div>
        <div className="flex items-center gap-0.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={onClose}
                className="text-muted-foreground"
              >
                <PanelLeftClose size={16} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Hide explorer (Ctrl+B)</TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Body */}
      {!project ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
          <div className="w-11 h-11 rounded-xl bg-muted flex items-center justify-center">
            <OpenIcon size={20} className="text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">No project opened</p>
          <Button size="sm" onClick={onOpenProject} className="gap-2">
            <OpenIcon size={15} />
            Open Folder
          </Button>
        </div>
      ) : (
        <ScrollArea className="flex-1 min-h-0">
          <div className="px-2 py-2">
            <div className="px-2 pb-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider truncate">
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
        </ScrollArea>
      )}
    </div>
  )
}
