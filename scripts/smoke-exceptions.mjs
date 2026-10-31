// 异常与边界用例：空车下单、停售加购、数量越界、非法状态迁移、重复支付幂等。
// 前提：后端已启动；数据库有种子数据（含一个在售菜品与一个套餐）。
// 用法：COURSE_ADMIN_PASSWORD=xxx node scripts/smoke-exceptions.mjs [baseUrl]
const BASE = process.argv[2] || 'http://127.0.0.1:8080'
const ADMIN_PWD = process.env.COURSE_ADMIN_PASSWORD
const steps = []
const evidence = { baseUrl: BASE, startedAt: new Date().toISOString(), steps: [] }

function rec(name, ok, detail) {
  steps.push({ name, ok, detail })
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  ' + JSON.stringify(detail) : ''}`)
}

async function api(method, path, { token, body } = {}) {
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`
  const res = await fetch(BASE + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) })
  let json = null
  const text = await res.text()
  try { json = JSON.parse(text) } catch (e) { json = { raw: text.slice(0, 160) } }
  return { status: res.status, body: json }
}
const ok = (r) => r.status === 200 && r.body && r.body.code === 1
const denied = (r) => !ok(r)

async function main() {
  if (!ADMIN_PWD) { console.error('缺少 COURSE_ADMIN_PASSWORD（先 . .\\scripts\\env.ps1）'); process.exit(2) }

  // ---------- 登录 ----------
  const u = await api('POST', '/user/user/test-login', { body: { loginCode: 'demo-user-2' } })
  const userToken = u.body?.data?.token
  const a = await api('POST', '/admin/employee/login', { body: { username: 'admin', password: ADMIN_PWD } })
  const adminToken = a.body?.data?.token
  rec('用户与管理员均可登录', !!userToken && !!adminToken)

  // ---------- 1. 空购物车下单 ----------
  await api('DELETE', '/user/shoppingCart/clean', { token: userToken })
  const addrList = await api('GET', '/user/addressBook/list', { token: userToken })
  const addr = (addrList.body?.data || [])[0]
  const emptySubmit = await api('POST', '/user/order/submit', {
    token: userToken,
    body: { addressBookId: addr?.id, payMethod: 1, deliveryStatus: 1, tablewareNumber: 0, tablewareStatus: 1, packAmount: 0 }
  })
  rec('空购物车下单被拒绝', denied(emptySubmit), { http: emptySubmit.status, code: emptySubmit.body?.code, msg: emptySubmit.body?.msg })

  // ---------- 2. 数量越界 ----------
  const dishList = await api('GET', '/user/dish/list')
  const dish = (dishList.body?.data || [])[0]
  await api('POST', '/user/shoppingCart/add', { token: userToken, body: { dishId: dish.id } })
  const cart = await api('GET', '/user/shoppingCart/list', { token: userToken })
  const item = (cart.body?.data || [])[0]
  const zero = await api('PUT', `/user/shoppingCart/${item.id}?number=0`, { token: userToken })
  const over = await api('PUT', `/user/shoppingCart/${item.id}?number=100`, { token: userToken })
  rec('数量 0 被拒绝', denied(zero), { http: zero.status, code: zero.body?.code, msg: zero.body?.msg })
  rec('数量 100（越界）被拒绝', denied(over), { http: over.status, code: over.body?.code, msg: over.body?.msg })

  // ---------- 3. 停售菜品不能加购 ----------
  const stop = await api('POST', `/admin/dish/status/0?id=${dish.id}`, { token: adminToken })
  const addStopped = await api('POST', '/user/shoppingCart/add', { token: userToken, body: { dishId: dish.id } })
  const userList = await api('GET', `/user/dish/list`)
  const stillVisible = (userList.body?.data || []).some((d) => d.id === dish.id)
  rec('管理端停售菜品成功', ok(stop), { code: stop.body?.code })
  rec('停售菜品无法加入购物车', denied(addStopped), { http: addStopped.status, code: addStopped.body?.code, msg: addStopped.body?.msg })
  rec('停售菜品不出现在用户端列表', !stillVisible, { dishId: dish.id })
  const restore = await api('POST', `/admin/dish/status/1?id=${dish.id}`, { token: adminToken })
  rec('恢复起售成功', ok(restore), { code: restore.body?.code })

  // ---------- 4. 非法状态迁移 ----------
  const doneOrders = await api('GET', '/admin/order/conditionSearch?page=1&pageSize=5&status=5', { token: adminToken })
  const done = (doneOrders.body?.data?.records || [])[0]
  if (done) {
    const reconfirm = await api('PUT', '/admin/order/confirm', { token: adminToken, body: { id: done.id, status: 3 } })
    const redelivery = await api('PUT', `/admin/order/delivery/${done.id}`, { token: adminToken })
    rec('已完成订单不能再次接单', denied(reconfirm), { orderId: done.id, code: reconfirm.body?.code, msg: reconfirm.body?.msg })
    rec('已完成订单不能重新派送', denied(redelivery), { orderId: done.id, code: redelivery.body?.code, msg: redelivery.body?.msg })
  } else {
    rec('已完成订单不能再次接单', false, { reason: '库中没有 status=5 的订单，请先跑 smoke-api.mjs' })
  }

  // ---------- 5. 重复支付幂等 ----------
  const submit = await api('POST', '/user/order/submit', {
    token: userToken,
    body: { addressBookId: addr?.id, payMethod: 1, deliveryStatus: 1, tablewareNumber: 0, tablewareStatus: 1, packAmount: 0 }
  })
  const order = submit.body?.data || {}
  const pay1 = await api('PUT', '/user/order/payment', { token: userToken, body: { orderNumber: order.orderNumber, payMethod: 1 } })
  const pay2 = await api('PUT', '/user/order/payment', { token: userToken, body: { orderNumber: order.orderNumber, payMethod: 1 } })
  rec('首次模拟支付成功', ok(pay1), { orderNumber: order.orderNumber })
  rec('重复支付幂等（同一 paymentVO，无二次变更）',
    ok(pay2) && pay2.body?.data?.packageStr === pay1.body?.data?.packageStr,
    { first: pay1.body?.data?.packageStr, second: pay2.body?.data?.packageStr })

  // ---------- 6. 取消规则（实现口径：待付款/待接单可取消，已支付按模拟退款处理） ----------
  const cancelPaid = await api('PUT', `/user/order/cancel/${order.id}`, { token: userToken })
  rec('待接单订单允许用户取消（实现口径）', ok(cancelPaid), { code: cancelPaid.body?.code, msg: cancelPaid.body?.msg })
  const afterCancel = await api('GET', `/user/order/orderDetail/${order.id}`, { token: userToken })
  const ac = afterCancel.body?.data || {}
  rec('取消后状态=6、支付状态=2（模拟退款）', ac.status === 6 && ac.payStatus === 2,
    { status: ac.status, payStatus: ac.payStatus, cancelReason: ac.cancelReason })

  const cancelAgain = await api('PUT', `/user/order/cancel/${order.id}`, { token: userToken })
  rec('已取消订单再次取消被拒', denied(cancelAgain), { code: cancelAgain.body?.code, msg: cancelAgain.body?.msg })

  if (done) {
    const cancelDone = await api('PUT', `/user/order/cancel/${done.id}`, { token: userToken })
    rec('已完成订单不能由用户取消', denied(cancelDone), { orderId: done.id, code: cancelDone.body?.code, msg: cancelDone.body?.msg })
  }

  const fail = steps.filter((s) => !s.ok).length
  evidence.finishedAt = new Date().toISOString()
  evidence.summary = { total: steps.length, pass: steps.length - fail, fail }
  console.log(`\n合计 ${steps.length} 项，通过 ${steps.length - fail}，失败 ${fail}`)
  if (fail) for (const f of steps.filter((s) => !s.ok)) console.log('  失败：' + f.name + ' ' + JSON.stringify(f.detail))
  const fs = await import('node:fs')
  const path = await import('node:path')
  const out = process.env.EXCEPTIONS_OUT || 'docs/integration/evidence/api-exceptions.json'
  fs.mkdirSync(path.dirname(out), { recursive: true })
  fs.writeFileSync(out, JSON.stringify(evidence, null, 2), 'utf8')
  console.log('证据已写入', out)
  process.exit(fail ? 1 : 0)
}

main().catch((e) => { console.error('异常：', e); process.exit(2) })
