import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Dev proxy forwards /api/* to the local backend running on :3001.
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
})
