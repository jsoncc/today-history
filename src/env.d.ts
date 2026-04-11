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
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
