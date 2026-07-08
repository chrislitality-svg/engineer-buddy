import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // 生产部署时设 VITE_BASE_URL=/hb/engineer-buddy/（dev 保持 /）
  base: process.env.VITE_BASE_URL ?? '/',
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: `http://localhost:${process.env.PROXY_PORT ?? 3001}`,
        changeOrigin: true,
      },
    },
  },
})
