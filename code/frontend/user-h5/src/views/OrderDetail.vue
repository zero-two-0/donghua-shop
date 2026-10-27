<template>
  <div class="page">
    <van-nav-bar title="订单详情" left-arrow fixed placeholder @click-left="router.back()" />

    <van-loading v-if="loading" class="loading" vertical>加载中...</van-loading>
    <van-empty v-else-if="error" image="error" :description="error" />

    <template v-else-if="order">
      <div class="status-banner">
        <div class="big">{{ orderStatusText(order.status) }}</div>
        <div class="muted">订单号 {{ order.number }}</div>
      </div>

      <van-cell-group inset class="block">
        <van-cell title="收货人" :value="order.consignee || '-'" />
        <van-cell title="联系电话" :value="order.phone || '-'" />
        <van-cell title="收货地址" :value="order.address || '-'" />
        <van-cell title="备注" :value="order.remark || '无'" />
      </van-cell-group>

      <van-cell-group inset class="block">
        <van-cell v-for="(item, idx) in order.orderDetailList || []" :key="idx" :title="item.name" :label="item.dishFlavor || ''">
          <template #value>
            <span class="muted">×{{ item.number }}</span>
            <span class="price" style="margin-left: 8px">{{ money(item.amount) }}</span>
          </template>
        </van-cell>
        <van-cell title="订单总额">
          <template #value><span class="price">{{ money(order.amount) }}</span></template>
        </van-cell>
        <van-cell title="支付状态" :value="payStatusText(order.payStatus)" />
        <van-cell title="下单时间" :value="formatDateTime(order.orderTime)" />
        <van-cell v-if="order.checkoutTime" title="支付时间" :value="formatDateTime(order.checkoutTime)" />
        <van-cell v-if="order.cancelReason" title="取消原因" :value="order.cancelReason" />
        <van-cell v-if="order.rejectionReason" title="拒单原因" :value="order.rejectionReason" />
      </van-cell-group>

      <div class="actions">
        <van-button v-if="order.status === 1" type="primary" round block :loading="busy" @click="pay">
          模拟支付 {{ money(order.amount) }} 元
        </van-button>
        <van-button v-if="order.status === 1" plain round block @click="cancel">取消订单</van-button>
        <van-button v-if="order.status === 5 || order.status === 6" plain type="primary" round block @click="repeat">再来一单</van-button>
        <van-button v-if="order.status === 2 || order.status === 3" plain round block @click="remind">催单</van-button>
      </div>
    </template>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showConfirmDialog, showToast } from 'vant'
import { orderApi } from '../api/user'
import { formatDateTime, money, orderStatusText, payStatusText } from '../utils/format'

const route = useRoute()
const router = useRouter()
const order = ref(null)
const loading = ref(true)
const error = ref('')
const busy = ref(false)

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
.status-banner {
  padding: 20px 16px;
  background: linear-gradient(160deg, #f2a63b, #ee7a24);
  color: #fff;
  border-radius: 0 0 16px 16px;
}
.status-banner .big { font-size: 20px; font-weight: 700; margin-bottom: 4px; }
.status-banner .muted { color: rgba(255, 255, 255, 0.85); }
.block { margin-top: 12px; }
.actions { padding: 20px 16px; display: flex; flex-direction: column; gap: 10px; }
.loading { padding: 40px 0; }
</style>
