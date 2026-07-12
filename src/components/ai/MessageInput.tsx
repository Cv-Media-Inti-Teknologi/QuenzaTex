import { useState, useCallback, useRef, useEffect } from "react"
import { MentionDropdown } from "./MentionDropdown"
import { cn } from "@/lib/utils"

interface FileSuggestion {
  name: string
  path: string
}

interface Props {
  onSend: (message: string) => void
  disabled: boolean
}

export function MessageInput({ onSend, disabled }: Props) {
  const [text, setText] = useState("")
  const [showMentions, setShowMentions] = useState(false)
  const [mentionQuery, setMentionQuery] = useState("")
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-grow the textarea up to a max height
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = "auto"
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`
  }, [text])

  const handleChange = useCallback((value: string) => {
    setText(value)
    const atIndex = value.lastIndexOf("@")
    if (atIndex !== -1 && !/\s/.test(value.slice(atIndex + 1))) {
      setMentionQuery(value.slice(atIndex + 1))
      setShowMentions(true)
    } else {
      setShowMentions(false)
    }
  }, [])

  const handleSelectFile = useCallback((file: FileSuggestion) => {
    setText((prev) => {
      const atIndex = prev.lastIndexOf("@")
      return prev.slice(0, atIndex) + `@${file.name} `
    })
    setShowMentions(false)
    textareaRef.current?.focus()
  }, [])

  const handleSubmit = useCallback(() => {
    const trimmed = text.trim()
    if (!trimmed || disabled) return
    onSend(trimmed)
    setText("")
    setShowMentions(false)
  }, [text, disabled, onSend])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault()
        handleSubmit()
      }
    },
    [handleSubmit]
  )

  return (
    <div className="border-t p-3 shrink-0">
      <div className="relative flex items-end gap-2">
        <div className="relative flex-1">
          <textarea
            ref={textareaRef}
            rows={1}
            value={text}
            onChange={(e) => handleChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask AI to build or edit your LaTeX…  (@ to mention files)"
            disabled={disabled}
            className="message-input w-full resize-none border border-input bg-background text-sm shadow-sm placeholder:text-muted-foreground leading-relaxed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-ring disabled:opacity-50 disabled:cursor-not-allowed max-h-40 overflow-y-auto"
          />
          {showMentions && (
            <MentionDropdown
              query={mentionQuery}
              onSelect={handleSelectFile}
              onClose={() => setShowMentions(false)}
            />
          )}
        </div>
      </div>
      <p className="mt-1.5 px-1 text-[9px] text-muted-foreground opacity-80">
        Enter to send · Shift+Enter for new line
      </p>
    </div>
  )
}
