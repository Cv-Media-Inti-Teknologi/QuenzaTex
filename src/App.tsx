import { SettingsProvider } from "./store/SettingsContext"
import { AppLayout } from "./components/layout/AppLayout"
import { TooltipProvider } from "./components/ui/tooltip"
import { Toaster } from "./components/ui/sonner"

function App() {
  return (
    <SettingsProvider>
      <TooltipProvider delayDuration={300}>
        <AppLayout />
        <Toaster position="bottom-right" richColors closeButton />
      </TooltipProvider>
    </SettingsProvider>
  )
}

export default App
