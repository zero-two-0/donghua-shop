<template>
  <div class="page profile-page">
    <header class="profile-head">
      <div class="avatar">{{ (auth.isLogin ? auth.displayName : '食').slice(0, 1) }}</div>
      <div class="head-main">
        <h1>{{ auth.isLogin ? auth.displayName : '未登录' }}</h1>
        <p>{{ auth.isLogin ? '东华大学 · 松江校区' : '登录后可下单与查看订单' }}</p>
      </div>
      <van-button v-if="!auth.isLogin" size="small" round type="primary" @click="router.push('/login')">
        去登录
      </van-button>
    </header>

    <div v-if="auth.isLogin" class="stats">
      <div class="stat" @click="goOrders('1')">
        <b>{{ stats.pending }}</b>
        <span>待付款</span>
      </div>
      <div class="stat" @click="goOrders('2')">
        <b>{{ stats.ongoing }}</b>
        <span>进行中</span>
      </div>
      <div class="stat" @click="goOrders('5')">
        <b>{{ stats.done }}</b>
        <span>已完成</span>
      </div>
    </div>

    <section class="card group">
      <div class="group-title">常用功能</div>
      <van-cell title="我的订单" is-link to="/orders" icon="orders-o" />
      <van-cell title="收货地址" is-link to="/addresses" icon="location-o" />
    </section>

    <section class="card group">
      <div class="group-title">更多</div>
      <van-cell title="店铺状态" icon="shop-o">
        <template #value>
          <span :class="['shop-state', { off: shopStatus === 0 }]">{{ shopText }}</span>
        </template>
      </van-cell>
      <van-cell title="关于" is-link icon="info-o" @click="showAbout = true" />
    </section>

    <div v-if="auth.isLogin" class="logout">
      <van-button round block @click="onLogout">退出登录</van-button>
    </div>

    <p class="foot">东华大学 · 校园点餐系统 v1.2.0</p>

    <van-dialog v-model:show="showAbout" title="关于" :show-confirm-button="false" show-cancel-button>
      <div class="about">
        <p class="app-name">东华食堂 · 校园点餐</p>
        <p class="muted">版本 1.2.0</p>
        <p class="muted">在线支付为模拟支付，不会产生真实扣款。</p>
        <p class="muted">如需帮助，请联系食堂服务台。</p>
      </div>
    </van-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { showToast } from 'vant'
import { catalogApi, orderApi } from '../api/user'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const auth = useAuthStore()
const showAbout = ref(false)
const shopStatus = ref(1)
const stats = ref({ pending: 0, ongoing: 0, done: 0 })

const shopText = computed(() => (shopStatus.value === 1 ? '营业中' : '休息中'))

function goOrders(status) {
  router.push({ path: '/orders', query: { status } })
}

function onLogout() {
  auth.logout()
  showToast('已退出登录')
  router.replace('/login')
}

async function loadStats() {
  try {
    const page = await orderApi.history({ page: 1, pageSize: 50 })
    const list = (page && page.records) || []
    stats.value = {
      pending: list.filter((o) => o.status === 1).length,
      ongoing: list.filter((o) => o.status === 2 || o.status === 3 || o.status === 4).length,
      done: list.filter((o) => o.status === 5).length
    }
  } catch (e) {
    /* 统计失败不影响页面 */
  }
}

onMounted(async () => {
  try {
    shopStatus.value = Number(await catalogApi.shopStatus()) === 0 ? 0 : 1
  } catch (e) {
    shopStatus.value = 1
  }
  if (auth.isLogin) loadStats()
})
</script>

<style scoped>
.profile-page {
  background: var(--bg);
}

.profile-head {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 26px 18px 30px;
  background: linear-gradient(150deg, #ff9a4d, #ff7a2f 60%, #f2601c);
  color: #fff;
  border-radius: 0 0 26px 26px;
}

.avatar {
  width: 54px;
  height: 54px;
  flex: none;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.24);
  border: 1px solid rgba(255, 255, 255, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  font-weight: 600;
}

.head-main {
  flex: 1;
  min-width: 0;
}

.head-main h1 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.head-main p {
  margin: 4px 0 0;
  font-size: 12px;
  opacity: 0.88;
}

.stats {
  display: flex;
  margin: -16px 12px 0;
  padding: 14px 0;
  background: #fff;
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
}

.stat {
  flex: 1;
  text-align: center;
  cursor: pointer;
}

.stat + .stat {
  border-left: 1px solid var(--line);
}

.stat b {
  display: block;
  font-size: 19px;
  font-weight: 600;
  color: var(--ink-1);
}

.stat span {
  font-size: 11px;
  color: var(--ink-3);
}

.card.group {
  margin: 12px;
  padding: 6px 0 2px;
  background: #fff;
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  overflow: hidden;
}

.group-title {
  padding: 10px 16px 4px;
  font-size: 12px;
  color: var(--ink-3);
}

.shop-state {
  color: #12a150;
  font-size: 13px;
}

.shop-state.off {
  color: var(--ink-3);
}

.logout {
  padding: 20px 16px 8px;
}

.foot {
  margin: 6px 0 20px;
  text-align: center;
  font-size: 11px;
  color: #b8bcc3;
}

.about {
  padding: 18px 22px 22px;
  text-align: center;
}

.app-name {
  margin: 0 0 4px;
  font-size: 15px;
  font-weight: 600;
}

.about .muted {
  margin: 4px 0;
  line-height: 1.6;
}
</style>
