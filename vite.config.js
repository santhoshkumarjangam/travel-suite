import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/auth': 'http://localhost:8000',
      '/trips': 'http://localhost:8000',
      '/expenses': 'http://localhost:8000',
      '/media': 'http://localhost:8000',
    }
  }
})
