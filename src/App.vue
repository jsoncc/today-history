<template>
  <div class="home">
    <h1 class="page-title">主页</h1>
    <div class="list-card">
      <div class="list-item" v-for="item in dateList" :key="item.date">
        <a 
          :href="`#/history/${item.date}`" 
          class="date-link"
          @click.prevent="goToHistory(item.date)"
        >
          历史上的今天 · {{ item.date }}
        </a>
      </div>
    </div>

    <!-- 点击日期后，渲染对应 md 内容 -->
    <MarkdownViewer v-if="showViewer" :mdContent="currentMdContent" @close="closeHistory" />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import MarkdownViewer from './components/MarkdownViewer.vue'

// 使用 import.meta.glob 自动读取 assets/history 目录下的所有 md 文件（作为原始文本）
const historyFiles = import.meta.glob('./assets/history/*.md', { eager: true, query: '?raw', import: 'default' })

// 从文件路径中提取日期并生成 dateList
const dateList = computed(() => {
  const dates = Object.keys(historyFiles)
    .map(path => {
      // 从路径 ./assets/history/history-2026-03-30.md 中提取日期 2026-03-30
      const match = path.match(/history-(\d{4}-\d{2}-\d{2})\.md$/)
      return match ? match[1] : null
    })
    .filter(date => date !== null)
    .sort((a, b) => new Date(b) - new Date(a)) // 按日期降序排列
    .map(date => ({ date }))
  
  return dates
})

const currentMdContent = ref('')
const showViewer = ref(false)

// 点击日期，加载对应 md 文件
const goToHistory = (date) => {
  const filePath = `./assets/history/history-${date}.md`
  if (historyFiles[filePath]) {
    currentMdContent.value = historyFiles[filePath].default || historyFiles[filePath]
    showViewer.value = true
  }
}

// 关闭历史详情弹窗
const closeHistory = () => {
  showViewer.value = false
  currentMdContent.value = ''
}
</script>

<style scoped>
.home {
  max-width: 900px;
  margin: 0 auto;
  padding: 40px 20px;
}
.page-title {
  text-align: center;
  font-size: 32px;
  margin-bottom: 30px;
  color: #1f2937;
}
.list-card {
  background: #fff;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.06);
  margin-bottom: 30px;
}
.list-item {
  padding: 16px 0;
  border-bottom: 1px solid #f0f0f0;
}
.list-item:last-child {
  border-bottom: none;
}
.date-link {
  font-size: 18px;
  color: #0969da;
  text-decoration: none;
  font-weight: 500;
}
.date-link:hover {
  text-decoration: underline;
}
</style>
