// 浏览器级验证：用 Edge 无头模式 + CDP 真实渲染页面、注入登录态、断言页面文字并截图。
// 补齐 TC-26~30 中“能在无头浏览器里自动化的部分”（登录页、首页、购物车、订单、管理端工作台/订单、窄屏）。
// 前置：后端 8080、用户端 5173、管理端 5174 已启动；Edge 可执行文件存在。
// 用法：COURSE_ADMIN_PASSWORD=xxx node scripts/browser-check.mjs
import fs from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'

const EDGE = process.env.EDGE_PATH || 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const USER_BASE = 'http://127.0.0.1:5173'
const ADMIN_BASE = 'http://127.0.0.1:5174'
const API = 'http://127.0.0.1:8080'
const DEBUG_PORT = 9222
const SHOTS = 'docs/integration/evidence/shots'
const ADMIN_PWD = process.env.COURSE_ADMIN_PASSWORD

const steps = []
const rec = (name, ok, detail) => {
  steps.push({ name, ok, detail })
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  ' + JSON.stringify(detail) : ''}`)
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

class Cdp {
  constructor(ws) {
    this.ws = ws
    this.id = 0
    this.pending = new Map()
    ws.addEventListener('message', (ev) => {
      const msg = JSON.parse(ev.data)
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id)
        this.pending.delete(msg.id)
        msg.error ? reject(new Error(JSON.stringify(msg.error))) : resolve(msg.result)
      }
    })
  }
  send(method, params = {}) {
    const id = ++this.id
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject })
      this.ws.send(JSON.stringify({ id, method, params }))
      setTimeout(() => {
        if (this.pending.has(id)) { this.pending.delete(id); reject(new Error('CDP 超时: ' + method)) }
      }, 15000)
    })
  }
}

