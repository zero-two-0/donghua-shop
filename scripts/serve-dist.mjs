// 用“静态资源 + 接口反代”模拟 Nginx 部署，验证 dist 产物可以脱离 Vite 独立运行。
// 本机未安装 Nginx，因此这里实现与 deploy/nginx.conf 相同的两条规则：
//   1) 其余路径 → 静态文件（找不到回退 index.html，hash 路由不影响）
//   2) /user、/admin、/assets、/openapi.yaml、/doc.html → 反代到后端
// 用法：node scripts/serve-dist.mjs <dist目录> <端口> [后端地址]
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'

const [, , distDir, portArg, backendArg] = process.argv
if (!distDir || !portArg) {
  console.error('用法: node scripts/serve-dist.mjs <dist目录> <端口> [后端地址]')
  process.exit(2)
}
const PORT = Number(portArg)
const BACKEND = backendArg || 'http://127.0.0.1:8080'
const ROOT = path.resolve(distDir)
// 注意：Vite 产物也放在 /assets/ 下（js/css），后端菜品图是 /assets/*.svg
// 因此只把 .svg 反代给后端，其余 /assets/* 仍走静态文件，否则入口 JS 会 404
const PROXY_PREFIX = ['/user/', '/admin/', '/openapi.yaml', '/doc.html', '/webjars/']
const PROXY_ASSET = /^\/assets\/.+\.svg(\?|$)/

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.map': 'application/json; charset=utf-8'
}

function isProxy(url) {
  if (PROXY_ASSET.test(url)) return true
  return PROXY_PREFIX.some((p) => (p.endsWith('/') ? url.startsWith(p) : url === p || url.startsWith(p + '?')))
}

async function proxy(req, res, url) {
  const target = BACKEND + url
  const chunks = []
  for await (const c of req) chunks.push(c)
  const body = chunks.length ? Buffer.concat(chunks) : undefined
  try {
    const r = await fetch(target, {
      method: req.method,
      headers: {
        'content-type': req.headers['content-type'] || 'application/json',
        ...(req.headers.authorization ? { authorization: req.headers.authorization } : {})
      },
      body
    })
    const buf = Buffer.from(await r.arrayBuffer())
    const headers = { 'content-type': r.headers.get('content-type') || 'application/json' }
    res.writeHead(r.status, headers)
    res.end(buf)
  } catch (e) {
    res.writeHead(502, { 'content-type': 'application/json' })
    res.end(JSON.stringify({ error: 'backend unreachable', detail: e.message }))
  }
}

function serveStatic(url, res) {
  const clean = decodeURIComponent(url.split('?')[0])
  let file = path.join(ROOT, clean)
  if (!file.startsWith(ROOT)) {
    res.writeHead(403).end('forbidden')
    return
  }
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    // 单页应用回退
    file = path.join(ROOT, 'index.html')
  }
  if (!fs.existsSync(file)) {
    res.writeHead(404).end('not found')
    return
  }
  const ext = path.extname(file).toLowerCase()
  res.writeHead(200, { 'content-type': MIME[ext] || 'application/octet-stream' })
  fs.createReadStream(file).pipe(res)
}

http.createServer((req, res) => {
  const url = req.url || '/'
  if (isProxy(url)) proxy(req, res, url)
  else serveStatic(url, res)
}).listen(PORT, '127.0.0.1', () => {
  console.log(`[serve-dist] ${ROOT} → http://127.0.0.1:${PORT}  (proxy → ${BACKEND})`)
})
