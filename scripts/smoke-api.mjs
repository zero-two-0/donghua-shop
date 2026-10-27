// 真实后端接口冒烟测试：按“登录 → 浏览 → 加购 → 地址 → 下单 → 模拟支付 → 员工接单/派送/完成 → 用户复查”走一遍。
// 只使用组长契约中的真实接口，不 mock、不改后端。
// 用法：node scripts/smoke-api.mjs [baseUrl]
const BASE = process.argv[2] || 'http://127.0.0.1:8080'
const ADMIN_PASSWORD = process.env.COURSE_ADMIN_PASSWORD
if (!ADMIN_PASSWORD) { console.error('缺少 COURSE_ADMIN_PASSWORD：请先 . .\\scripts\\env.ps1 加载 config\\env.local.ps1，或设置该环境变量'); process.exit(2) }
const path = await import('node:path')
const fs = await import('node:fs')
const results = []
const evidence = { baseUrl: BASE, startedAt: new Date().toISOString(), steps: [] }

function record(group, name, ok, detail) {
  results.push({ group, name, ok, detail })
  evidence.steps.push({ group, name, ok, detail })
  const mark = ok ? 'PASS' : 'FAIL'
  console.log(`${mark}  [${group}] ${name}${detail !== undefined ? '  ' + JSON.stringify(detail) : ''}`)
}

