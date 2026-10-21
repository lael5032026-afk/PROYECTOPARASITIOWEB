import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import Storefront from './Storefront'
import SoftwareCatalog from './SoftwareCatalog'

const publicStoreOnly = import.meta.env.VITE_PUBLIC_STORE_ONLY === 'true'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {publicStoreOnly
      ? window.location.pathname === '/software' ? <SoftwareCatalog /> : <Storefront />
      : window.location.pathname === '/tienda' ? <Storefront /> : window.location.pathname === '/software' ? <SoftwareCatalog /> : <App />}
  </StrictMode>,
)
