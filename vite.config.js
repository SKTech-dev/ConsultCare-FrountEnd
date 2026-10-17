import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: ['@daily-co/daily-js'],
  },
  server: {
    host: 'localhost',
    port: 5173,
    strictPort: true,
    proxy: { "/api": { target: "http://127.0.0.1:8000", changeOrigin: true, ws: true } },
  },
  preview: {
    proxy: { "/api": { target: process.env.E2E_API_TARGET || "http://127.0.0.1:8000", changeOrigin: true, ws: true } },
  },
})
