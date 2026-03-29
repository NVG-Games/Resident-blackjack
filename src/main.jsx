import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { PeerProvider } from './contexts/PeerContext.jsx'

// Initialize Telegram Mini App SDK if running inside Telegram
const twa = window.Telegram?.WebApp
if (twa) {
  twa.ready()
  twa.expand()

  // Prevent Telegram from intercepting vertical swipes (would collapse the mini app)
  twa.disableVerticalSwipes?.()

  // Keep --app-height in sync with Telegram's stable viewport height.
  // viewportStableHeight excludes the keyboard and Telegram UI chrome.
  function applyTgHeight() {
    const h = twa.viewportStableHeight
    if (h && h > 0) {
      document.documentElement.style.setProperty('--app-height', `${h}px`)
    }
  }
  applyTgHeight()
  // Telegram sometimes reports the height before it's stable — re-apply after a tick
  setTimeout(applyTgHeight, 100)
  setTimeout(applyTgHeight, 500)
  twa.onEvent('viewportChanged', applyTgHeight)
}

createRoot(document.getElementById('root')).render(
  <PeerProvider>
    <App />
  </PeerProvider>
)
