import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { client } from './api/client.gen'

client.setConfig({ baseUrl: import.meta.env.VITE_API_BASE_URL ?? '' })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
