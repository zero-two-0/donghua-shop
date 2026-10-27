// 管理端 API：路径与参数严格对齐组长 OpenAPI（docs/leader/week3/openapi.yaml）。
import http from './http'

export const authApi = {
  // POST /admin/employee/login { username, password } → { id, userName, name, token }
  login(username, password) {
    return http.post('/admin/employee/login', { username, password })
  },
  logout() {
    return http.post('/admin/employee/logout')
  }
}

export const employeeApi = {
  page(params) {
    return http.get('/admin/employee/page', params)
  },
  detail(id) {
    return http.get(`/admin/employee/${id}`)
  },
  create(payload) {
    return http.post('/admin/employee', payload)
  },
  update(payload) {
    return http.put('/admin/employee', payload)
  },
  // POST /admin/employee/status/{status}?id=
  changeStatus(status, id) {
    return http.post(`/admin/employee/status/${status}`, null, { params: { id } })
  }
}

export const categoryApi = {
  page(params) {
    return http.get('/admin/category/page', params)
  },
  list(type) {
    return http.get('/admin/category/list', { type })
  },
  create(payload) {
    return http.post('/admin/category', payload)
  },
  update(payload) {
    return http.put('/admin/category', payload)
  },
  remove(id) {
    return http.delete('/admin/category', { id })
  },
  changeStatus(status, id) {
    return http.post(`/admin/category/status/${status}`, null, { params: { id } })
  }
}

export const dishApi = {
  page(params) {
    return http.get('/admin/dish/page', params)
  },
  detail(id) {
    return http.get(`/admin/dish/${id}`)
  },
  list(categoryId) {
    return http.get('/admin/dish/list', { categoryId })
  },
  create(payload) {
    return http.post('/admin/dish', payload)
  },
  update(payload) {
    return http.put('/admin/dish', payload)
  },
  remove(ids) {
    return http.delete('/admin/dish', { ids: Array.isArray(ids) ? ids.join(',') : ids })
  },
  changeStatus(status, id) {
    return http.post(`/admin/dish/status/${status}`, null, { params: { id } })
  }
}

export const setmealApi = {
  page(params) {
    return http.get('/admin/setmeal/page', params)
  },
  detail(id) {
    return http.get(`/admin/setmeal/${id}`)
  },
  create(payload) {
    return http.post('/admin/setmeal', payload)
  },
  update(payload) {
    return http.put('/admin/setmeal', payload)
  },
  remove(ids) {
    return http.delete('/admin/setmeal', { ids: Array.isArray(ids) ? ids.join(',') : ids })
  },
  changeStatus(status, id) {
    return http.post(`/admin/setmeal/status/${status}`, null, { params: { id } })
  }
}

export const shopApi = {
  status() {
    return http.get('/admin/shop/status')
  },
  // PUT /admin/shop/{status}（1 营业 / 0 打烊）
  setStatus(status) {
    return http.put(`/admin/shop/${status}`)
  }
}

export const orderApi = {
  search(params) {
    return http.get('/admin/order/conditionSearch', params)
  },
  detail(id) {
    return http.get(`/admin/order/details/${id}`)
  },
  statistics() {
    return http.get('/admin/order/statistics')
  },
  // 接单：{ id, status: 3 }
  confirm(id) {
    return http.put('/admin/order/confirm', { id, status: 3 })
  },
  reject(id, rejectionReason) {
    return http.put('/admin/order/rejection', { id, rejectionReason })
  },
  cancel(id, cancelReason) {
    return http.put('/admin/order/cancel', { id, cancelReason })
  },
  delivery(id) {
    return http.put(`/admin/order/delivery/${id}`)
  },
  complete(id) {
    return http.put(`/admin/order/complete/${id}`)
  }
}

export const reportApi = {
  turnover(begin, end) {
    return http.get('/admin/report/turnoverStatistics', { begin, end })
  },
  businessData(date) {
    return http.get('/admin/workspace/businessData', { date })
  }
}
