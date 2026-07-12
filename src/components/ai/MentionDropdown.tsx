import { useState, useEffect, useRef } from "react"

interface FileSuggestion {
  name: string
  path: string
}

interface Props {
  query: string
  onSelect: (file: FileSuggestion) => void
  onClose: () => void
}

export function MentionDropdown({ query, onSelect, onClose }: Props) {
  const [suggestions, setSuggestions] = useState<FileSuggestion[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // In a real implementation, we'd scan the project directory
    const mockFiles: FileSuggestion[] = []
    setSuggestions(
      mockFiles.filter((f) =>
        f.name.toLowerCase().includes(query.toLowerCase())
      )
    )
    setSelectedIndex(0)
  }, [query])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault()
        setSelectedIndex((i) => Math.min(i + 1, suggestions.length - 1))
      }
      if (e.key === "ArrowUp") {
        e.preventDefault()
        setSelectedIndex((i) => Math.max(i - 1, 0))
      }
      if (e.key === "Enter" && suggestions[selectedIndex]) {
        e.preventDefault()
        onSelect(suggestions[selectedIndex])
      }
      if (e.key === "Escape") {
        onClose()
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [suggestions, selectedIndex, onSelect, onClose])

  if (suggestions.length === 0) return null

  return (
    <div
      ref={ref}
      className="absolute bottom-full left-0 right-0 bg-white border border-[var(--border)]
        rounded-lg shadow-lg max-h-48 overflow-y-auto mb-1"
    >
      {suggestions.map((s, i) => (
        <button
          key={s.path}
          onClick={() => onSelect(s)}
          className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2
            ${i === selectedIndex ? "bg-blue-50 text-blue-700" : "text-gray-700 hover:bg-[var(--muted)]"}`}
        >
          {s.name}
        </button>
      ))}
    </div>
  )
}