async function api(method, path, { token, body, query } = {}) {
  const url = new URL(BASE + path)
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v)
    }
  }
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`
  const res = await fetch(url, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body)
  })
  let json = null
  const text = await res.text()
  try { json = JSON.parse(text) } catch (e) { json = { raw: text.slice(0, 200) } }
  return { status: res.status, body: json }
}

const isOk = (r) => r.status === 200 && r.body && r.body.code === 1

async function main() {
  // ---------- 1. 用户登录 ----------
  const login = await api('POST', '/user/user/test-login', { body: { loginCode: 'demo-user' } })
  const userToken = login.body?.data?.token
  record('认证', 'POST /user/user/test-login', isOk(login) && !!userToken,
    { http: login.status, code: login.body?.code, userId: login.body?.data?.id })

  // 非法测试身份应被拒绝
  const badLogin = await api('POST', '/user/user/test-login', { body: { loginCode: 'hacker' } })
  record('认证', '非法 loginCode 被拒绝', badLogin.body?.code === 0, { http: badLogin.status, msg: badLogin.body?.msg })

  // 未带令牌访问受保护接口应 401
  const noToken = await api('GET', '/user/shoppingCart/list')
  record('认证', '无令牌访问购物车返回 401', noToken.status === 401, { http: noToken.status })

  // ---------- 2. 浏览 ----------
  const cats = await api('GET', '/user/category/list', { query: { type: 1 } })
  const catList = cats.body?.data || []
  record('浏览', 'GET /user/category/list?type=1', isOk(cats) && Array.isArray(catList), { count: catList.length })

  const shop = await api('GET', '/user/shop/status')
  record('浏览', 'GET /user/shop/status', isOk(shop), { status: shop.body?.data })

  const dishList = await api('GET', '/user/dish/list', { query: { categoryId: catList[0]?.id } })
  const dishes = dishList.body?.data || []
  record('浏览', 'GET /user/dish/list', isOk(dishList) && dishes.length > 0,
    { count: dishes.length, first: dishes[0]?.name, hasFlavors: Array.isArray(dishes[0]?.flavors) })

  const search = await api('GET', '/user/dish/list', { query: { keyword: '宫保' } })
  record('浏览', 'GET /user/dish/list?keyword=宫保', isOk(search), { count: (search.body?.data || []).length })

  const setmealCats = await api('GET', '/user/category/list', { query: { type: 2 } })
  const smCats = setmealCats.body?.data || []
  const setmealList = await api('GET', '/user/setmeal/list', { query: { categoryId: smCats[0]?.id } })
  const setmeals = setmealList.body?.data || []
  record('浏览', 'GET /user/setmeal/list', isOk(setmealList) && setmeals.length > 0, { count: setmeals.length })

  const smDishes = await api('GET', `/user/setmeal/dish/${setmeals[0]?.id}`)
  record('浏览', 'GET /user/setmeal/dish/{id}', isOk(smDishes) && (smDishes.body?.data || []).length > 0,
    { items: (smDishes.body?.data || []).map((i) => `${i.name}x${i.copies}`) })

  // ---------- 3. 购物车 ----------
  const dish = dishes[0]
  const add = await api('POST', '/user/shoppingCart/add', { token: userToken, body: { dishId: dish.id } })
  record('购物车', 'POST /user/shoppingCart/add', isOk(add))

  let cart = await api('GET', '/user/shoppingCart/list', { token: userToken })
  let cartItems = cart.body?.data || []
  const cartItem = cartItems.find((i) => String(i.dishId) === String(dish.id))
  record('购物车', 'GET /user/shoppingCart/list', isOk(cart) && !!cartItem,
    { count: cartItems.length, number: cartItem?.number, amount: cartItem?.amount })

  const upd = await api('PUT', `/user/shoppingCart/${cartItem?.id}`, { token: userToken, query: { number: 2 } })
  record('购物车', 'PUT /user/shoppingCart/{id}?number=2', isOk(upd))

  cart = await api('GET', '/user/shoppingCart/list', { token: userToken })
  cartItems = cart.body?.data || []
  const updated = cartItems.find((i) => i.id === cartItem?.id)
  const expect = Number(dish.price) * 2
  // 实现语义：shopping_cart.amount 存的是单价（OrderServiceImpl 用 Σ amount×number 计算订单总额），
  // 改数量后 amount 不变，前端需按 单价×数量 展示小计；契约字段名 amount 容易误解，登记为 F-01。
  record('购物车', '改数量后 number=2，且 单价×数量 = 期望小计',
    updated && updated.number === 2 && Math.abs(Number(updated.amount) * Number(updated.number) - expect) < 0.001,
    { number: updated?.number, unitPrice: updated?.amount, subtotal: Number(updated?.amount) * Number(updated?.number), expect })

  // ---------- 4. 地址 ----------
  const addrCreate = await api('POST', '/user/addressBook', {
    token: userToken,
    body: {
      consignee: '联调收货人', phone: '00000000000', sex: '1',
      provinceName: '上海市', cityName: '上海市', districtName: '松江区',
      detail: '东华大学松江校区 联调地址 ' + Date.now(), label: '学校'
    }
  })
  record('地址', 'POST /user/addressBook', isOk(addrCreate) || addrCreate.status === 200,
    { http: addrCreate.status, code: addrCreate.body?.code, msg: addrCreate.body?.msg })

  const addrList = await api('GET', '/user/addressBook/list', { token: userToken })
  const addresses = addrList.body?.data || []
  record('地址', 'GET /user/addressBook/list', isOk(addrList) && addresses.length > 0, { count: addresses.length })
  const addressId = (addresses.find((a) => a.consignee === '联调收货人') || addresses[0])?.id

  const setDefault = await api('PUT', '/user/addressBook/default', { token: userToken, body: { id: addressId } })
  record('地址', 'PUT /user/addressBook/default', isOk(setDefault), { id: addressId })

  // ---------- 5. 下单 + 模拟支付 ----------
  const submit = await api('POST', '/user/order/submit', {
    token: userToken,
    body: {
      addressBookId: addressId, payMethod: 1, remark: '联调订单',
      deliveryStatus: 1, tablewareNumber: 0, tablewareStatus: 1, packAmount: 0,
      // 故意上报错误金额，验证后端不采信客户端金额
      amount: 0.01
    }
  })
  const submitData = submit.body?.data || {}
  record('订单', 'POST /user/order/submit（客户端金额 0.01 不予采信）', isOk(submit) && !!submitData.orderNumber,
    { orderId: submitData.id, orderNumber: submitData.orderNumber, orderAmount: submitData.orderAmount })
  record('订单', '后端重算金额 ≠ 客户端金额', Math.abs(Number(submitData.orderAmount) - expect) < 0.001,
    { backend: submitData.orderAmount, client: 0.01, expect })

  const cartAfterSubmit = await api('GET', '/user/shoppingCart/list', { token: userToken })
  record('订单', '下单后购物车已清空', isOk(cartAfterSubmit) && (cartAfterSubmit.body?.data || []).length === 0,
    { count: (cartAfterSubmit.body?.data || []).length })

  const pay = await api('PUT', '/user/order/payment', { token: userToken, body: { orderNumber: submitData.orderNumber, payMethod: 1 } })
  record('订单', 'PUT /user/order/payment（模拟支付）', isOk(pay), { packageStr: pay.body?.data?.packageStr })

  const payAgain = await api('PUT', '/user/order/payment', { token: userToken, body: { orderNumber: submitData.orderNumber, payMethod: 1 } })
  // 实现为幂等：已支付且状态在 2..5 时返回同一支付结果（code=1 且 packageStr 相同），不二次扣款、不改单。
  // 契约未写明这一幂等语义，登记为 F-02（建议在 OpenAPI 描述中补充）。
  record('订单', '重复支付按设计幂等（同一 paymentVO，无二次变更）',
    payAgain.body?.code === 1 && payAgain.body?.data?.packageStr === pay.body?.data?.packageStr,
    { http: payAgain.status, code: payAgain.body?.code, packageStr: payAgain.body?.data?.packageStr })

  const history = await api('GET', '/user/order/historyOrders', { token: userToken, query: { page: 1, pageSize: 5 } })
  const page = history.body?.data || {}
  record('订单', 'GET /user/order/historyOrders', isOk(history) && Array.isArray(page.records),
    { total: page.total, records: (page.records || []).length })

  const detail1 = await api('GET', `/user/order/orderDetail/${submitData.id}`, { token: userToken })
  record('订单', '支付后订单状态为 2（待接单）', isOk(detail1) && detail1.body?.data?.status === 2,
    { status: detail1.body?.data?.status, payStatus: detail1.body?.data?.payStatus })

  // ---------- 6. 员工端 ----------
  const adminLogin = await api('POST', '/admin/employee/login', { body: { username: 'admin', password: ADMIN_PASSWORD } })
  const adminToken = adminLogin.body?.data?.token
  record('管理端', 'POST /admin/employee/login', isOk(adminLogin) && !!adminToken,
    { http: adminLogin.status, code: adminLogin.body?.code, name: adminLogin.body?.data?.name })

  const userOnAdmin = await api('GET', '/admin/order/conditionSearch', { token: userToken, query: { page: 1, pageSize: 1 } })
  record('鉴权', '用户令牌访问管理端被拒绝', userOnAdmin.status === 401 || userOnAdmin.body?.code === 0,
    { http: userOnAdmin.status, code: userOnAdmin.body?.code })

  const search2 = await api('GET', '/admin/order/conditionSearch', { token: adminToken, query: { page: 1, pageSize: 10 } })
  const adminOrders = search2.body?.data || {}
  const target = (adminOrders.records || []).find((o) => o.id === submitData.id)
  record('管理端', 'GET /admin/order/conditionSearch 查到刚下的订单', isOk(search2) && !!target,
    { total: adminOrders.total, status: target?.status })

  const confirm = await api('PUT', '/admin/order/confirm', { token: adminToken, body: { id: submitData.id, status: 3 } })
  record('管理端', 'PUT /admin/order/confirm（接单）', isOk(confirm), { code: confirm.body?.code, msg: confirm.body?.msg })

  const delivery = await api('PUT', `/admin/order/delivery/${submitData.id}`, { token: adminToken })
  record('管理端', 'PUT /admin/order/delivery/{id}（派送）', isOk(delivery), { code: delivery.body?.code, msg: delivery.body?.msg })

  const complete = await api('PUT', `/admin/order/complete/${submitData.id}`, { token: adminToken })
  record('管理端', 'PUT /admin/order/complete/{id}（完成）', isOk(complete), { code: complete.body?.code, msg: complete.body?.msg })

  const detail2 = await api('GET', `/user/order/orderDetail/${submitData.id}`, { token: userToken })
  record('闭环', '用户复查订单状态为 5（已完成）', isOk(detail2) && detail2.body?.data?.status === 5,
    { status: detail2.body?.data?.status, deliveryTime: detail2.body?.data?.deliveryTime })

  // ---------- 7. 统计与工作台 ----------
  const biz = await api('GET', '/admin/workspace/businessData', { token: adminToken })
  record('统计', 'GET /admin/workspace/businessData', isOk(biz), biz.body?.data)

  const today = new Date().toISOString().slice(0, 10)
  const turnover = await api('GET', '/admin/report/turnoverStatistics', { token: adminToken, query: { begin: today, end: today } })
  record('统计', 'GET /admin/report/turnoverStatistics', isOk(turnover), turnover.body?.data)

  const statistics = await api('GET', '/admin/order/statistics', { token: adminToken })
  record('统计', 'GET /admin/order/statistics', isOk(statistics), statistics.body?.data)

  // ---------- 8. 管理端商品 ----------
  const dishPage = await api('GET', '/admin/dish/page', { token: adminToken, query: { page: 1, pageSize: 10 } })
  record('管理端', 'GET /admin/dish/page', isOk(dishPage), { total: dishPage.body?.data?.total })
  const dishDetail = await api('GET', `/admin/dish/${dishes[0]?.id}`, { token: adminToken })
  record('管理端', 'GET /admin/dish/{id}（含口味）', isOk(dishDetail),
    { name: dishDetail.body?.data?.name, flavors: (dishDetail.body?.data?.flavors || []).length })

  const closeShop = await api('PUT', '/admin/shop/0', { token: adminToken })
  const closed = await api('GET', '/user/shop/status')
  record('管理端', 'PUT /admin/shop/0 后用户端状态变为 0', closed.body?.data === 0, { shopStatus: closed.body?.data })
  const openShop = await api('PUT', '/admin/shop/1', { token: adminToken })
  const reopened = await api('GET', '/user/shop/status')
  record('管理端', 'PUT /admin/shop/1 恢复营业', closed.body?.data === 0 && reopened.body?.data === 1,
    { shopStatus: reopened.body?.data })

  // ---------- 汇总 ----------
  const fail = results.filter((r) => !r.ok)
  evidence.finishedAt = new Date().toISOString()
  evidence.summary = { total: results.length, pass: results.length - fail.length, fail: fail.length }
  console.log(`\n合计 ${results.length} 项，通过 ${results.length - fail.length}，失败 ${fail.length}`)
  if (fail.length) {
    console.log('失败项：')
    for (const f of fail) console.log(`  - [${f.group}] ${f.name} ${JSON.stringify(f.detail)}`)
  }
  const out = process.env.SMOKE_OUT || 'docs/integration/evidence/api-smoke.json'
  fs.mkdirSync(path.dirname(out), { recursive: true })
  fs.writeFileSync(out, JSON.stringify(evidence, null, 2), 'utf8')
  console.log('证据已写入', out)
  process.exit(fail.length ? 1 : 0)
}

main().catch((e) => {
  console.error('冒烟测试异常终止：', e)
  process.exit(2)
})
