import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// 用户端 H5：开发端口 5173。
// 组长后端未配置 CORS，开发期必须走 Vite 代理：/user、/admin、/assets 转发到 8080，
// 这样前端请求路径与契约（/user/**）完全一致，构建后由 Nginx 做同样反代。
const backend = process.env.SKY_BACKEND || 'http://127.0.0.1:8080'

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5173,
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
    chunkSizeWarningLimit: 900
  }
})
