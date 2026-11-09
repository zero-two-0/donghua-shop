<template>
  <div class="page orders-page">
    <van-nav-bar title="我的订单" fixed placeholder />

    <van-tabs v-model:active="active" sticky shrink @change="load">
      <van-tab v-for="t in tabs" :key="t.name" :title="t.title" :name="t.name" />
    </van-tabs>

    <div v-if="loading" class="skeleton-wrap">
      <van-skeleton title :row="3" />
      <van-skeleton title :row="3" style="margin-top: 18px" />
    </div>

    <van-empty v-else-if="!orders.length" image="search" description="还没有相关订单">
      <van-button round type="primary" size="small" to="/home">去点餐</van-button>
    </van-empty>

    <van-pull-refresh v-else v-model="refreshing" @refresh="onRefresh">
      <div class="list">
        <article v-for="o in orders" :key="o.id" class="order-card" @click="goDetail(o)">
          <header class="card-head">
            <span class="time">{{ formatDateTime(o.orderTime) }}</span>
            <span :class="['status', 'status-' + o.status]">{{ orderStatusText(o.status) }}</span>
          </header>

          <div class="card-body">
            <span class="summary">{{ orderSummaryText(o) }}</span>
            <span class="amount price">{{ money(o.amount) }}</span>
          </div>

          <div class="meta">
            <van-icon name="location-o" />
            <span class="ellipsis">{{ o.consignee }} · {{ tidyAddress(o.address) }}</span>
          </div>

          <footer v-if="hasAction(o)" class="card-actions">
            <van-button v-if="o.status === 2 || o.status === 3" size="small" plain round @click.stop="remind(o)">
              催单
            </van-button>
            <van-button v-if="o.status === 5 || o.status === 6" size="small" plain round @click.stop="repeat(o)">
              再来一单
            </van-button>
            <van-button v-if="o.status === 1" size="small" plain round @click.stop="cancel(o)">
              取消订单
            </van-button>
            <van-button v-if="o.status === 1" size="small" type="primary" round @click.stop="pay(o)">
              去支付
            </van-button>
          </footer>
        </article>
      </div>
    </van-pull-refresh>
  </div>
</template>

<script setup>
import { onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showConfirmDialog, showToast } from 'vant'
import { orderApi } from '../api/user'
import { formatDateTime, money, orderStatusText, orderSummaryText, tidyAddress } from '../utils/format'

const router = useRouter()
const route = useRoute()
const tabs = [
  { title: '全部', name: '' },
  { title: '待付款', name: '1' },
  { title: '待接单', name: '2' },
  { title: '派送中', name: '4' },
  { title: '已完成', name: '5' }
]

const initialStatus = typeof route.query.status === 'string' ? route.query.status : ''
const active = ref(initialStatus)
const orders = ref([])
const loading = ref(false)
const refreshing = ref(false)

// 从个人中心的“待付款 / 进行中 / 已完成”进入时，直接定位到对应筛选
watch(
  () => route.query.status,
  (v) => {
    const next = typeof v === 'string' ? v : ''
    if (next !== active.value) {
      active.value = next
      load()
    }
  }
)

function hasAction(o) {
  return [1, 2, 3, 5, 6].includes(o.status)
}

async function load() {
  loading.value = !refreshing.value
  try {
    const page = await orderApi.history({
      page: 1,
      pageSize: 20,
      status: active.value === '' ? undefined : Number(active.value)
    })
    orders.value = (page && page.records) || []
  } catch (e) {
    showToast(e.message || '加载失败')
  } finally {
    loading.value = false
    refreshing.value = false
  }
}

function onRefresh() {
  load()
}

function goDetail(order) {
  router.push(`/orders/${order.id}`)
}

async function pay(order) {
  try {
    await orderApi.pay(order.number, 1)
    showToast({ type: 'success', message: '支付成功' })
    await load()
  } catch (e) {
    showToast(e.message || '支付失败')
  }
}

async function cancel(order) {
  try {
    await showConfirmDialog({ title: '取消订单', message: '确定取消该订单吗？' })
  } catch (e) {
    return
  }
  try {
    await orderApi.cancel(order.id)
    showToast('已取消')
    await load()
  } catch (e) {
    showToast(e.message || '取消失败')
  }
}

async function repeat(order) {
  try {
    await orderApi.repeat(order.id)
    showToast({ type: 'success', message: '已加入购物车' })
    router.push('/cart')
  } catch (e) {
    showToast(e.message || '操作失败')
  }
}

async function remind(order) {
  try {
    await orderApi.remind(order.id)
    showToast({ type: 'success', message: '已催单，请稍候' })
  } catch (e) {
    showToast(e.message || '催单失败')
  }
}

onMounted(load)
</script>

<style scoped>
.orders-page {
  background: var(--bg);
}

.list {
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 62vh;
}

.order-card {
  background: #fff;
  border-radius: var(--radius-md);
  padding: 14px;
  box-shadow: var(--shadow-sm);
  transition: transform 0.12s ease;
}

.order-card:active {
  transform: scale(0.995);
}

.card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.time {
  font-size: 12px;
  color: var(--ink-3);
}

.status {
  font-size: 11px;
  padding: 3px 9px;
  border-radius: 999px;
  background: #f2f3f5;
  color: #646566;
  font-weight: 500;
}

.status-1 { background: #fff3e6; color: #d97706; }
.status-2, .status-3 { background: #e8f1ff; color: #2563eb; }
.status-4 { background: #e9f9ef; color: #0f9d58; }
.status-5 { background: #f2f3f5; color: #86909c; }
.status-6 { background: #fdecec; color: #d93026; }

.card-body {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
  margin: 10px 0 8px;
}

.summary {
  flex: 1;
  min-width: 0;
  font-size: 15px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.amount {
  font-size: 16px;
  flex: none;
}

.meta {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--ink-3);
}

.ellipsis {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card-actions {
  margin-top: 12px;
  padding-top: 10px;
  border-top: 1px solid var(--line);
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

@media (max-width: 360px) {
  .summary {
    font-size: 14px;
  }
}
</style>
