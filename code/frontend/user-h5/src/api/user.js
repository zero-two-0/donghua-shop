// 用户端 API：路径与参数严格对齐组长 OpenAPI（docs/leader/week3/openapi.yaml）。
// 页面只允许通过本文件访问后端，禁止在组件里拼 URL。
import http from './http'

export const authApi = {
  // POST /user/user/test-login  body: { loginCode: 'demo-user' | 'demo-user-2' }
  testLogin(loginCode) {
    return http.post('/user/user/test-login', { loginCode })
  }
}

export const catalogApi = {
  // GET /user/category/list?type=1|2  → Category[]
  categories(type) {
    return http.get('/user/category/list', { type })
  },
  // GET /user/dish/list?categoryId&keyword  → DishVO[]（实现返回含 flavors；契约写 Dish，差异已登记）
  dishes(params) {
    return http.get('/user/dish/list', params)
  },
  // GET /user/setmeal/list?categoryId  → Setmeal[]
  setmeals(params) {
    return http.get('/user/setmeal/list', params)
  },
  // GET /user/setmeal/dish/{id}  → DishItemVO[]
  setmealDishes(id) {
    return http.get(`/user/setmeal/dish/${id}`)
  },
  // GET /user/shop/status  → 1 营业 / 0 打烊
  shopStatus() {
    return http.get('/user/shop/status')
  }
}

export const cartApi = {
  // GET /user/shoppingCart/list → ShoppingCart[]
  list() {
    return http.get('/user/shoppingCart/list')
  },
  // POST /user/shoppingCart/add { dishId | setmealId, dishFlavor }：接口每次 +1
  add(payload) {
    return http.post('/user/shoppingCart/add', payload)
  },
  // PUT /user/shoppingCart/{id}?number=N
  updateNumber(id, number) {
    return http.put(`/user/shoppingCart/${id}`, null, { params: { number } })
  },
  remove(id) {
    return http.delete(`/user/shoppingCart/${id}`)
  },
  clear() {
    return http.delete('/user/shoppingCart/clean')
  }
}

export const addressApi = {
  list() {
    return http.get('/user/addressBook/list')
  },
  detail(id) {
    return http.get(`/user/addressBook/${id}`)
  },
  defaultAddress() {
    return http.get('/user/addressBook/default')
  },
  create(payload) {
    return http.post('/user/addressBook', payload)
  },
  update(payload) {
    return http.put('/user/addressBook', payload)
  },
  remove(id) {
    return http.delete('/user/addressBook', { id })
  },
  setDefault(id) {
    return http.put('/user/addressBook/default', { id })
  }
}

export const orderApi = {
  // POST /user/order/submit → { id, orderNumber, orderAmount, orderTime }
  submit(payload) {
    return http.post('/user/order/submit', payload)
  },
  // PUT /user/order/payment { orderNumber, payMethod: 1 }（课程模拟支付）
  pay(orderNumber, payMethod = 1) {
    return http.put('/user/order/payment', { orderNumber, payMethod })
  },
  // GET /user/order/historyOrders?page&pageSize&status → { total, records }
  history(params) {
    return http.get('/user/order/historyOrders', params)
  },
  detail(id) {
    return http.get(`/user/order/orderDetail/${id}`)
  },
  cancel(id) {
    return http.put(`/user/order/cancel/${id}`)
  },
  repeat(id) {
    return http.post(`/user/order/repetition/${id}`)
  },
  remind(id) {
    return http.get(`/user/order/reminder/${id}`)
  }
}
