<template>
  <div class="page">
    <van-nav-bar title="我的订单" fixed placeholder />

    <van-tabs v-model:active="active" sticky @change="load">
      <van-tab v-for="t in tabs" :key="t.name" :title="t.title" :name="t.name" />
    </van-tabs>

    <van-loading v-if="loading" class="loading" vertical>加载中...</van-loading>
    <van-empty v-else-if="!orders.length" description="暂无订单">
      <van-button round type="primary" size="small" to="/home">去点餐</van-button>
    </van-empty>

    <div v-else class="list">
      <div v-for="o in orders" :key="o.id" class="order-card" @click="goDetail(o)">
        <div class="card-head">
          <span class="muted">{{ formatDateTime(o.orderTime) }}</span>
          <span :class="['status', 'status-' + o.status]">{{ orderStatusText(o.status) }}</span>
        </div>
        <div class="card-body">{{ orderSummaryText(o) }}</div>
        <div class="card-foot">
          <span class="muted ellipsis">{{ o.consignee }} · {{ o.address }}</span>
          <span class="price">{{ money(o.amount) }}</span>
        </div>
        <div class="card-actions">
          <van-button v-if="o.status === 1" size="small" type="primary" @click.stop="pay(o)">去支付</van-button>
          <van-button v-if="o.status === 1" size="small" plain @click.stop="cancel(o)">取消订单</van-button>
          <van-button v-if="o.status === 5 || o.status === 6" size="small" plain type="primary" @click.stop="repeat(o)">再来一单</van-button>
          <van-button v-if="o.status === 2 || o.status === 3" size="small" plain @click.stop="remind(o)">催单</van-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { showConfirmDialog, showToast } from 'vant'
import { orderApi } from '../api/user'
import { formatDateTime, money, orderStatusText, orderSummaryText } from '../utils/format'

const router = useRouter()
const tabs = [
  { title: '全部', name: '' },
  { title: '待付款', name: '1' },
  { title: '待接单', name: '2' },
  { title: '派送中', name: '4' },
  { title: '已完成', name: '5' }
]

const active = ref('')
const orders = ref([])
const loading = ref(false)

async function load() {
  loading.value = true
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
  }
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
    showToast({ type: 'success', message: '已催单，请等待商家处理' })
  } catch (e) {
    showToast(e.message || '催单失败')
  }
}

onMounted(load)
</script>

<style scoped>
.list { padding: 12px; }
.order-card {
  background: #fff;
  border-radius: 12px;
  padding: 12px;
  margin-bottom: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}
.card-head { display: flex; justify-content: space-between; align-items: center; }
.status { font-size: 12px; padding: 2px 8px; border-radius: 999px; background: #f2f3f5; color: #646566; }
.status-1 { background: #fff1e6; color: #ee7a24; }
.status-2, .status-3 { background: #e8f3ff; color: #1989fa; }
.status-4 { background: #e8fff0; color: #07c160; }
.status-5 { background: #f2f3f5; color: #969799; }
.status-6 { background: #fee; color: #ee0a24; }
.card-body { margin: 8px 0; font-size: 15px; font-weight: 600; }
.card-foot { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
.ellipsis { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.card-actions { margin-top: 10px; display: flex; gap: 8px; justify-content: flex-end; }
.loading { padding: 40px 0; }
</style>
