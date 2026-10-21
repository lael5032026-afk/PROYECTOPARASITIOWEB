import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import Storefront from './Storefront'
import SoftwareCatalog from './SoftwareCatalog'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {window.location.pathname === '/tienda' ? <Storefront /> : window.location.pathname === '/software' ? <SoftwareCatalog /> : <App />}
  </StrictMode>,
)
