import "./watermark.css";
import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App'
import { AuthProvider } from './lib/auth'
import './index.css'
import { OfflineBanner } from './components/OfflineBanner'
import { registerSW } from './lib/sw'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HashRouter>
      <AuthProvider>
        <OfflineBanner />
        <App />
      </AuthProvider>
    </HashRouter>
  </React.StrictMode>
)

registerSW()