async function connect() {
  for (let i = 0; i < 40; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/list`)).json()
      const page = list.find((t) => t.type === 'page')
      if (page) {
        const ws = new WebSocket(page.webSocketDebuggerUrl)
        await new Promise((res, rej) => {
          ws.addEventListener('open', res, { once: true })
          ws.addEventListener('error', rej, { once: true })
        })
        return new Cdp(ws)
      }
    } catch (e) { /* 还没起来 */ }
    await sleep(500)
  }
  throw new Error('无法连接 Edge 调试端口')
}

async function shot(cdp, name) {
  const { data } = await cdp.send('Page.captureScreenshot', { format: 'png' })
  fs.mkdirSync(SHOTS, { recursive: true })
  const file = path.join(SHOTS, name)
  fs.writeFileSync(file, Buffer.from(data, 'base64'))
  return file
}

async function goto(cdp, url, wait = 2500) {
  await cdp.send('Page.navigate', { url })
  await sleep(wait)
}

async function text(cdp) {
  const { result } = await cdp.send('Runtime.evaluate', { expression: 'document.body.innerText', returnByValue: true })
  return result.value || ''
}

async function evalJs(cdp, expression) {
  const { result, exceptionDetails } = await cdp.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
  if (exceptionDetails) throw new Error(JSON.stringify(exceptionDetails))
  return result.value
}

async function main() {
  if (!ADMIN_PWD) { console.error('缺少 COURSE_ADMIN_PASSWORD'); process.exit(2) }

  // 取真实登录态与数据
  const userLogin = await (await fetch(API + '/user/user/test-login', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ loginCode: 'demo-user' })
  })).json()
  const userToken = userLogin.data.token
  const addrList = await (await fetch(API + '/user/addressBook/list', { headers: { authorization: 'Bearer ' + userToken } })).json()
  const adminLogin = await (await fetch(API + '/admin/employee/login', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ username: 'admin', password: ADMIN_PWD })
  })).json()
  const adminToken = adminLogin.data.token

  const profile = fs.mkdtempSync(path.join(process.env.TEMP || '.', 'edge-prof-'))
  const edge = spawn(EDGE, [
    '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
    `--remote-debugging-port=${DEBUG_PORT}`, `--user-data-dir=${profile}`,
    '--window-size=390,844', 'about:blank'
  ], { stdio: 'ignore', detached: false })

  try {
    const cdp = await connect()
    await cdp.send('Page.enable')
    await cdp.send('Runtime.enable')
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true })

    // ---------- 用户端 ----------
    await goto(cdp, USER_BASE + '/#/login')
    let t = await text(cdp)
    rec('用户端登录页渲染（含演示身份）', t.includes('东华食堂') && t.includes('演示用户一') && t.includes('demo-user'), { chars: t.length })
    await shot(cdp, 'h5-01-login-390.png')

    // 注入登录态后进入首页
    await evalJs(cdp, `localStorage.setItem('sky_user_token', ${JSON.stringify(userToken)});
      localStorage.setItem('sky_user_profile', JSON.stringify({id:${userLogin.data.id},openid:${JSON.stringify(userLogin.data.openid)}}));
      localStorage.setItem('sky_login_code','demo-user'); true`)
    await goto(cdp, USER_BASE + '/#/home', 3500)
    t = await text(cdp)
    rec('用户端首页渲染真实菜品', t.includes('课程热菜') && t.includes('宫保鸡丁'), { chars: t.length })
    await shot(cdp, 'h5-02-home-390.png')

    // 加一件商品，验证购物车页面
    await fetch(API + '/user/shoppingCart/add', {
      method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + userToken },
      body: JSON.stringify({ dishId: 1 })
    })
    await goto(cdp, USER_BASE + '/#/cart', 3000)
    t = await text(cdp)
    rec('购物车页显示商品与合计', t.includes('宫保鸡丁') && t.includes('去结算'), { chars: t.length })
    await shot(cdp, 'h5-03-cart-390.png')

    // 订单列表（用已有订单或先下一单）
    await goto(cdp, USER_BASE + '/#/orders', 3000)
    t = await text(cdp)
    const hasOrders = t.includes('待付款') || t.includes('待接单') || t.includes('已完成') || t.includes('全部')
    rec('订单列表页渲染（状态标签或空态）', hasOrders, { chars: t.length })
    await shot(cdp, 'h5-04-orders-390.png')

    // 地址页
    await goto(cdp, USER_BASE + '/#/addresses', 2500)
    t = await text(cdp)
    rec('地址页渲染（新增按钮可见）', t.includes('新增收货地址') || t.includes('还没有收货地址'), { chars: t.length })

    // 桌面宽度快速检查
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false })
    await goto(cdp, USER_BASE + '/#/home', 2500)
    const desktopShot = await shot(cdp, 'h5-05-home-1280.png')
    const scrollW = await evalJs(cdp, '({w: document.documentElement.scrollWidth, c: document.documentElement.clientWidth})')
    rec('桌面宽度下无横向滚动', scrollW.w <= scrollW.c + 2, scrollW)

    // 窄屏 320px 检查
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: 320, height: 700, deviceScaleFactor: 2, mobile: true })
    await goto(cdp, USER_BASE + '/#/home', 2500)
    const narrow = await evalJs(cdp, '({w: document.documentElement.scrollWidth, c: document.documentElement.clientWidth})')
    rec('320px 窄屏首页无横向滚动', narrow.w <= narrow.c + 2, narrow)
    await shot(cdp, 'h5-06-home-320.png')

    await goto(cdp, USER_BASE + '/#/cart', 2500)
    const narrowCart = await evalJs(cdp, '({w: document.documentElement.scrollWidth, c: document.documentElement.clientWidth})')
    rec('320px 窄屏购物车无横向滚动', narrowCart.w <= narrowCart.c + 2, narrowCart)
    await shot(cdp, 'h5-07-cart-320.png')

    await goto(cdp, USER_BASE + '/#/orders', 2500)
    const narrowOrders = await evalJs(cdp, '({w: document.documentElement.scrollWidth, c: document.documentElement.clientWidth})')
    rec('320px 窄屏订单页无横向滚动', narrowOrders.w <= narrowOrders.c + 2, narrowOrders)

    // 未登录访问受保护页应跳登录
    await evalJs(cdp, `localStorage.removeItem('sky_user_token'); localStorage.removeItem('sky_user_profile'); localStorage.removeItem('sky_login_code'); true`)
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true })
    await goto(cdp, USER_BASE + '/#/cart', 3000)
    const hash = await evalJs(cdp, 'location.hash')
    t = await text(cdp)
    rec('未登录访问购物车被路由守卫拦到登录页', hash.includes('/login') && t.includes('演示用户一'), { hash })

    // ---------- 管理端 ----------
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false })
    await goto(cdp, ADMIN_BASE + '/#/login')
    t = await text(cdp)
    rec('管理端登录页渲染', t.includes('商家管理端') && t.includes('员工登录'), { chars: t.length })
    await shot(cdp, 'admin-01-login-1440.png')

    await evalJs(cdp, `localStorage.setItem('sky_admin_token', ${JSON.stringify(adminToken)});
      localStorage.setItem('sky_admin_employee', JSON.stringify({id:${adminLogin.data.id},name:${JSON.stringify(adminLogin.data.name)},userName:${JSON.stringify(adminLogin.data.userName)}})); true`)
    await goto(cdp, ADMIN_BASE + '/#/dashboard', 4000)
    t = await text(cdp)
    rec('管理端工作台渲染经营数据', t.includes('今日营业额') && t.includes('订单状态计数'), { chars: t.length })
    await shot(cdp, 'admin-02-dashboard-1440.png')

    await goto(cdp, ADMIN_BASE + '/#/orders', 3500)
    t = await text(cdp)
    rec('管理端订单管理渲染（含状态标签）', t.includes('订单管理') && (t.includes('待接单') || t.includes('已完成')), { chars: t.length })
    await shot(cdp, 'admin-03-orders-1440.png')

    await goto(cdp, ADMIN_BASE + '/#/dishes', 3500)
    t = await text(cdp)
    rec('管理端菜品管理渲染（含宫保鸡丁）', t.includes('菜品管理') && t.includes('宫保鸡丁'), { chars: t.length })
    await shot(cdp, 'admin-04-dishes-1440.png')

    const fail = steps.filter((s) => !s.ok).length
    const evidence = {
      mode: 'Edge headless + CDP（真实浏览器渲染，注入真实登录态）',
      shots: fs.readdirSync(SHOTS).sort(),
      finishedAt: new Date().toISOString(),
      steps,
      summary: { total: steps.length, pass: steps.length - fail, fail }
    }
    fs.writeFileSync('docs/integration/evidence/browser-check.json', JSON.stringify(evidence, null, 2), 'utf8')
    console.log(`\n合计 ${steps.length} 项，通过 ${steps.length - fail}，失败 ${fail}`)
    console.log('截图目录：' + SHOTS)
    process.exit(fail ? 1 : 0)
  } finally {
    try { edge.kill() } catch (e) { /* ignore */ }
  }
}

main().catch((e) => { console.error('异常：', e); process.exit(2) })
