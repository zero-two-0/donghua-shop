// 统一请求层：对齐组长契约 docs/leader/week3/openapi.yaml
// - 基础路径为空（接口以 /user、/admin 开头），开发期由 Vite 代理转发到 8080
// - 响应外壳 { code, msg, data }：code === 1 成功，其余为业务失败（HTTP 仍可能 200）
// - 令牌放在 Authorization: Bearer <token>；用户与员工令牌分开保存
import axios from 'axios'

export const USER_TOKEN_KEY = 'sky_user_token'

export function getToken() {
  return localStorage.getItem(USER_TOKEN_KEY) || ''
}

export function setToken(token) {
  if (token) localStorage.setItem(USER_TOKEN_KEY, token)
  else localStorage.removeItem(USER_TOKEN_KEY)
}

export class ApiError extends Error {
  constructor(code, message, status) {
    super(message || '请求失败')
    this.name = 'ApiError'
    this.code = code
    this.status = status
  }
}

const service = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' }
})

service.interceptors.request.use((config) => {
  const token = getToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

service.interceptors.response.use(
  (response) => {
    const body = response.data
    if (body && typeof body === 'object' && Object.prototype.hasOwnProperty.call(body, 'code')) {
      if (body.code === 1) return body.data
      throw new ApiError(body.code, body.msg || '业务处理失败', response.status)
    }
    return body
  },
  (error) => {
    const status = error.response ? error.response.status : undefined
    const body = error.response ? error.response.data : undefined
    const code = body && body.code !== undefined ? body.code : (status || -1)
    let message = (body && (body.msg || body.message)) || ''
    if (!message) {
      if (status === 401) message = '登录已过期，请重新登录'
      else if (status === 400) message = '请求参数不合法'
      else if (status === 404) message = '接口不存在'
      else if (status === 500) message = '服务器处理失败'
      else message = '网络异常，请检查后端服务是否已启动'
    }
    if (status === 401) {
      setToken('')
      if (!location.hash.startsWith('#/login')) location.hash = '#/login'
    }
    return Promise.reject(new ApiError(code, message, status))
  }
)

export const http = {
  get: (url, params) => service.get(url, { params }),
  post: (url, data, config) => service.post(url, data, config),
  put: (url, data, config) => service.put(url, data, config),
  delete: (url, params) => service.delete(url, { params })
}

export default http
