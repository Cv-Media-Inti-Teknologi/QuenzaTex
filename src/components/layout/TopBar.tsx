import {
  PanelLeft,
  PanelRight,
  Settings2,
  FolderOpen,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

interface Props {
  projectName?: string | null
  explorerHidden: boolean
  aiHidden: boolean
  onToggleExplorer: () => void
  onToggleAi: () => void
  onOpenSettings: () => void
  onOpenProject: () => void
}

export function TopBar({
  projectName,
  explorerHidden,
  aiHidden,
  onToggleExplorer,
  onToggleAi,
  onOpenSettings,
  onOpenProject,
}: Props) {
  return (
    <div className="flex items-center justify-between h-9 px-2 border-b bg-sidebar shrink-0 select-none">
      {/* Left: explorer toggle */}
      <div className="flex items-center gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onToggleExplorer}
              className={cn(
                "text-muted-foreground",
                !explorerHidden && "bg-accent text-accent-foreground"
              )}
            >
              <PanelLeft size={16} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {explorerHidden ? "Show" : "Hide"} Explorer (Ctrl+B)
          </TooltipContent>
        </Tooltip>
      </div>

      {/* Center: project name */}
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground min-w-0">
        {projectName ? (
          <>
            <FolderOpen size={13} className="shrink-0" />
            <span className="truncate font-medium text-foreground/80">
              {projectName}
            </span>
          </>
        ) : (
          <button
            onClick={onOpenProject}
            className="hover:text-foreground transition-colors"
          >
            Open a folder…
          </button>
        )}
      </div>

      {/* Right: settings + AI toggle */}
      <div className="flex items-center gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onOpenSettings}
              className="text-muted-foreground"
            >
              <Settings2 size={15} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Settings (Ctrl+,)</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onToggleAi}
              className={cn(
                "text-muted-foreground",
                !aiHidden && "bg-accent text-accent-foreground"
              )}
            >
              <PanelRight size={16} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {aiHidden ? "Show" : "Hide"} AI Panel (Ctrl+J)
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  )
}
