import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
const host = process.env.TAURI_DEV_HOST

export default defineConfig({
  plugins: [react()],
  base: './',
  root: 'src-ui',
  build: {
    outDir: '../dist-renderer',
    emptyOutDir: true,
    target: 'es2021',
  },
  server: {
    port: 5173,
    host: host || true,
    strictPort: true,
  },
  optimizeDeps: {
    include: ['leaflet']
  },
  resolve: {
    alias: {
      'leaflet': path.resolve(__dirname, 'node_modules/leaflet')
    }
  },
  clearScreen: false,
  envPrefix: ['VITE_', 'TAURI_'],
})
