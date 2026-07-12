import { Bot, PanelRightClose } from "lucide-react"

interface Props {
  width: number
  onClose: () => void
}

export function AIPanel({ width, onClose }: Props) {
  return (
    <div
      className="h-full flex flex-col bg-white border-l border-[var(--border)]"
      style={{ width, minWidth: 280, maxWidth: 600 }}
    >
      <div className="flex items-center justify-between px-3 h-10 border-b border-[var(--border)] shrink-0">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-600">
          <Bot size={15} />
          <span>AI Chat</span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-[var(--muted)] text-gray-400 hover:text-gray-600"
        >
          <PanelRightClose size={15} />
        </button>
      </div>
      <div className="flex-1 flex flex-col">
        <div className="flex-1 overflow-y-auto p-3">
          <p className="text-sm text-gray-400 text-center mt-8">
            Start a conversation with AI
          </p>
        </div>
        <div className="border-t border-[var(--border)] p-3">
          <input
            type="text"
            placeholder="Ask AI... (@ to mention files)"
            className="w-full px-3 py-2 text-sm border border-[var(--border)] rounded-lg
              focus:outline-none focus:ring-2 focus:ring-blue-400/30 focus:border-blue-400"
          />
        </div>
      </div>
    </div>
  )
}
