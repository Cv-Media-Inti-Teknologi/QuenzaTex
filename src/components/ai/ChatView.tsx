import { useEffect, useRef } from "react"
import { Bot, User, Loader2, Sparkles, PanelRightClose } from "lucide-react"
import { MessageInput } from "./MessageInput"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

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
  onClose?: () => void
}

export function ChatView({ messages, sending, onSend, onClear, onClose }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, sending])

  return (
    <div className="flex flex-1 flex-col min-h-0">
      {/* Header */}
      <div className="flex items-center justify-between px-4 h-11 border-b shrink-0">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Sparkles size={15} className="text-primary" />
          <span>AI Assistant</span>
        </div>
        <div className="flex items-center gap-1.5">
          {messages.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClear}
              className="h-7 text-xs text-muted-foreground"
            >
              Clear
            </Button>
          )}
          {onClose && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={onClose}
                  className="text-muted-foreground"
                >
                  <PanelRightClose size={16} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Close panel (Ctrl+J)</TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>

      {/* Scrollable messages — min-h-0 lets this flex child shrink so overflow works */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="px-6 py-6 space-y-6">
          {messages.length === 0 && (
            <div className="text-center mt-16 px-4">
              <div className="mx-auto w-12 h-12 rounded-2xl bg-accent flex items-center justify-center mb-4">
                <Bot size={24} className="text-primary" />
              </div>
              <p className="text-sm font-medium text-foreground">
                Start a conversation
              </p>
              <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                Ask the AI to create, edit, or explain your LaTeX files.
                <br />
                Use <span className="font-mono text-primary">@filename.tex</span> to reference files.
              </p>
            </div>
          )}

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                "flex gap-3",
                msg.role === "user" ? "flex-row-reverse" : ""
              )}
            >
              <div
                className={cn(
                  "w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5",
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-accent text-primary"
                )}
              >
                {msg.role === "user" ? <User size={14} /> : <Bot size={14} />}
              </div>
              <div
                className={`chat-bubble ${
                  msg.role === "user" ? "chat-bubble-user" : "chat-bubble-bot"
                }`}
              >
                <p className="whitespace-pre-wrap">{msg.content}</p>
              </div>
            </div>
          ))}

          {sending && (
            <div className="flex gap-3">
              <div className="w-7 h-7 rounded-lg bg-accent text-primary flex items-center justify-center shrink-0 mt-0.5">
                <Bot size={14} />
              </div>
              <div className="chat-bubble chat-bubble-bot flex items-center gap-2">
                <Loader2 size={15} className="animate-spin text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Thinking…</span>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      <MessageInput onSend={onSend} disabled={sending} />
    </div>
  )
}
