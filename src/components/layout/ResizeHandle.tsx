import { useCallback, useRef } from "react"

interface Props {
  onResize: (delta: number) => void
  position?: "vertical" | "horizontal"
}

export function ResizeHandle({ onResize, position = "vertical" }: Props) {
  const dragging = useRef(false)
  const startPos = useRef(0)

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    dragging.current = true
    startPos.current = position === "vertical" ? e.clientX : e.clientY
    document.body.style.cursor = position === "vertical" ? "col-resize" : "row-resize"
    document.body.style.userSelect = "none"

    const onMouseMove = (ev: MouseEvent) => {
      if (!dragging.current) return
      const current = position === "vertical" ? ev.clientX : ev.clientY
      const delta = current - startPos.current
      startPos.current = current
      onResize(delta)
    }

    const onMouseUp = () => {
      dragging.current = false
      document.body.style.cursor = ""
      document.body.style.userSelect = ""
      document.removeEventListener("mousemove", onMouseMove)
      document.removeEventListener("mouseup", onMouseUp)
    }

    document.addEventListener("mousemove", onMouseMove)
    document.addEventListener("mouseup", onMouseUp)
  }, [onResize, position])

  if (position === "vertical") {
    return (
      <div
        onMouseDown={onMouseDown}
        className="w-[5px] cursor-col-resize hover:bg-blue-400 active:bg-blue-500
          bg-[var(--border)] shrink-0 relative transition-colors"
      />
    )
  }

  return (
    <div
      onMouseDown={onMouseDown}
      className="h-[5px] cursor-row-resize hover:bg-blue-400 active:bg-blue-500
        bg-[var(--border)] shrink-0 transition-colors"
    />
  )
}
