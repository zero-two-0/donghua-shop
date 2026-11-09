<template>
  <div class="page confirm-page">
    <van-nav-bar title="确认订单" left-arrow fixed placeholder @click-left="router.back()" />

    <div v-if="loading" class="skeleton-wrap">
      <van-skeleton title :row="3" />
      <van-skeleton title :row="3" style="margin-top: 18px" />
    </div>

    <template v-else>
      <section class="card addr" @click="pickAddress">
        <div class="addr-head">
          <van-icon name="location-o" class="addr-icon" />
          <span class="addr-title">收货信息</span>
          <van-icon name="arrow" class="addr-arrow" />
        </div>
        <template v-if="address">
          <div class="addr-line">
            <b>{{ address.consignee }}</b>
            <span class="phone">{{ address.phone }}</span>
            <van-tag v-if="address.isDefault === 1" plain type="primary" class="tag">默认</van-tag>
          </div>
          <p class="addr-text">{{ (address.districtName || '') + address.detail }}</p>
        </template>
        <p v-else class="addr-empty">还没有收货地址，点击添加</p>
      </section>

      <section class="card">
        <div class="card-head">
          <h3>商品清单</h3>
          <span class="muted">{{ cart.count }} 件</span>
        </div>
        <div v-for="item in cart.items" :key="item.id" class="goods">
          <div class="goods-thumb">
            <img v-if="item.image" :src="item.image" :alt="item.name" />
            <span v-else>{{ item.name.slice(0, 1) }}</span>
          </div>
          <div class="goods-main">
            <div class="goods-name">{{ item.name }}</div>
            <div v-if="item.dishFlavor" class="goods-flavor">{{ item.dishFlavor }}</div>
          </div>
          <div class="goods-right">
            <span class="price">{{ money(lineAmount(item)) }}</span>
            <span class="qty">×{{ item.number }}</span>
          </div>
        </div>
        <div class="fee">
          <div class="fee-line">
            <span>商品金额</span>
            <span>{{ money(cart.total) }}</span>
          </div>
          <div class="fee-line">
            <span>打包费</span>
            <span>¥0.00</span>
          </div>
        </div>
      </section>

      <section class="card">
        <van-field
          v-model="remark"
          label="备注"
          placeholder="口味偏好、餐具需求等（选填）"
          maxlength="100"
          show-word-limit
        />
        <van-cell title="支付方式" value="在线支付（模拟）" />
      </section>

      <van-submit-bar
        :price="cents(cart.total)"
        button-text="提交订单"
        :loading="submitting"
        :disabled="!address || !cart.items.length"
        class="bar"
        @submit="onSubmit"
      >
        <template #tip>提交后由食堂接单，出餐约 15 分钟</template>
      </van-submit-bar>
    </template>

    <van-popup v-model:show="addressPicker" position="bottom" round>
      <div class="picker">
        <div class="picker-title">选择收货地址</div>
        <van-cell
          v-for="a in addresses"
          :key="a.id"
          :title="`${a.consignee} ${a.phone}`"
          :label="`${a.districtName || ''}${a.detail}`"
          clickable
          @click="chooseAddress(a)"
        >
          <template #right-icon>
            <van-icon v-if="a.isDefault === 1" name="success" color="#12a150" />
          </template>
        </van-cell>
        <div class="picker-foot">
          <van-button size="small" plain round type="primary" icon="plus" @click="goCreateAddress">
            新增地址
          </van-button>
        </div>
      </div>
    </van-popup>

    <van-dialog
      v-model:show="payDialog"
      title="确认支付"
      show-cancel-button
      confirm-button-text="立即支付"
      cancel-button-text="稍后再付"
      @confirm="onPay"
      @cancel="afterSubmit"
    >
      <div class="pay-body">
        <div class="pay-amount price">{{ money(created.orderAmount) }}</div>
        <p class="muted">订单号 {{ created.orderNumber }}</p>
        <p class="muted">支付为模拟流程，不会产生真实扣款</p>
      </div>
    </van-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showToast } from 'vant'
import { addressApi, orderApi } from '../api/user'
import { useCartStore } from '../stores/cart'
import { cents, lineAmount, money } from '../utils/format'

const router = useRouter()
const route = useRoute()
const cart = useCartStore()

