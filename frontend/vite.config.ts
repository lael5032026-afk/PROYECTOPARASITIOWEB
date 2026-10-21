import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'LAEL Nexus',
        short_name: 'LAEL Nexus',
        description: 'Unifica. Automatiza. Evoluciona.',
        theme_color: '#0a0a0a',
        background_color: '#0a0a0a',
        display: 'standalone',
        icons: []
      }
    })
  ],
  server: {
    port: 5173,
    proxy: { '/api': { target: 'http://localhost:5080', changeOrigin: true } }
  },
  preview: {
    proxy: { '/api': { target: 'http://localhost:5080', changeOrigin: true } }
  }
})
