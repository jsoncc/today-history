/**
 * Cloudflare Worker：浏览器 POST 原样转发到百度翻译 API，解决 GitHub Pages 静态站无法直连（CORS）的问题。
 *
 * 部署：cd workers → npx wrangler login → npx wrangler deploy
 * 将得到的 https://xxx.workers.dev 写入 GitHub Secret：VITE_BAIDU_TRANSLATE_URL
 *
 * 密钥仍只在前端用环境变量配置；本 Worker 只做转发，不存 appid/secret。
 */
export default {
  async fetch(request: Request): Promise<Response> {
    const cors: Record<string, string> = {
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
