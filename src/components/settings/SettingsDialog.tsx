import { RotateCcw, Bot, FileEdit, FileText, Wrench } from "lucide-react"
import { AiProviderConfig } from "./AiProviderConfig"
import { EnvStatus } from "./EnvStatus"
import { useSettings } from "../../store/SettingsContext"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface Props {
  onClose: () => void
}

export function SettingsDialog({ onClose }: Props) {
  const { settings, updateEditor, updateLatex, resetSettings } = useSettings()

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[680px] max-w-[92vw] h-[85vh] max-h-[85vh] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            <Wrench size={18} className="text-muted-foreground" />
            Settings
          </DialogTitle>
          <DialogDescription>
            Configure your AI provider, editor, and LaTeX compilation.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="ai" className="flex flex-col flex-1 min-h-0">
          <div className="px-6 pt-4">
            <TabsList>
              <TabsTrigger value="ai">
                <Bot size={14} /> AI Provider
              </TabsTrigger>
              <TabsTrigger value="editor">
                <FileEdit size={14} /> Editor
              </TabsTrigger>
              <TabsTrigger value="latex">
                <FileText size={14} /> LaTeX
              </TabsTrigger>
              <TabsTrigger value="env">
                <Wrench size={14} /> Environment
              </TabsTrigger>
            </TabsList>
          </div>

          <ScrollArea className="flex-1 min-h-0">
            <div className="px-6 py-5">
              <TabsContent value="ai" className="mt-0">
                <AiProviderConfig />
              </TabsContent>

              <TabsContent value="editor" className="mt-0 space-y-5">
                <div className="space-y-2">
                  <Label>Font size</Label>
                  <Input
                    type="number"
                    value={settings.editor.fontSize}
                    onChange={(e) =>
                      updateEditor({ fontSize: parseInt(e.target.value) || 14 })
                    }
                    className="w-32"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Word wrap</Label>
                  <Select
                    value={settings.editor.wordWrap}
                    onValueChange={(v) =>
                      updateEditor({ wordWrap: v as "on" | "off" })
                    }
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="off">Off</SelectItem>
                      <SelectItem value="on">On</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.editor.minimap}
                    onChange={(e) => updateEditor({ minimap: e.target.checked })}
                    className="rounded border-input"
                  />
                  <span className="text-sm text-foreground">Show minimap</span>
                </label>
              </TabsContent>

              <TabsContent value="latex" className="mt-0 space-y-5">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.latex.autoCompile}
                    onChange={(e) =>
                      updateLatex({ autoCompile: e.target.checked })
                    }
                    className="rounded border-input"
                  />
                  <span className="text-sm text-foreground">
                    Auto-compile on save
                  </span>
                </label>
              </TabsContent>

              <TabsContent value="env" className="mt-0">
                <EnvStatus />
              </TabsContent>
            </div>
          </ScrollArea>
        </Tabs>

        <div className="flex items-center justify-between px-6 py-4 border-t">
          <Button
            variant="ghost"
            onClick={resetSettings}
            className="gap-1.5 text-muted-foreground hover:text-destructive"
          >
            <RotateCcw size={14} />
            Reset to default
          </Button>
          <Button onClick={onClose}>Done</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
