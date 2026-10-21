import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import Storefront from './Storefront'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {window.location.pathname === '/tienda' ? <Storefront /> : <App />}
  </StrictMode>,
)
