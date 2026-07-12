import { FolderTree, PanelLeftClose } from "lucide-react"

interface Props {
  width: number
  onClose: () => void
}

export function ExplorerPanel({ width, onClose }: Props) {
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
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-[var(--muted)] text-gray-400 hover:text-gray-600"
        >
          <PanelLeftClose size={15} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        <p className="text-sm text-gray-400 text-center mt-8">
          No project opened
        </p>
      </div>
    </div>
  )
}
