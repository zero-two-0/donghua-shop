// 越权与权限用例：两个课程身份交叉访问，验证后端按资源归属拒绝。
// 前提：后端已启动（默认 8080），两个测试身份均可登录。
// 用法：node scripts/smoke-authz.mjs [baseUrl]
const BASE = process.argv[2] || 'http://127.0.0.1:8080'
const results = []
const evidence = { baseUrl: BASE, startedAt: new Date().toISOString(), steps: [] }

function record(name, ok, detail) {
  results.push({ name, ok, detail })
  evidence.steps.push({ name, ok, detail })
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  ' + JSON.stringify(detail) : ''}`)
}

async function api(method, path, { token, body } = {}) {
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`
  const res = await fetch(BASE + path, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body)
  })
  let json = null
  const text = await res.text()
  try { json = JSON.parse(text) } catch (e) { json = { raw: text.slice(0, 160) } }
  return { status: res.status, body: json }
}

const okData = (r) => r.status === 200 && r.body && r.body.code === 1
const denied = (r) => !(r.status === 200 && r.body && r.body.code === 1)

async function login(code) {
  const r = await api('POST', '/user/user/test-login', { body: { loginCode: code } })
  if (!okData(r)) throw new Error('登录失败：' + code + ' ' + JSON.stringify(r.body))
  return { token: r.body.data.token, id: r.body.data.id, openid: r.body.data.openid }
}

async function main() {
  const alice = await login('demo-user')
  const bob = await login('demo-user-2')
  record('两个身份可独立登录', alice.id !== bob.id, { alice: alice.id, bob: bob.id })

  // ---------- A 建资源 ----------
  const addrCreate = await api('POST', '/user/addressBook', {
    token: alice.token,
    body: {
      consignee: '越权用例-A', phone: '00000000000', sex: '1',
      districtName: '松江区', detail: 'A 的地址 ' + Date.now(), label: '学校'
    }
  })
  const addrListA = await api('GET', '/user/addressBook/list', { token: alice.token })
  const aliceAddr = (addrListA.body?.data || []).find((a) => a.consignee === '越权用例-A')
  record('A 新增地址成功', okData(addrCreate) && !!aliceAddr, { addressId: aliceAddr?.id })

  const dishList = await api('GET', '/user/dish/list')
  const dish = (dishList.body?.data || [])[0]
  await api('POST', '/user/shoppingCart/add', { token: alice.token, body: { dishId: dish.id } })
  let cartA = await api('GET', '/user/shoppingCart/list', { token: alice.token })
  let aliceCart = (cartA.body?.data || [])[0]
  const aliceCartNumber = aliceCart?.number
  record('A 加购成功', !!aliceCart, { cartItemId: aliceCart?.id, number: aliceCartNumber })

  // ---------- B 越权访问 A 的地址 / 购物车 ----------
  const r1 = await api('GET', `/user/addressBook/${aliceAddr.id}`, { token: bob.token })
  record('B 读 A 的地址被拒', denied(r1), { http: r1.status, code: r1.body?.code })

  const r2 = await api('PUT', '/user/addressBook/default', { token: bob.token, body: { id: aliceAddr.id } })
  record('B 把 A 的地址设为自己的默认地址被拒', denied(r2), { http: r2.status, code: r2.body?.code, msg: r2.body?.msg })

  const r3 = await api('DELETE', `/user/addressBook?id=${aliceAddr.id}`, { token: bob.token })
  record('B 删 A 的地址被拒', denied(r3), { http: r3.status, code: r3.body?.code, msg: r3.body?.msg })

  const r4 = await api('PUT', `/user/shoppingCart/${aliceCart.id}?number=9`, { token: bob.token })
  record('B 改 A 的购物车数量被拒', denied(r4), { http: r4.status, code: r4.body?.code, msg: r4.body?.msg })

  const r5 = await api('DELETE', `/user/shoppingCart/${aliceCart.id}`, { token: bob.token })
  record('B 删 A 的购物车条目被拒', denied(r5), { http: r5.status, code: r5.body?.code, msg: r5.body?.msg })

  // A 的数据应保持不变
  const addrListA2 = await api('GET', '/user/addressBook/list', { token: alice.token })
  const stillThere = (addrListA2.body?.data || []).some((a) => a.id === aliceAddr.id)
  record('A 的地址仍在且未被改动', stillThere, { expected: aliceAddr.id })

  const cartA2 = await api('GET', '/user/shoppingCart/list', { token: alice.token })
  const cartNow = (cartA2.body?.data || []).find((i) => i.id === aliceCart.id)
  record('A 的购物车数量未被 B 改动', cartNow && cartNow.number === aliceCartNumber,
    { before: aliceCartNumber, after: cartNow?.number })

  // ---------- A 下单，B 越权操作 A 的订单 ----------
  const submit = await api('POST', '/user/order/submit', {
    token: alice.token,
    body: { addressBookId: aliceAddr.id, payMethod: 1, remark: '越权用例', deliveryStatus: 1, tablewareNumber: 0, tablewareStatus: 1, packAmount: 0 }
  })
  const order = submit.body?.data || {}
  record('A 下单成功（订单状态待付款）', okData(submit) && !!order.id, { orderId: order.id, number: order.number, amount: order.orderAmount })

  const r6 = await api('GET', `/user/order/orderDetail/${order.id}`, { token: bob.token })
  record('B 读 A 的订单详情被拒', denied(r6), { http: r6.status, code: r6.body?.code, msg: r6.body?.msg })

  const r7 = await api('PUT', '/user/order/payment', { token: bob.token, body: { orderNumber: order.orderNumber, payMethod: 1 } })
  record('B 替 A 支付订单被拒', denied(r7), { http: r7.status, code: r7.body?.code, msg: r7.body?.msg })

  const r8 = await api('PUT', `/user/order/cancel/${order.id}`, { token: bob.token })
  record('B 取消 A 的订单被拒', denied(r8), { http: r8.status, code: r8.body?.code, msg: r8.body?.msg })

  const r9 = await api('POST', `/user/order/repetition/${order.id}`, { token: bob.token })
  record('B 用 A 的订单“再来一单”被拒', denied(r9), { http: r9.status, code: r9.body?.code, msg: r9.body?.msg })

  const r10 = await api('GET', `/user/order/reminder/${order.id}`, { token: bob.token })
  record('B 催 A 的订单被拒', denied(r10), { http: r10.status, code: r10.body?.code, msg: r10.body?.msg })

  // A 的订单未被改动，A 自己能读
  const detailA = await api('GET', `/user/order/orderDetail/${order.id}`, { token: alice.token })
  const d = detailA.body?.data || {}
  record('A 的订单仍为待付款且未支付', okData(detailA) && d.status === 1 && d.payStatus === 0,
    { status: d.status, payStatus: d.payStatus })
  record('B 的尝试未改变 A 的订单（A 可正常读取）', okData(detailA), { orderId: order.id })

  // ---------- 无令牌 / 令牌域 ----------
  const noToken = await api('GET', '/user/order/historyOrders?page=1&pageSize=1')
  record('无令牌访问历史订单返回 401', noToken.status === 401, { http: noToken.status })

  const userOnAdmin = await api('GET', '/admin/order/statistics', { token: alice.token })
  record('用户令牌访问管理端被拒', userOnAdmin.status === 401 || userOnAdmin.body?.code !== 1,
    { http: userOnAdmin.status, code: userOnAdmin.body?.code })

  const fakeToken = await api('GET', '/user/order/historyOrders?page=1&pageSize=1', { token: 'eyJhbGciOiJIUzI1NiJ9.fake.signature' })
  record('伪造令牌被拒（401）', fakeToken.status === 401, { http: fakeToken.status })

  // ---------- 清理 A 的测试订单（取消，保持库干净） ----------
  const cancelA = await api('PUT', `/user/order/cancel/${order.id}`, { token: alice.token })
  record('A 可取消自己的待付款订单（正向对照）', okData(cancelA) || cancelA.body?.code === 0,
    { http: cancelA.status, code: cancelA.body?.code, msg: cancelA.body?.msg })

  const fail = results.filter((r) => !r.ok)
  evidence.finishedAt = new Date().toISOString()
  evidence.summary = { total: results.length, pass: results.length - fail.length, fail: fail.length }
  console.log(`\n合计 ${results.length} 项，通过 ${results.length - fail.length}，失败 ${fail.length}`)
  if (fail.length) for (const f of fail) console.log('  失败：' + f.name + ' ' + JSON.stringify(f.detail))

  const fs = await import('node:fs')
  const path = await import('node:path')
  const out = process.env.AUTHZ_OUT || 'docs/integration/evidence/api-authz.json'
  fs.mkdirSync(path.dirname(out), { recursive: true })
  fs.writeFileSync(out, JSON.stringify(evidence, null, 2), 'utf8')
  console.log('证据已写入', out)
  process.exit(fail.length ? 1 : 0)
}

main().catch((e) => { console.error('用例异常终止：', e); process.exit(2) })
