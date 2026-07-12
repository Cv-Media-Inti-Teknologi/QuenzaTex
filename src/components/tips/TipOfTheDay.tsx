import { useState, useEffect } from "react"
import { Lightbulb, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useSettings } from "../../store/SettingsContext"
import tipImg from "../../assets/tip.png"

const TIPS = [
  "Use Ctrl+B to quickly toggle the Explorer panel and get more screen space for your code.",
  "Use Ctrl+J to toggle the AI Assistant panel whenever you need help writing LaTeX.",
  "QuenzaTex auto-compiles your LaTeX document every time you save.",
  "Stuck on a complex equation? Just ask the AI to generate the LaTeX code for you.",
  "You can mention files in the AI chat using '@' to give the assistant more context.",
  "Need to adjust the font size? Open Settings via the gear icon or press Ctrl+,.",
  "The AI panel preserves your conversation history, so you can always review previous answers.",
  "Turn on Word Wrap in Settings if you prefer reading long paragraphs without scrolling.",
  "QuenzaTex supports multiple AI providers. Configure them in the Settings dialog.",
  "If your LaTeX build fails, the AI Assistant can automatically analyze the log and suggest a fix.",
  "Use the preview panel to view your compiled PDF side-by-side with your code.",
  "Press Ctrl+Enter while editing to manually trigger a LaTeX compilation.",
  "Hover over LaTeX commands to see quick tooltips and documentation (if configured).",
  "You can resize any panel by dragging the handle between them.",
  "Right-click in the editor to format your LaTeX code and keep it tidy.",
  "Organize your project by creating folders directly from the Explorer panel.",
  "The setup wizard ensures you have Node, opencode, and TeX Live installed correctly.",
  "You can change the default AI model in Settings if you need a more powerful assistant.",
  "QuenzaTex runs locally! Your files stay on your machine unless you use a cloud AI provider.",
  "Use the mini-map in the editor to quickly navigate through large documents.",
  "Want a distraction-free environment? Hide both the Explorer and the AI Panel.",
  "You can click on errors in the compilation log to jump straight to the problematic line.",
  "Use the chat panel to ask general questions about LaTeX formatting or best practices.",
  "Clicking 'Reset to default' in Settings will restore all your original configurations.",
  "QuenzaTex automatically detects images in your project so you can preview them instantly.",
  "Keep your main .tex file open to ensure the compiler knows what to build.",
  "The integrated PDF viewer supports zooming and scrolling just like a standalone app.",
  "You can use standard VS Code keyboard shortcuts for text editing inside QuenzaTex.",
  "Don't forget to include necessary LaTeX packages in your preamble before using custom commands.",
  "Need a quick table? Ask the AI Assistant to generate the LaTeX table structure for you."
]

interface Props {
  onClose: () => void
}

export function TipOfTheDay({ onClose }: Props) {
  const { updateGeneral } = useSettings()
  const [tip, setTip] = useState("")
  const [dontShow, setDontShow] = useState(false)

  useEffect(() => {
    // Pick a random tip on mount
    const randomTip = TIPS[Math.floor(Math.random() * TIPS.length)]
    setTip(randomTip)
  }, [])

  const handleClose = () => {
    if (dontShow) {
      updateGeneral({ showTipOfTheDay: false })
    }
    onClose()
  }

  if (!tip) return null

  return (
    <div className="fixed inset-0 z-[60] bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card text-card-foreground shadow-2xl rounded-2xl w-full max-w-lg overflow-hidden border flex flex-col relative animate-in zoom-in-95 duration-200">
        <button 
          onClick={handleClose}
          className="absolute top-4 right-4 z-10 p-1 bg-background/50 backdrop-blur rounded-full hover:bg-background/80 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="h-48 bg-muted w-full relative overflow-hidden">
          <img 
            src={tipImg} 
            alt="Tip of the Day" 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
        </div>

        <div className="p-6 pt-2">
          <div className="flex items-center gap-2 text-primary font-semibold text-lg mb-3">
            <Lightbulb className="w-5 h-5" />
            Tip of the Day
          </div>
          
          <p className="text-muted-foreground leading-relaxed text-base min-h-[4rem]">
            {tip}
          </p>

          <div className="mt-8 flex items-center justify-between border-t pt-4">
            <label className="flex items-center gap-2 cursor-pointer group">
              <input 
                type="checkbox" 
                checked={dontShow}
                onChange={(e) => setDontShow(e.target.checked)}
                className="rounded border-input text-primary focus:ring-primary"
              />
              <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                Don't show this again
              </span>
            </label>
            
            <Button onClick={handleClose}>
              Got it
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
