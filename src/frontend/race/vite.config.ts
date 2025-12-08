import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:5000', //where to forward requests with /api/* path
      '/socket.io': { //where to forward /socket.io/* requests
        target: 'http://localhost:5000',
        ws: true, //allow websocket upgrades 
        changeOrigin: true, //change origin and target headers to match (avoids CORS issues)
      },
    },
  },
});

