import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: '/travel-suite/',
  plugins: [react()],
  server: {
    proxy: {
      '/auth': 'https://travel-suite-api-595745089080.us-central1.run.app',
      '/trips': 'https://travel-suite-api-595745089080.us-central1.run.app',
      '/expenses': 'https://travel-suite-api-595745089080.us-central1.run.app',
      '/media': 'https://travel-suite-api-595745089080.us-central1.run.app',
    }
  }
})
