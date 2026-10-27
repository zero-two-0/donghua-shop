<template>
  <div class="page login-page">
    <div class="hero">
      <div class="hero-badge">DHU</div>
      <h1>东华食堂 · 在线点餐</h1>
      <p class="hero-sub">课程演示身份登录（不接入微信、不发送短信）</p>
    </div>

    <div class="identities">
      <div
        v-for="id in identities"
        :key="id.code"
        :class="['identity', { active: selected === id.code }]"
        @click="selected = id.code"
      >
        <div class="identity-name">{{ id.name }}</div>
        <div class="muted">{{ id.code }}</div>
      </div>
    </div>

    <div class="submit-wrap">
      <van-button round block type="primary" :loading="loading" @click="onLogin">
        以「{{ currentName }}」进入
      </van-button>
      <p class="muted center">
        后端地址由 Vite 代理转发；若提示网络异常，请先确认 8080 端口的 Java 服务已启动。
      </p>
    </div>

    <div class="tips">
      <p><b>为什么是测试身份？</b></p>
      <p>
        课程范围不接入短信与微信登录。后端只允许
        <code>demo-user</code> 与 <code>demo-user-2</code> 两个受控标识，
        返回 JWT 后所有受保护请求使用
        <code>Authorization: Bearer &lt;token&gt;</code>。第二个身份用于验证越权隔离。
      </p>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showToast } from 'vant'
import { useAuthStore } from '../stores/auth'
import { useCartStore } from '../stores/cart'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()
const cart = useCartStore()

const identities = [
  { code: 'demo-user', name: '演示用户一' },
  { code: 'demo-user-2', name: '演示用户二' }
]
const selected = ref('demo-user')
const loading = ref(false)
const currentName = computed(() => (identities.find((i) => i.code === selected.value) || {}).name)

async function onLogin() {
  loading.value = true
  try {
    await auth.login(selected.value)
    await cart.load().catch(() => {})
    showToast({ type: 'success', message: '登录成功' })
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/home'
    router.replace(redirect)
  } catch (e) {
    showToast(e.message || '登录失败')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-page { background: #fff; padding-bottom: 24px; }
.hero {
  padding: 44px 24px 26px;
  background: linear-gradient(160deg, #f2a63b, #ee7a24);
  color: #fff;
  border-radius: 0 0 24px 24px;
}
.hero-badge {
  display: inline-block;
  padding: 2px 8px;
  border: 1px solid rgba(255, 255, 255, 0.7);
  border-radius: 4px;
  font-size: 12px;
  letter-spacing: 2px;
}
.hero h1 { font-size: 22px; margin: 12px 0 6px; }
.hero-sub { margin: 0; font-size: 13px; opacity: 0.9; }
.identities { display: flex; gap: 12px; padding: 20px 16px 0; }
.identity {
  flex: 1;
  border: 1px solid #ebedf0;
  border-radius: 12px;
  padding: 14px 12px;
  cursor: pointer;
  transition: all 0.15s;
}
.identity.active { border-color: #ee7a24; background: #fff8ec; }
.identity-name { font-size: 15px; font-weight: 600; margin-bottom: 4px; }
.submit-wrap { margin: 20px 16px 0; }
.center { text-align: center; }
.tips {
  margin: 24px 16px 0;
  padding: 12px;
  background: #fff8ec;
  border-radius: 10px;
  font-size: 12px;
  line-height: 1.7;
  color: #7a5b2a;
}
.tips code { background: #ffe9c7; padding: 0 4px; border-radius: 3px; }
</style>
