import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { authApi } from '../api/admin'
import { getToken, setToken } from '../api/http'

const EMP_KEY = 'sky_admin_employee'

function readEmployee() {
  try {
    return JSON.parse(localStorage.getItem(EMP_KEY) || 'null')
  } catch (e) {
    return null
  }
}

export const useAuthStore = defineStore('adminAuth', () => {
  const token = ref(getToken())
  const employee = ref(readEmployee())

  const isLogin = computed(() => Boolean(token.value))
  const name = computed(() => (employee.value && (employee.value.name || employee.value.userName)) || '未登录')

  async function login(username, password) {
    const data = await authApi.login(username, password)
    token.value = data.token
    employee.value = { id: data.id, name: data.name, userName: data.userName }
    setToken(data.token)
    localStorage.setItem(EMP_KEY, JSON.stringify(employee.value))
    return data
  }

  async function logout() {
    try { await authApi.logout() } catch (e) { /* 退出失败也要清理本地令牌 */ }
    token.value = ''
    employee.value = null
    setToken('')
    localStorage.removeItem(EMP_KEY)
  }

  return { token, employee, isLogin, name, login, logout }
})
