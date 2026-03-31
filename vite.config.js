import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  base: '/today-history/', // 对应你的 GitHub 仓库名
  publicDir: 'public'      // 确保 public 目录的 md 文件可访问
})
