<template>
  <div class="page login-page">
    <div class="hero">
      <div class="hero-top">
        <div class="logo">DHU</div>
        <div class="brand">
          <h1>东华食堂</h1>
          <p>松江校区 · 校园点餐</p>
        </div>
      </div>
      <p class="slogan">提前点好，下课即取</p>
    </div>

    <div class="panel">
      <h2 class="panel-title">选择账号进入</h2>
      <p class="panel-sub">校园账号已自动识别，选择常用账号即可开始点餐</p>

      <div class="accounts">
        <button
          v-for="id in identities"
          :key="id.code"
          type="button"
          :class="['account', { active: selected === id.code }]"
          @click="selected = id.code"
        >
          <span class="avatar" :style="{ background: id.color }">{{ id.initial }}</span>
          <span class="account-main">
            <span class="account-name">{{ id.name }}</span>
            <span class="account-note">{{ id.note }}</span>
          </span>
          <van-icon :name="selected === id.code ? 'checked' : 'circle'" :class="['tick', { on: selected === id.code }]" />
        </button>
      </div>

      <van-button round block type="primary" :loading="loading" class="enter-btn" @click="onLogin">
        进入食堂
      </van-button>

      <p class="agreement">
        进入即表示同意《校园点餐服务须知》与《隐私说明》
      </p>
    </div>

    <footer class="foot">
      <span>东华大学 · 校园点餐系统</span>
      <span class="ver">v1.2.0</span>
    </footer>
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
  { code: 'demo-user', name: '学生账号一', note: '2023 级 · 计算机学院', initial: '张', color: '#ffb15c' },
  { code: 'demo-user-2', name: '学生账号二', note: '2023 级 · 纺织学院', initial: '李', color: '#7cc9a5' }
]
const selected = ref('demo-user')
const loading = ref(false)
const currentName = computed(() => (identities.find((i) => i.code === selected.value) || {}).name)

async function onLogin() {
  loading.value = true
  try {
    await auth.login(selected.value)
    await cart.load().catch(() => {})
    showToast({ type: 'success', message: '欢迎回来' })
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/home'
    router.replace(redirect)
  } catch (e) {
    showToast(e.message || '登录失败，请稍后重试')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-page {
  background: var(--bg);
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  padding-bottom: 24px;
}

.hero {
  padding: 34px 22px 46px;
  background: linear-gradient(150deg, #ff9a4d 0%, #ff7a2f 46%, #f2601c 100%);
  color: #fff;
  border-radius: 0 0 28px 28px;
}

.hero-top {
  display: flex;
  align-items: center;
  gap: 12px;
}

.logo {
  width: 44px;
  height: 44px;
  border-radius: 13px;
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 1px;
}

.brand h1 {
  margin: 0;
  font-size: 21px;
  font-weight: 600;
  letter-spacing: 0.5px;
}

.brand p {
  margin: 3px 0 0;
  font-size: 12px;
  opacity: 0.88;
}

.slogan {
  margin: 22px 0 0;
  font-size: 15px;
  letter-spacing: 2px;
  opacity: 0.95;
}

.panel {
  flex: 1;
  margin: -26px 16px 0;
  padding: 20px 18px 18px;
  background: #fff;
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
}

.panel-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.panel-sub {
  margin: 6px 0 16px;
  font-size: 12px;
  color: var(--ink-3);
  line-height: 1.6;
}

.accounts {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.account {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 12px;
  border: 1px solid var(--line);
  border-radius: var(--radius-md);
  background: #fff;
  text-align: left;
  transition: border-color 0.15s ease, background 0.15s ease, transform 0.12s ease;
}

.account:active {
  transform: scale(0.99);
}

.account.active {
  border-color: var(--brand);
  background: var(--brand-soft);
}

.avatar {
  width: 38px;
  height: 38px;
  flex: none;
  border-radius: 50%;
  color: #fff;
  font-size: 15px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
}

.account-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.account-name {
  font-size: 15px;
  font-weight: 600;
  color: var(--ink-1);
}

.account-note {
  font-size: 12px;
  color: var(--ink-3);
}

.tick {
  font-size: 19px;
  color: #d5d8dd;
}

.tick.on {
  color: var(--brand);
}

.enter-btn {
  margin-top: 18px;
  height: 46px;
  font-size: 16px;
}

.agreement {
  margin: 12px 0 0;
  font-size: 11px;
  color: var(--ink-3);
  text-align: center;
  line-height: 1.6;
}

.foot {
  margin-top: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 11px;
  color: #b8bcc3;
}

.ver {
  padding: 1px 6px;
  border-radius: 6px;
  background: #eef0f3;
}
</style>
