import { Bot, PanelRightClose } from "lucide-react"
import { ChatView } from "../ai/ChatView"

interface Props {
  width: number
  onClose: () => void
  messages: { id: string; role: "user" | "assistant"; content: string; timestamp: Date }[]
  sending: boolean
  onSend: (message: string) => void
  onClear: () => void
  status: { running: boolean; mode: string }
}

export function AIPanel({ width, onClose, messages, sending, onSend, onClear, status }: Props) {
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
      <ChatView
        messages={messages}
        sending={sending}
        onSend={onSend}
        onClear={onClear}
        status={status}
      />
    </div>
  )
}
