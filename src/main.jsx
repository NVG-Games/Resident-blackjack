import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { PeerProvider } from './contexts/PeerContext.jsx'

// Initialize Telegram Mini App SDK if running inside Telegram
const twa = window.Telegram?.WebApp
if (twa) {
  twa.ready()
  twa.expand()
}

createRoot(document.getElementById('root')).render(
  <PeerProvider>
    <App />
  </PeerProvider>
)
