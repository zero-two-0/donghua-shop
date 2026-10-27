// 管理端请求层：与用户端一致的外壳与错误处理，只是令牌键不同（员工/用户令牌不能混用）。
import axios from 'axios'

export const ADMIN_TOKEN_KEY = 'sky_admin_token'

export function getToken() {
  return localStorage.getItem(ADMIN_TOKEN_KEY) || ''
}

export function setToken(token) {
  if (token) localStorage.setItem(ADMIN_TOKEN_KEY, token)
  else localStorage.removeItem(ADMIN_TOKEN_KEY)
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
