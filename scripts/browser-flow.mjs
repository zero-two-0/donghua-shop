// 浏览器点击流验证：真实点击（JS 触发 DOM click）+ 真实后端。
// 覆盖：登录按钮点击、首页加购、购物车步进器、去结算、提交订单、确认支付、订单详情，
//       管理端登录、按订单号接单/派送/完成、新增菜品空表单校验、未登录守卫。
// 前置：后端 8080、用户端 5173、管理端 5174 已启动；Edge 存在。
// 用法：COURSE_ADMIN_PASSWORD=xxx node scripts/browser-flow.mjs
import fs from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'

const EDGE = process.env.EDGE_PATH || 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const USER = 'http://127.0.0.1:5173'
const ADMIN = 'http://127.0.0.1:5174'
const API = 'http://127.0.0.1:8080'
const DEBUG_PORT = Number(process.env.EDGE_DEBUG_PORT || 9223)
const SHOTS = 'docs/integration/evidence/shots-flow'
const PWD = process.env.COURSE_ADMIN_PASSWORD

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
      const m = JSON.parse(ev.data)
      if (m.id && this.pending.has(m.id)) {
        const p = this.pending.get(m.id)
        this.pending.delete(m.id)
        m.error ? p.reject(new Error(JSON.stringify(m.error))) : p.resolve(m.result)
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
    } catch (e) { /* retry */ }
    await sleep(500)
  }
  throw new Error('无法连接 Edge 调试端口')
}

const evalJs = async (cdp, expression) => {
  const { result, exceptionDetails } = await cdp.send('Runtime.evaluate', {
    expression, returnByValue: true, awaitPromise: true
  })
  if (exceptionDetails) throw new Error(JSON.stringify(exceptionDetails).slice(0, 300))
  return result.value
}

const goto = async (cdp, url, wait = 2200) => { await cdp.send('Page.navigate', { url }); await sleep(wait) }
const bodyText = (cdp) => evalJs(cdp, 'document.body.innerText')
const hash = (cdp) => evalJs(cdp, 'location.hash')

async function shot(cdp, name) {
  const { data } = await cdp.send('Page.captureScreenshot', { format: 'png' })
  fs.mkdirSync(SHOTS, { recursive: true })
  fs.writeFileSync(path.join(SHOTS, name), Buffer.from(data, 'base64'))
}

async function waitFor(cdp, expr, ms = 9000, label = '') {
  const end = Date.now() + ms
  while (Date.now() < end) {
    try { if (await evalJs(cdp, expr)) return true } catch (e) { /* 页面切换中 */ }
    await sleep(300)
  }
  if (label) console.log('  · 等待超时：' + label)
  return false
}

// 按文本点击（兼容 Vant / Element Plus）
async function clickText(cdp, text, selector = 'button, .van-button, .el-button, [role="button"]') {
  const expr = `(() => {
    const norm = (s) => (s || '').replace(/\\s+/g, '');
    const target = norm(${JSON.stringify(text)});
    const nodes = [...document.querySelectorAll(${JSON.stringify(selector)})];
    const el = nodes.find((n) => norm(n.innerText).includes(target) && !n.disabled);
    if (!el) return 'notfound';
    el.scrollIntoView({ block: 'center' });
    el.click();
    return 'clicked';
  })()`
  return evalJs(cdp, expr)
}

async function clickNth(cdp, selector, index = 0) {
  const expr = `(() => {
    const nodes = [...document.querySelectorAll(${JSON.stringify(selector)})];
    if (!nodes[${index}]) return 'notfound';
    nodes[${index}].scrollIntoView({ block: 'center' });
    nodes[${index}].click();
    return 'clicked';
  })()`
  return evalJs(cdp, expr)
}

// 在 Element Plus 表格中按订单号定位行，点该行内按钮
async function clickInRow(cdp, rowKey, text) {
  const expr = `(() => {
    const norm = (s) => (s || '').replace(/\\s+/g, '');
    const rows = [...document.querySelectorAll('.el-table__row')];
    const row = rows.find((r) => norm(r.innerText).includes(norm(${JSON.stringify(rowKey)})));
    if (!row) return 'norow';
    const btn = [...row.querySelectorAll('button')].find((b) => norm(b.innerText).includes(norm(${JSON.stringify(text)})));
    if (!btn) return 'nobtn';
    btn.scrollIntoView({ block: 'center' });
    btn.click();
    return 'clicked';
  })()`
  return evalJs(cdp, expr)
}

async function setInput(cdp, selector, value) {
  const expr = `(() => {
    const el = document.querySelector(${JSON.stringify(selector)});
    if (!el) return 'notfound';
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    setter.call(el, ${JSON.stringify(value)});
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    return 'ok';
  })()`
  return evalJs(cdp, expr)
}

const apiJson = async (p, init) => (await fetch(API + p, init)).json()

