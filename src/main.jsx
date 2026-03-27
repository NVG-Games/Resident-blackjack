import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { PeerProvider } from './contexts/PeerContext.jsx'

createRoot(document.getElementById('root')).render(
  <PeerProvider>
    <App />
  </PeerProvider>
)
