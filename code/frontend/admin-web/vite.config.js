import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// 管理端：开发端口 5174。组长后端未开 CORS，开发期走 Vite 代理（与用户端同源策略一致）。
const backend = process.env.SKY_BACKEND || 'http://127.0.0.1:8080'

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5174,
    host: '127.0.0.1',
    proxy: {
      '/user': { target: backend, changeOrigin: true },
      '/admin': { target: backend, changeOrigin: true },
      '/assets': { target: backend, changeOrigin: true },
      '/openapi.yaml': { target: backend, changeOrigin: true },
      '/doc.html': { target: backend, changeOrigin: true }
    }
  },
  build: {
    outDir: 'dist',
    chunkSizeWarningLimit: 1500 // Element Plus 全量引入，主包约 1.3 MB；按需引入排入后续优化
  }
})
