import { SettingsProvider } from "./store/SettingsContext"
import { AppLayout } from "./components/layout/AppLayout"

function App() {
  return (
    <SettingsProvider>
      <AppLayout />
    </SettingsProvider>
  )
}

export default App
