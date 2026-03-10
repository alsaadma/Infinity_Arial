import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
// https://vite.dev/config/
export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: false,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react','react-dom'],
          router: ['react-router-dom'],
          mui: ['@mui/material','@mui/icons-material'],
        }
      }
    }
  },
  plugins: [react()],
})