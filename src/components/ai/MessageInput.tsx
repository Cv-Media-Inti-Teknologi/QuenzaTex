import { useState, useCallback, useRef } from "react"
import { Send, Loader2 } from "lucide-react"
import { MentionDropdown } from "./MentionDropdown"

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
  const inputRef = useRef<HTMLInputElement>(null)

  const handleChange = useCallback((value: string) => {
    setText(value)

    const atIndex = value.lastIndexOf("@")
    if (atIndex !== -1) {
      const afterAt = value.slice(atIndex + 1)
      setMentionQuery(afterAt)
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
    inputRef.current?.focus()
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
    <div className="relative">
      <div className="flex items-end gap-3 p-4 border-t border-[var(--border)]">
        <div className="flex-1 relative">
          <input
            ref={inputRef}
            type="text"
            value={text}
            onChange={(e) => handleChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask AI... (@ to mention files)"
            disabled={disabled}
            className="w-full px-4 py-2.5 text-sm border border-[var(--border)] rounded-xl
              focus:outline-none focus:ring-2 focus:ring-blue-400/30 focus:border-blue-400
              disabled:opacity-50 disabled:cursor-not-allowed bg-white"
          />
          {showMentions && (
            <MentionDropdown
              query={mentionQuery}
              onSelect={handleSelectFile}
              onClose={() => setShowMentions(false)}
            />
          )}
        </div>
        <button
          onClick={handleSubmit}
          disabled={disabled || !text.trim()}
          className="flex items-center justify-center w-10 h-10 bg-blue-500 text-white rounded-xl
            hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0"
        >
          {disabled ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
        </button>
      </div>
    </div>
  )
}
