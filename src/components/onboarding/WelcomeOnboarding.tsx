import { useState } from "react"
import { ChevronRight, ChevronLeft } from "lucide-react"
import { Button } from "@/components/ui/button"

import slide1Img from "../../assets/onboarding/slide1.png"
import slide2Img from "../../assets/onboarding/slide2.png"
import slide3Img from "../../assets/onboarding/slide3.png"

const SLIDES = [
  {
    title: "Distraction-Free LaTeX Editor",
    description: "Experience a clean, seamless environment designed specifically for LaTeX. Focus entirely on your writing without the clutter.",
    image: slide1Img
  },
  {
    title: "Real-Time PDF Preview",
    description: "See your document come to life instantly. QuenzaTex compiles your LaTeX code in real-time, side-by-side with your editor.",
    image: slide2Img
  },
  {
    title: "AI-Powered Assistance",
    description: "Stuck on an equation or an error? The built-in AI Assistant is always ready to generate, fix, or explain LaTeX code for you.",
    image: slide3Img
  }
]

interface Props {
  onComplete: () => void
}

export function WelcomeOnboarding({ onComplete }: Props) {
  const [step, setStep] = useState(0)

  const handleNext = () => {
    if (step < SLIDES.length - 1) {
      setStep(step + 1)
    } else {
      onComplete()
    }
  }

  const handlePrev = () => {
    if (step > 0) {
      setStep(step - 1)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card text-card-foreground shadow-2xl rounded-2xl w-full max-w-2xl overflow-hidden border flex flex-col">
        <div className="relative h-72 bg-muted flex items-center justify-center overflow-hidden">
          <img 
            key={step} // Force re-render animation
            src={SLIDES[step].image} 
            alt={SLIDES[step].title}
            className="object-cover w-full h-full opacity-90 animate-in fade-in duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
        </div>
        
        <div className="p-8 flex flex-col items-center text-center">
          <div className="flex gap-2 mb-6">
            {SLIDES.map((_, i) => (
              <div 
                key={i} 
                className={`h-2 rounded-full transition-all duration-300 ${i === step ? "w-8 bg-primary" : "w-2 bg-muted-foreground/30"}`}
              />
            ))}
          </div>
          
          <h2 className="text-2xl font-bold mb-3">{SLIDES[step].title}</h2>
          <p className="text-muted-foreground mb-8 max-w-md leading-relaxed">
            {SLIDES[step].description}
          </p>
          
          <div className="flex items-center justify-between w-full mt-auto">
            <Button variant="ghost" className="text-muted-foreground" onClick={onComplete}>
              Skip
            </Button>
            
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                onClick={handlePrev}
                disabled={step === 0}
                className={step === 0 ? "invisible" : ""}
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Previous
              </Button>
              <Button onClick={handleNext}>
                {step === SLIDES.length - 1 ? "Get Started" : "Next"}
                {step !== SLIDES.length - 1 && <ChevronRight className="w-4 h-4 ml-1" />}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
