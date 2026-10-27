<template>
  <div class="page">
    <van-nav-bar title="个人中心" fixed placeholder />

    <div class="user-card">
      <div class="avatar">{{ auth.displayName.slice(0, 1) }}</div>
      <div>
        <div class="name">{{ auth.isLogin ? auth.displayName : '未登录' }}</div>
        <div class="muted">{{ auth.isLogin ? '受控课程身份：' + (auth.user?.openid || '') : '登录后可下单与查看订单' }}</div>
      </div>
      <van-button v-if="!auth.isLogin" size="small" type="primary" @click="router.push('/login')">去登录</van-button>
    </div>

    <van-cell-group v-if="auth.isLogin" inset class="block">
      <van-cell title="我的订单" is-link to="/orders" icon="orders-o" />
      <van-cell title="收货地址" is-link to="/addresses" icon="location-o" />
    </van-cell-group>

    <van-cell-group inset class="block">
      <van-cell title="店铺状态" :value="shopText" icon="shop-o" />
      <van-cell title="关于本系统" is-link icon="info-o" @click="showAbout = true" />
    </van-cell-group>

    <div class="logout" v-if="auth.isLogin">
      <van-button round block plain type="danger" @click="onLogout">退出登录</van-button>
    </div>

    <van-dialog v-model:show="showAbout" title="关于" show-cancel-button :show-confirm-button="false">
      <div class="about">
        <p>东华大学在线点餐系统 · 用户端 H5（Vue 3 + Vant 4）</p>
        <p class="muted">接口契约：组长 OpenAPI v1.0.0-draft（41 个用户端/管理端路径）。</p>
        <p class="muted">课程内使用受控测试身份与模拟支付，不接入微信登录、短信与真实支付。</p>
      </div>
    </van-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { showToast } from 'vant'
import { catalogApi } from '../api/user'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const auth = useAuthStore()
const showAbout = ref(false)
const shopStatus = ref(1)

const shopText = computed(() => (shopStatus.value === 1 ? '营业中' : '休息中'))

function onLogout() {
  auth.logout()
  showToast('已退出登录')
  router.replace('/login')
}

onMounted(async () => {
  try {
    shopStatus.value = Number(await catalogApi.shopStatus()) === 0 ? 0 : 1
  } catch (e) {
    shopStatus.value = 1
  }
})
</script>

<style scoped>
.user-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 24px 16px;
  background: linear-gradient(160deg, #f2a63b, #ee7a24);
  color: #fff;
}
.avatar {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.28);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  font-weight: 700;
}
.user-card .name { font-size: 17px; font-weight: 600; }
.user-card .muted { color: rgba(255, 255, 255, 0.85); font-size: 12px; }
.block { margin-top: 12px; }
.logout { padding: 24px 16px; }
.about { padding: 12px 20px; font-size: 13px; line-height: 1.8; }
</style>
