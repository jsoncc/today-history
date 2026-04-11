/// <reference types="vite/client" />
/** Vue 单文件组件、Vite 注入的环境变量类型声明 */

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<object, object, unknown>
  export default component
}

interface ImportMetaEnv {
  readonly VITE_BAIDU_APP_ID?: string
  readonly VITE_BAIDU_SECRET?: string
  readonly VITE_BAIDU_TRANSLATE_URL?: string
  /** 可选：完整统计 URL（须以 /stats 结尾或 Worker 根由前端拼 /stats）。不填则用 VITE_BAIDU_TRANSLATE_URL + /stats */
  readonly VITE_SITE_STATS_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
