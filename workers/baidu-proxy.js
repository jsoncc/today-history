/**
 * Cloudflare Worker：把浏览器 POST 原样转发到百度翻译 API，解决 GitHub Pages 等静态站的跨域问题。
 *
 * 部署（需 Node 与 Cloudflare 账号）：
 *   cd workers
 *   npx wrangler login
 *   npx wrangler deploy
 *
 * 部署成功后得到 https://xxx.workers.dev ，在 GitHub 仓库 Settings → Secrets and variables → Actions
 * 增加 VITE_BAIDU_TRANSLATE_URL=https://xxx.workers.dev（不要末尾斜杠也可）
 *
 * 注意：本 Worker 不保存密钥；签名仍由前端计算（与当前项目一致）。
 */
export default {
  async fetch(request) {
    const cors = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: cors })
    }
    if (request.method !== 'POST') {
      return new Response('POST only', { status: 405, headers: cors })
    }
    const body = await request.text()
    const res = await fetch('https://fanyi-api.baidu.com/api/trans/vip/translate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'
      },
      body
    })
    const text = await res.text()
    return new Response(text, {
      status: res.status,
      headers: {
        ...cors,
        'Content-Type': res.headers.get('content-type') || 'application/json; charset=utf-8'
      }
    })
  }
}
