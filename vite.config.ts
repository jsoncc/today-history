import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

const baiduTranslateProxy = {
  '/baidu-fanyi': {
    target: 'https://fanyi-api.baidu.com',
    changeOrigin: true,
    rewrite: () => '/api/trans/vip/translate'
  }
}

export default defineConfig({
  plugins: [vue()],
  base: './',
  server: {
    port: 3000,
    open: true,
    proxy: baiduTranslateProxy
  },
  preview: {
    proxy: baiduTranslateProxy
  }
})
