import { ChatView } from "../ai/ChatView"

interface Props {
  width?: number
  onClose: () => void
  messages: { id: string; role: "user" | "assistant"; content: string; timestamp: Date }[]
  sending: boolean
  onSend: (message: string) => void
  onClear: () => void
}

export function AIPanel({ onClose, messages, sending, onSend, onClear }: Props) {
  return (
    <div className="h-full w-full flex flex-col min-h-0 bg-background border-l">
      <ChatView
        messages={messages}
        sending={sending}
        onSend={onSend}
        onClear={onClear}
        onClose={onClose}
      />
    </div>
  )
}
