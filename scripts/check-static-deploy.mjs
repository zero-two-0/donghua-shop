// 静态部署验证：不依赖 Vite dev server，直接托管 dist 并反代接口（等价 deploy/nginx.conf 的规则）。
// 前置：后端 8080 已启动；两个静态服务已启动（scripts/serve-dist.mjs，用户端 8081 / 管理端 8082）。
// 用法：COURSE_ADMIN_PASSWORD=xxx node scripts/check-static-deploy.mjs
import fs from 'node:fs'

const USER = process.env.STATIC_USER_BASE || 'http://127.0.0.1:8081'
const ADMIN = process.env.STATIC_ADMIN_BASE || 'http://127.0.0.1:8082'
const ADMIN_PWD = process.env.COURSE_ADMIN_PASSWORD
const MODE = process.env.STATIC_MODE || 'dist 静态托管 + 接口反代（Node 等价实现，本机未安装 Nginx 时的替代）'
const OUT = process.env.STATIC_OUT || 'docs/integration/evidence/static-deploy.json'

const steps = []
const rec = (name, ok, detail) => {
  steps.push({ name, ok, detail })
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  ' + JSON.stringify(detail) : ''}`)
}

async function json(url, init) {
  const r = await fetch(url, init)
  let body = null
  try { body = await r.json() } catch (e) { body = null }
  return { status: r.status, body, headers: r.headers }
}

function entryOf(html) {
  const m = html.match(/src="(\/assets\/index-[^"]+\.js)"/)
  return m ? m[1] : null
}

async function main() {
  if (!ADMIN_PWD) {
    console.error('缺少 COURSE_ADMIN_PASSWORD（先 . .\\scripts\\env.ps1）')
    process.exit(2)
  }

  // ---------- 用户端 8081 ----------
  const home = await fetch(USER + '/')
  const html = await home.text()
  rec('用户端首页返回 index.html', home.status === 200 && html.includes('<div id="app">'),
    { status: home.status, bytes: html.length })

  const entry = entryOf(html)
  const js = await fetch(USER + entry)
  const jsBytes = (await js.arrayBuffer()).byteLength
  rec('用户端入口 JS 可访问且 MIME 正确',
    js.status === 200 && (js.headers.get('content-type') || '').includes('javascript'),
    { entry, status: js.status, kb: Math.round(jsBytes / 1024) })

  const cats = await json(USER + '/user/category/list?type=1')
  rec('用户端反代 /user/category/list', cats.status === 200 && cats.body?.code === 1,
    { status: cats.status, code: cats.body?.code, count: (cats.body?.data || []).length })

  const svg = await fetch(USER + '/assets/dish-1.svg')
  rec('用户端反代菜品图 /assets/*.svg',
    svg.status === 200 && (svg.headers.get('content-type') || '').includes('svg'),
    { status: svg.status, type: svg.headers.get('content-type') })

  const login = await json(USER + '/user/user/test-login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ loginCode: 'demo-user' })
  })
  const userToken = login.body?.data?.token
  rec('用户端反代登录并取得令牌', login.status === 200 && login.body?.code === 1 && !!userToken,
    { status: login.status, code: login.body?.code })

  const cart = await json(USER + '/user/shoppingCart/list', { headers: { Authorization: 'Bearer ' + userToken } })
  rec('用户端带令牌调用受保护接口', cart.status === 200 && cart.body?.code === 1,
    { status: cart.status, items: (cart.body?.data || []).length })

  const noToken = await json(USER + '/user/shoppingCart/list')
  rec('用户端未带令牌被拒（401）', noToken.status === 401, { status: noToken.status })

  // ---------- 管理端 8082 ----------
  const ahome = await fetch(ADMIN + '/')
  const ahtml = await ahome.text()
  rec('管理端首页返回 index.html', ahome.status === 200 && ahtml.includes('<div id="app">'),
    { status: ahome.status })

  const aentry = entryOf(ahtml)
  const ajs = await fetch(ADMIN + aentry)
  const ajsBytes = (await ajs.arrayBuffer()).byteLength
  rec('管理端入口 JS 可访问', ajs.status === 200, { entry: aentry, kb: Math.round(ajsBytes / 1024) })

  const alogin = await json(ADMIN + '/admin/employee/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: ADMIN_PWD })
  })
  const adminToken = alogin.body?.data?.token
  rec('管理端反代员工登录', alogin.status === 200 && alogin.body?.code === 1 && !!adminToken,
    { status: alogin.status, code: alogin.body?.code, name: alogin.body?.data?.name })

  const shop = await json(ADMIN + '/admin/shop/status', { headers: { Authorization: 'Bearer ' + adminToken } })
  rec('管理端带令牌调用受保护接口', shop.status === 200 && shop.body?.code === 1,
    { status: shop.status, shopStatus: shop.body?.data })

  const userOnAdmin = await json(ADMIN + '/admin/order/statistics', { headers: { Authorization: 'Bearer ' + userToken } })
  rec('用户令牌访问管理端被拒', userOnAdmin.status === 401 || userOnAdmin.body?.code !== 1,
    { status: userOnAdmin.status, code: userOnAdmin.body?.code })

  // 前端路由回退（hash 路由下 /home 也应返回 index.html）
  const fallback = await fetch(USER + '/home')
  const fhtml = await fallback.text()
  rec('未知路径回退到 index.html（SPA 托管）', fallback.status === 200 && fhtml.includes('<div id="app">'),
    { status: fallback.status })

  const fail = steps.filter((s) => !s.ok).length
  const evidence = {
    mode: MODE,
    userBase: USER,
    adminBase: ADMIN,
    finishedAt: new Date().toISOString(),
    steps,
    summary: { total: steps.length, pass: steps.length - fail, fail }
  }
  fs.mkdirSync('docs/integration/evidence', { recursive: true })
  fs.writeFileSync(OUT, JSON.stringify(evidence, null, 2), 'utf8')
  console.log(`\n合计 ${steps.length} 项，通过 ${steps.length - fail}，失败 ${fail}`)
  console.log('证据已写入 ' + OUT)
  process.exit(fail ? 1 : 0)
}

main().catch((e) => { console.error('异常：', e); process.exit(2) })
