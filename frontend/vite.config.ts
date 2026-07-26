import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [tailwindcss(), react()],
  server: {
    proxy: {
      '/api': {
        target: 'https://coding-plateform-5gvy.vercel.app',
        changeOrigin: true,
        secure: false,
      },
      '/admin/queues': {
        target: 'https://coding-plateform-5gvy.vercel.app',
        changeOrigin: true,
        secure: false,
      },
      '/health': {
        target: 'https://coding-plateform-5gvy.vercel.app',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
