<template>
  <div class="page detail-page">
    <van-nav-bar title="订单详情" left-arrow fixed placeholder @click-left="router.back()" />

    <div v-if="loading" class="skeleton-wrap">
      <van-skeleton title :row="4" />
      <van-skeleton title :row="4" style="margin-top: 18px" />
    </div>

    <van-empty v-else-if="error" image="error" :description="error">
      <van-button round type="primary" size="small" @click="load">重新加载</van-button>
    </van-empty>

    <template v-else-if="order">
      <header :class="['banner', 'banner-' + order.status]">
        <div class="big">{{ orderStatusText(order.status) }}</div>
        <p class="banner-sub">{{ statusHint }}</p>
        <div v-if="showSteps" class="steps">
          <div v-for="(s, i) in steps" :key="s" :class="['step', { done: i <= stepIndex, current: i === stepIndex }]">
            <i class="node"></i>
            <span>{{ s }}</span>
          </div>
        </div>
      </header>

      <section class="card addr">
        <van-icon name="location-o" class="addr-icon" />
        <div class="addr-main">
          <div class="addr-line">
            <b>{{ order.consignee || '-' }}</b>
            <span class="phone">{{ order.phone || '' }}</span>
          </div>
          <p class="addr-text">{{ tidyAddress(order.address) || '-' }}</p>
        </div>
      </section>

      <section class="card">
        <h3 class="block-title">商品</h3>
        <div v-for="(item, idx) in order.orderDetailList || []" :key="idx" class="goods">
          <div class="goods-thumb">
            <img v-if="item.image" :src="item.image" :alt="item.name" />
            <span v-else>{{ (item.name || '?').slice(0, 1) }}</span>
          </div>
          <div class="goods-main">
            <div class="goods-name">{{ item.name }}</div>
            <div v-if="item.dishFlavor" class="goods-flavor">{{ item.dishFlavor }}</div>
          </div>
          <div class="goods-right">
            <span class="price">{{ money(item.amount) }}</span>
            <span class="qty">×{{ item.number }}</span>
          </div>
        </div>
        <div class="total-row">
          <span>合计</span>
          <span class="price total">{{ money(order.amount) }}</span>
        </div>
      </section>

      <section class="card">
        <h3 class="block-title">订单信息</h3>
        <div class="kv">
          <span>订单号</span>
          <span class="kv-v mono">{{ order.number }}</span>
        </div>
        <div class="kv">
          <span>支付方式</span>
          <span class="kv-v">在线支付（模拟）</span>
        </div>
        <div class="kv">
          <span>支付状态</span>
          <span class="kv-v">{{ payStatusText(order.payStatus) }}</span>
        </div>
        <div class="kv">
          <span>下单时间</span>
          <span class="kv-v">{{ formatDateTime(order.orderTime) }}</span>
        </div>
        <div v-if="order.checkoutTime" class="kv">
          <span>支付时间</span>
          <span class="kv-v">{{ formatDateTime(order.checkoutTime) }}</span>
        </div>
        <div v-if="order.remark" class="kv">
          <span>备注</span>
          <span class="kv-v">{{ order.remark }}</span>
        </div>
        <div v-if="order.cancelReason" class="kv">
          <span>取消原因</span>
          <span class="kv-v">{{ order.cancelReason }}</span>
        </div>
        <div v-if="order.rejectionReason" class="kv">
          <span>拒单原因</span>
          <span class="kv-v">{{ order.rejectionReason }}</span>
        </div>
      </section>

      <div class="action-bar">
        <div class="bar-price">
          <span class="muted">实付</span>
          <span class="price">{{ money(order.amount) }}</span>
        </div>
        <div class="bar-btns">
          <van-button v-if="order.status === 1" size="small" plain round @click="cancel">取消</van-button>
          <van-button v-if="order.status === 2 || order.status === 3" size="small" plain round @click="remind">催单</van-button>
          <van-button v-if="order.status === 5 || order.status === 6" size="small" plain round @click="repeat">再来一单</van-button>
          <van-button v-if="order.status === 1" size="small" type="primary" round :loading="busy" @click="pay">
            确认支付
          </van-button>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showConfirmDialog, showToast } from 'vant'
import { orderApi } from '../api/user'
import { formatDateTime, money, orderStatusText, payStatusText, tidyAddress } from '../utils/format'

const route = useRoute()
const router = useRouter()
const order = ref(null)
const loading = ref(true)
const error = ref('')
const busy = ref(false)

const steps = ['待付款', '待接单', '已接单', '派送中', '已完成']
const showSteps = computed(() => order.value && order.value.status >= 1 && order.value.status <= 5)
const stepIndex = computed(() => (order.value ? Math.min(order.value.status, 5) - 1 : 0))
const statusHint = computed(() => {
  const s = order.value ? order.value.status : 1
  return {
    1: '请在 15 分钟内完成支付',
    2: '已通知食堂，等待接单',
    3: '食堂已接单，正在备餐',
    4: '配送员正在路上，请留意电话',
    5: '订单已完成，感谢惠顾',
    6: '订单已取消，如已支付将原路退回',
    7: '食堂已拒单，如已支付将原路退回'
  }[s] || ''
})

async function load() {
  loading.value = true
  error.value = ''
  try {
    order.value = await orderApi.detail(route.params.id)
  } catch (e) {
    error.value = e.message || '加载失败'
  } finally {
    loading.value = false
  }
}

