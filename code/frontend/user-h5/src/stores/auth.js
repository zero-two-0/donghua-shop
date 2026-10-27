import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { authApi } from '../api/user'
import { getToken, setToken } from '../api/http'

const USER_KEY = 'sky_user_profile'

const IDENTITIES = {
  'demo-user': '演示用户一',
  'demo-user-2': '演示用户二'
}

function readProfile() {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY) || 'null')
  } catch (e) {
    return null
  }
}

export const useAuthStore = defineStore('auth', () => {
  const token = ref(getToken())
  const user = ref(readProfile())

  const isLogin = computed(() => Boolean(token.value))
  const displayName = computed(() => {
    if (!user.value) return '未登录'
    return IDENTITIES[localStorage.getItem('sky_login_code')] || `用户 #${user.value.id}`
  })

  async function login(loginCode) {
    const data = await authApi.testLogin(loginCode)
    token.value = data.token
    user.value = { id: data.id, openid: data.openid }
    setToken(data.token)
    localStorage.setItem(USER_KEY, JSON.stringify(user.value))
    localStorage.setItem('sky_login_code', loginCode)
    return data
  }

  function logout() {
    token.value = ''
    user.value = null
    setToken('')
    localStorage.removeItem(USER_KEY)
    localStorage.removeItem('sky_login_code')
  }

  return { token, user, isLogin, displayName, login, logout }
})
