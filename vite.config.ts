/**
 * Vite 配置：base 为相对路径以适配 GitHub Pages 子目录；
 * 开发/预览时把 /baidu-fanyi 代理到百度翻译，避免本地跨域。
 */
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
