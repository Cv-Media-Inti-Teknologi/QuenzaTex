export function PreviewPanel() {
  return (
    <div className="h-full flex flex-col bg-white min-w-0 flex-1">
      <div className="flex items-center px-3 h-10 border-b border-[var(--border)] shrink-0">
        <span className="text-sm text-gray-500">Preview</span>
      </div>
      <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
        <p>PDF preview will go here</p>
      </div>
    </div>
  )
}
