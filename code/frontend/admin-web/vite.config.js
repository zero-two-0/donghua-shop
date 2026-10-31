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
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        // 把 UI 库与框架单独分包：业务代码改动时不必重新下载 ~1.2 MB 的 vendor 包
        manualChunks: {
          'element-plus': ['element-plus', '@element-plus/icons-vue'],
          'vue-vendor': ['vue', 'vue-router', 'pinia'],
          axios: ['axios']
        }
      }
    }
  }
})