async function main() {
  if (!PWD) { console.error('缺少 COURSE_ADMIN_PASSWORD'); process.exit(2) }
  const profile = fs.mkdtempSync(path.join(process.env.TEMP || '.', 'edge-flow-'))
  const edge = spawn(EDGE, [
    '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
    `--remote-debugging-port=${DEBUG_PORT}`, `--user-data-dir=${profile}`,
    '--window-size=390,844', 'about:blank'
  ], { stdio: 'ignore' })

  try {
    const cdp = await connect()
    await cdp.send('Page.enable')
    await cdp.send('Runtime.enable')
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true })

    // ---------- 1. 登录按钮点击 ----------
    await goto(cdp, USER + '/#/login')
    const pick = await clickText(cdp, '演示用户一', '.identity')
    const enter = await clickText(cdp, '进入')
    const loggedIn = await waitFor(cdp, `location.hash.includes('/home')`, 9000, '登录后跳首页')
    const token = await evalJs(cdp, `localStorage.getItem('sky_user_token')`)
    rec('点击身份与登录按钮后跳转首页并保存令牌', pick === 'clicked' && enter === 'clicked' && loggedIn && !!token,
      { pick, enter, hash: await hash(cdp), hasToken: !!token })
    await shot(cdp, 'flow-01-after-login.png')

    const auth = { headers: { authorization: 'Bearer ' + token } }

    // ---------- 2. 首页加购 ----------
    await goto(cdp, USER + '/#/home')
    const cartBefore = (await apiJson('/user/shoppingCart/list', auth)).data || []
    const countBefore = cartBefore.reduce((s, i) => s + i.number, 0)
    const clickAdd = await clickText(cdp, '加入购物车')
    await sleep(1500)
    const cartAfter = (await apiJson('/user/shoppingCart/list', auth)).data || []
    const countAfter = cartAfter.reduce((s, i) => s + i.number, 0)
    rec('首页点击“加入购物车”后服务端数量 +1', clickAdd === 'clicked' && countAfter === countBefore + 1,
      { clickAdd, countBefore, countAfter })
    await shot(cdp, 'flow-02-after-add.png')

    // ---------- 3. 购物车步进器 ----------
    await goto(cdp, USER + '/#/cart')
    const numBefore = ((await apiJson('/user/shoppingCart/list', auth)).data || [])[0]?.number
    await clickNth(cdp, '.van-stepper__plus', 0)
    await sleep(1500)
    const numAfter = ((await apiJson('/user/shoppingCart/list', auth)).data || [])[0]?.number
    rec('购物车点击“+”后数量 +1（服务端为准）', numAfter === numBefore + 1, { numBefore, numAfter })
    await shot(cdp, 'flow-03-cart-plus.png')

    // ---------- 4. 去结算 ----------
    const goPay = await clickText(cdp, '去结算')
    const onConfirm = await waitFor(cdp, `location.hash.includes('/order/confirm')`, 6000, '跳转确认订单')
    rec('点击“去结算”进入确认订单页', goPay === 'clicked' && onConfirm, { hash: await hash(cdp) })
    await shot(cdp, 'flow-04-confirm.png')

    // ---------- 5. 提交订单 + 确认支付 ----------
    const submit = await clickText(cdp, '提交订单')
    const dialogShown = await waitFor(cdp, `document.body.innerText.includes('模拟支付')`, 9000, '支付弹窗')
    rec('点击“提交订单”弹出模拟支付对话框', submit === 'clicked' && dialogShown, { submit })
    await shot(cdp, 'flow-05-pay-dialog.png')

    const payClick = await clickText(cdp, '确认支付', '.van-dialog__confirm, .van-dialog button, button')
    const detailShown = await waitFor(cdp, `/#\\/orders\\/\\d+/.test(location.hash)`, 12000, '支付后跳订单详情')
    const detailText = await bodyText(cdp)
    rec('点击“确认支付”后进入订单详情且状态为待接单',
      payClick === 'clicked' && detailShown && detailText.includes('待接单'),
      { payClick, hash: await hash(cdp) })
    await shot(cdp, 'flow-06-order-detail.png')

    const orderId = (await hash(cdp)).match(/(\d+)/)?.[1]
    const orderNumber = (detailText.match(/订单号\s*([0-9a-zA-Z]+)/) || [])[1] || ''
    rec('详情页可读出订单号（供管理端按行定位）', !!orderNumber, { orderId, orderNumber })

    // ---------- 6. 管理端登录 ----------
    const adminLogin = await apiJson('/admin/employee/login', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: PWD })
    })
    const adminToken = adminLogin.data.token

    await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false })
    await goto(cdp, ADMIN + '/#/login')
    await setInput(cdp, 'input[type="password"]', PWD)
    await sleep(300)
    const clickAdminLogin = await clickText(cdp, '登录')
    const onDash = await waitFor(cdp, `location.hash.includes('/dashboard')`, 9000, '管理端登录跳转')
    rec('管理端填口令点击登录进入工作台', clickAdminLogin === 'clicked' && onDash, { hash: await hash(cdp) })
    await shot(cdp, 'flow-07-admin-dashboard.png')

    // ---------- 7. 按订单号接单 → 派送 → 完成 ----------
    await goto(cdp, ADMIN + '/#/orders', 3000)
    const rowReady = await waitFor(
      cdp,
      `[...document.querySelectorAll('.el-table__row')].some(r => r.innerText.includes(${JSON.stringify(orderNumber)}))`,
      9000, '列表出现该订单行')
    rec('订单管理列表能按订单号定位到该订单', rowReady, { orderNumber })

    const accept = await clickInRow(cdp, orderNumber, '接单')
    let okAccept = false
    if (accept === 'clicked') {
      await waitFor(cdp, `document.querySelector('.el-message-box') !== null`, 6000, '接单确认框')
      await clickText(cdp, '确定', '.el-message-box__btns button, button')
      okAccept = await waitFor(cdp, `[...document.querySelectorAll('.el-table__row')].some(r => r.innerText.includes(${JSON.stringify(orderNumber)}) && r.innerText.includes('已接单'))`, 9000, '状态变已接单')
    }
    rec('点击该行“接单”并确认后变为已接单', accept === 'clicked' && okAccept, { accept })
    await shot(cdp, 'flow-08-admin-accepted.png')

    const deliver = await clickInRow(cdp, orderNumber, '开始派送')
    let okDeliver = false
    if (deliver === 'clicked') {
      await waitFor(cdp, `document.querySelector('.el-message-box') !== null`, 6000, '派送确认框')
      await clickText(cdp, '确定', '.el-message-box__btns button, button')
      okDeliver = await waitFor(cdp, `[...document.querySelectorAll('.el-table__row')].some(r => r.innerText.includes(${JSON.stringify(orderNumber)}) && r.innerText.includes('派送中'))`, 9000, '状态变派送中')
    }
    rec('点击该行“开始派送”并确认后变为派送中', deliver === 'clicked' && okDeliver, { deliver })

    const complete = await clickInRow(cdp, orderNumber, '完成订单')
    if (complete === 'clicked') {
      await waitFor(cdp, `document.querySelector('.el-message-box') !== null`, 6000, '完成确认框')
      await clickText(cdp, '确定', '.el-message-box__btns button, button')
      await sleep(1500)
    }
    const finalOrder = orderId
      ? (await apiJson(`/admin/order/details/${orderId}`, { headers: { authorization: 'Bearer ' + adminToken } })).data
      : null
    rec('点击“完成订单”后状态为 5（已完成）', complete === 'clicked' && finalOrder?.status === 5,
      { complete, orderId, status: finalOrder?.status })
    await shot(cdp, 'flow-09-admin-completed.png')

    // ---------- 8. 新增菜品空表单校验（TC-30） ----------
    await goto(cdp, ADMIN + '/#/dishes', 3000)
    const openCreate = await clickText(cdp, '新增菜品')
    let validationShown = false
    if (openCreate === 'clicked') {
      await waitFor(cdp, `document.querySelector('.el-dialog') !== null`, 5000, '新增菜品弹窗')
      const save = await clickText(cdp, '保存', '.el-dialog button, button')
      if (save === 'clicked') {
        validationShown = await waitFor(
          cdp,
          `document.body.innerText.includes('请输入菜品名称') || document.body.innerText.includes('请选择')`,
          5000, '校验提示')
      }
    }
    rec('新增菜品空表单点保存出现校验提示（TC-30）', openCreate === 'clicked' && validationShown, { openCreate, validationShown })
    await shot(cdp, 'flow-10-admin-validation.png')

    // ---------- 9. 未登录守卫（TC-27 前置） ----------
    await evalJs(cdp, `localStorage.removeItem('sky_admin_token'); localStorage.removeItem('sky_admin_employee'); true`)
    await goto(cdp, ADMIN + '/#/orders', 2500)
    const hashAfter = await hash(cdp)
    rec('管理端未登录访问订单页被拦到登录页', hashAfter.includes('/login'), { hash: hashAfter })

    const fail = steps.filter((s) => !s.ok).length
    const evidence = {
      mode: 'Edge headless + CDP 真实点击（DOM click），真实后端',
      shots: fs.existsSync(SHOTS) ? fs.readdirSync(SHOTS).sort() : [],
      finishedAt: new Date().toISOString(),
      steps,
      summary: { total: steps.length, pass: steps.length - fail, fail }
    }
    fs.writeFileSync('docs/integration/evidence/browser-flow.json', JSON.stringify(evidence, null, 2), 'utf8')
    console.log(`\n合计 ${steps.length} 项，通过 ${steps.length - fail}，失败 ${fail}`)
    console.log('截图：' + SHOTS)
    process.exit(fail ? 1 : 0)
  } finally {
    try { edge.kill() } catch (e) { /* ignore */ }
  }
}

main().catch((e) => { console.error('异常：', e); process.exit(2) })