async function pay() {
  busy.value = true
  try {
    await orderApi.pay(order.value.number, 1)
    showToast({ type: 'success', message: '支付成功' })
    await load()
  } catch (e) {
    showToast(e.message || '支付失败')
  } finally {
    busy.value = false
  }
}

async function cancel() {
  try {
    await showConfirmDialog({ title: '取消订单', message: '确定取消该订单吗？' })
  } catch (e) {
    return
  }
  try {
    await orderApi.cancel(order.value.id)
    showToast('已取消')
    await load()
  } catch (e) {
    showToast(e.message || '取消失败')
  }
}

async function repeat() {
  try {
    await orderApi.repeat(order.value.id)
    showToast({ type: 'success', message: '已加入购物车' })
    router.push('/cart')
  } catch (e) {
    showToast(e.message || '操作失败')
  }
}

async function remind() {
  try {
    await orderApi.remind(order.value.id)
    showToast({ type: 'success', message: '已催单' })
  } catch (e) {
    showToast(e.message || '催单失败')
  }
}

onMounted(load)
</script>

<style scoped>
.detail-page {
  background: var(--bg);
  padding-bottom: calc(76px + env(safe-area-inset-bottom));
}

.banner {
  margin: 12px;
  padding: 18px 16px;
  border-radius: var(--radius-lg);
  color: #fff;
  background: linear-gradient(140deg, #ffa65c, #ff7a2f);
  box-shadow: 0 10px 24px rgba(255, 122, 47, 0.25);
}

.banner-1 { background: linear-gradient(140deg, #ffb453, #f0741f); }
.banner-2 { background: linear-gradient(140deg, #6aa9ff, #2f6fe4); box-shadow: 0 10px 24px rgba(47, 111, 228, 0.22); }
.banner-3 { background: linear-gradient(140deg, #5ec8b7, #189f8c); box-shadow: 0 10px 24px rgba(24, 159, 140, 0.22); }
.banner-4 { background: linear-gradient(140deg, #5ec8b7, #189f8c); box-shadow: 0 10px 24px rgba(24, 159, 140, 0.22); }
.banner-5 { background: linear-gradient(140deg, #9aa3ad, #6b7480); box-shadow: 0 10px 24px rgba(107, 116, 128, 0.2); }
.banner-6, .banner-7 { background: linear-gradient(140deg, #b0b6bd, #8a9199); box-shadow: none; }

.big {
  font-size: 20px;
  font-weight: 600;
  letter-spacing: 0.3px;
}

.banner-sub {
  margin: 4px 0 0;
  font-size: 12px;
  opacity: 0.9;
}

.steps {
  display: flex;
  justify-content: space-between;
  margin-top: 16px;
}

.step {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  font-size: 10px;
  opacity: 0.6;
  position: relative;
}

.step.done {
  opacity: 1;
}

.node {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.55);
}

.step.done .node {
  background: #fff;
}

.step.current span {
  font-weight: 600;
}

.card {
  margin: 12px;
  background: #fff;
  border-radius: var(--radius-lg);
  padding: 14px;
  box-shadow: var(--shadow-sm);
}

.addr {
  display: flex;
  gap: 10px;
  align-items: flex-start;
}

.addr-icon {
  font-size: 18px;
  color: var(--brand);
  margin-top: 2px;
}

.addr-main {
  flex: 1;
  min-width: 0;
}

.addr-line {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.addr-line b {
  font-size: 15px;
}

.phone {
  font-size: 12px;
  color: var(--ink-3);
}

.addr-text {
  margin: 4px 0 0;
  font-size: 13px;
  color: var(--ink-2);
  line-height: 1.5;
}

.block-title {
  margin: 0 0 10px;
  font-size: 14px;
  font-weight: 600;
}

.goods {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 0;
}

.goods-thumb {
  width: 44px;
  height: 44px;
  flex: none;
  border-radius: 8px;
  overflow: hidden;
  background: linear-gradient(135deg, #ffe3c4, #ffbf86);
  color: #fff;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}

.goods-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.goods-main {
  flex: 1;
  min-width: 0;
}

.goods-name {
  font-size: 14px;
  font-weight: 500;
}

.goods-flavor {
  font-size: 11px;
  color: var(--ink-3);
}

.goods-right {
  text-align: right;
  flex: none;
}

.qty {
  display: block;
  font-size: 11px;
  color: var(--ink-3);
}

.total-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 8px;
  padding-top: 10px;
  border-top: 1px dashed var(--line);
  font-size: 13px;
  color: var(--ink-2);
}

.total {
  font-size: 18px;
}

.kv {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 6px 0;
  font-size: 13px;
  color: var(--ink-3);
}

.kv-v {
  color: var(--ink-1);
  text-align: right;
  max-width: 68%;
  word-break: break-all;
}

.mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 12px;
}

.action-bar {
  position: fixed;
  left: 50%;
  bottom: 0;
  transform: translateX(-50%);
  width: 100%;
  max-width: 480px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 10px 14px calc(10px + env(safe-area-inset-bottom));
  background: rgba(255, 255, 255, 0.96);
  backdrop-filter: blur(8px);
  box-shadow: 0 -4px 16px rgba(31, 35, 41, 0.06);
}

.bar-price {
  display: flex;
  align-items: baseline;
  gap: 6px;
}

.bar-price .price {
  font-size: 19px;
}

.bar-btns {
  display: flex;
  gap: 8px;
}
</style>
