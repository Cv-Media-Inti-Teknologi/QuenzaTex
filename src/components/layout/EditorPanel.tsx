export function EditorPanel() {
  return (
    <div className="h-full flex flex-col bg-white min-w-0 flex-1">
      <div className="flex items-center px-3 h-10 border-b border-[var(--border)] shrink-0">
        <span className="text-sm text-gray-500">untitled.tex</span>
      </div>
      <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
        <p>Editor area — Monaco will go here</p>
      </div>
    </div>
  )
}
