import { Bot, PanelRightClose } from "lucide-react"
import { ChatView } from "../ai/ChatView"

interface Props {
  width: number
  onClose: () => void
  messages: { id: string; role: "user" | "assistant"; content: string; timestamp: Date }[]
  sending: boolean
  onSend: (message: string) => void
  onClear: () => void
}

export function AIPanel({ width, onClose, messages, sending, onSend, onClear }: Props) {
  return (
    <div
      className="h-full flex flex-col bg-white border-l border-[var(--border)]"
      style={{ width, minWidth: 280, maxWidth: 600 }}
    >
      <div className="flex items-center justify-between px-4 h-11 border-b border-[var(--border)] shrink-0">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-600">
          <Bot size={16} />
          <span>AI Chat</span>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
          title="Close AI Panel (Ctrl+J)"
        >
          <PanelRightClose size={16} />
        </button>
      </div>
      <ChatView
        messages={messages}
        sending={sending}
        onSend={onSend}
        onClear={onClear}
      />
    </div>
  )
}
