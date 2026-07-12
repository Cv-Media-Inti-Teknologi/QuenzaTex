import { useEffect, useRef } from "react"
import { Bot, User, Loader2 } from "lucide-react"
import { MessageInput } from "./MessageInput"

interface ChatMessage {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
}

interface Props {
  messages: ChatMessage[]
  sending: boolean
  onSend: (message: string) => void
  onClear: () => void
}

export function ChatView({ messages, sending, onSend, onClear }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  return (
    <div className="flex-1 flex flex-col">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--border)] shrink-0">
        <div />
        {messages.length > 0 && (
          <button
            onClick={onClear}
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center mt-12">
            <Bot size={36} className="mx-auto text-gray-300 mb-3" />
            <p className="text-sm text-gray-400">
              Start a conversation with AI
            </p>
            <p className="text-xs text-gray-300 mt-1">
              Use @filename.tex to reference files
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0
                ${msg.role === "user"
                  ? "bg-blue-100 text-blue-600"
                  : "bg-gray-100 text-gray-600"}`}
            >
              {msg.role === "user" ? <User size={15} /> : <Bot size={15} />}
            </div>
            <div
              className={`max-w-[80%] px-4 py-2.5 rounded-xl text-sm leading-relaxed
                ${msg.role === "user"
                  ? "bg-blue-500 text-white rounded-tr-sm"
                  : "bg-gray-50 text-gray-700 rounded-tl-sm border border-gray-100"}`}
            >
              <p className="whitespace-pre-wrap">{msg.content}</p>
            </div>
          </div>
        ))}

        {sending && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center shrink-0">
              <Bot size={15} />
            </div>
            <div className="bg-gray-50 px-4 py-2.5 rounded-xl rounded-tl-sm border border-gray-100">
              <Loader2 size={18} className="animate-spin text-gray-400" />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <MessageInput onSend={onSend} disabled={sending} />
    </div>
  )
}
