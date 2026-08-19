import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  envDir: '../backend',
  server: {
    host: '0.0.0.0',
    port: 7170,
    allowedHosts: true,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/token': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      }
    }
  }
})