const addresses = ref([])
const selectedId = ref(null)
const remark = ref('')
const loading = ref(true)
const submitting = ref(false)
const payDialog = ref(false)
const addressPicker = ref(false)
const created = ref({})

const address = computed(() => addresses.value.find((a) => String(a.id) === String(selectedId.value)) || null)

async function load() {
  loading.value = true
  try {
    await cart.load()
    addresses.value = (await addressApi.list()) || []
    const def = addresses.value.find((a) => a.isDefault === 1) || addresses.value[0]
    selectedId.value = def ? def.id : null
  } catch (e) {
    showToast(e.message || '加载失败')
  } finally {
    loading.value = false
  }
}

function pickAddress() {
  if (!addresses.value.length) {
    goCreateAddress()
    return
  }
  addressPicker.value = true
}

function chooseAddress(a) {
  selectedId.value = a.id
  addressPicker.value = false
}

function goCreateAddress() {
  router.push({ path: '/addresses/edit', query: { redirect: route.fullPath } })
}

async function onSubmit() {
  if (!address.value) {
    showToast('请选择收货地址')
    return
  }
  if (!cart.items.length) {
    showToast('购物车为空')
    return
  }
  submitting.value = true
  try {
    // 金额与明细由后端计算，客户端只提交地址与备注
    const data = await orderApi.submit({
      addressBookId: address.value.id,
      remark: remark.value || null,
      payMethod: 1,
      deliveryStatus: 1,
      tablewareNumber: 0,
      tablewareStatus: 1,
      packAmount: 0
    })
    created.value = data
    payDialog.value = true
  } catch (e) {
    showToast(e.message || '下单失败')
  } finally {
    submitting.value = false
  }
}

async function onPay() {
  try {
    await orderApi.pay(created.value.orderNumber, 1)
    showToast({ type: 'success', message: '支付成功' })
    await cart.load().catch(() => {})
    router.replace(`/orders/${created.value.id}`)
  } catch (e) {
    showToast(e.message || '支付失败')
    router.replace('/orders')
  }
}

function afterSubmit() {
  router.replace('/orders')
}

onMounted(load)
</script>

<style scoped>
.confirm-page {
  background: var(--bg);
  padding-bottom: 80px;
}

.card {
  margin: 12px;
  background: #fff;
  border-radius: var(--radius-lg);
  padding: 14px;
  box-shadow: var(--shadow-sm);
}

.addr {
  cursor: pointer;
}

.addr-head {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
}

.addr-icon {
  color: var(--brand);
  font-size: 16px;
}

.addr-title {
  flex: 1;
  font-size: 12px;
  color: var(--ink-3);
}

.addr-arrow {
  color: #c8ccd2;
}

.addr-line {
  display: flex;
  align-items: center;
  gap: 8px;
}

.addr-line b {
  font-size: 16px;
}

.phone {
  font-size: 12px;
  color: var(--ink-3);
}

.tag {
  margin-left: auto;
}

.addr-text {
  margin: 6px 0 0;
  font-size: 13px;
  color: var(--ink-2);
  line-height: 1.55;
}

.addr-empty {
  margin: 4px 0 0;
  font-size: 13px;
  color: var(--ink-3);
}

.card-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 6px;
}

.card-head h3 {
  margin: 0;
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
  width: 42px;
  height: 42px;
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
}

.goods-flavor {
  font-size: 11px;
  color: var(--ink-3);
}

.goods-right {
  text-align: right;
}

.qty {
  display: block;
  font-size: 11px;
  color: var(--ink-3);
}

.fee {
  margin-top: 8px;
  padding-top: 10px;
  border-top: 1px dashed var(--line);
}

.fee-line {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  color: var(--ink-2);
  padding: 4px 0;
}

.bar {
  padding-bottom: env(safe-area-inset-bottom);
}

.picker {
  padding-bottom: calc(12px + env(safe-area-inset-bottom));
  max-height: 62vh;
  overflow-y: auto;
}

.picker-title {
  padding: 14px 16px 8px;
  font-weight: 600;
}

.picker-foot {
  padding: 12px 16px 0;
  text-align: center;
}

.pay-body {
  padding: 12px 20px 18px;
  text-align: center;
}

.pay-amount {
  font-size: 26px;
  margin: 6px 0 10px;
}

.pay-body .muted {
  margin: 4px 0;
  line-height: 1.6;
}
</style>
