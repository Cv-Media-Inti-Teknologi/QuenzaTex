import { Keyboard } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"

interface Props {
  onClose: () => void
}

const isMac =
  typeof navigator !== "undefined" && /Mac/i.test(navigator.platform)
const mod = isMac ? "⌘" : "Ctrl"

const SHORTCUTS: { group: string; items: { keys: string[]; label: string }[] }[] = [
  {
    group: "General",
    items: [
      { keys: [mod, "O"], label: "Open folder" },
      { keys: [mod, "S"], label: "Save file" },
      { keys: [mod, ","], label: "Open settings" },
      { keys: [mod, "/"], label: "Keyboard shortcuts" },
    ],
  },
  {
    group: "View",
    items: [
      { keys: [mod, "B"], label: "Toggle Explorer" },
      { keys: [mod, "J"], label: "Toggle AI Panel" },
    ],
  },
  {
    group: "LaTeX",
    items: [{ keys: [mod, "Enter"], label: "Compile current .tex file" }],
  },
  {
    group: "AI Chat",
    items: [
      { keys: ["Enter"], label: "Send message" },
      { keys: ["Shift", "Enter"], label: "New line" },
      { keys: ["@"], label: "Mention a file" },
    ],
  },
]

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex items-center justify-center min-w-[24px] h-6 px-1.5 rounded-md border bg-muted text-[11px] font-medium text-foreground shadow-sm">
      {children}
    </kbd>
  )
}

export function ShortcutsDialog({ onClose }: Props) {
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[520px] max-w-[92vw] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard size={18} className="text-muted-foreground" />
            Keyboard Shortcuts
          </DialogTitle>
          <DialogDescription>
            Speed up your workflow with these shortcuts.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {SHORTCUTS.map((section) => (
            <div key={section.group}>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                {section.group}
              </p>
              <div className="space-y-1.5">
                {section.items.map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-foreground/80">{item.label}</span>
                    <span className="flex items-center gap-1">
                      {item.keys.map((k, i) => (
                        <Kbd key={i}>{k}</Kbd>
                      ))}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
