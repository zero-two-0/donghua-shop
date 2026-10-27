<template>
  <div class="page">
    <van-nav-bar title="确认订单" left-arrow fixed placeholder @click-left="router.back()" />

    <van-loading v-if="loading" class="loading" vertical>加载中...</van-loading>

    <template v-else>
      <van-cell-group inset class="block">
        <van-cell title="收货地址" is-link @click="pickAddress">
          <template #value>
            <div v-if="address" class="addr">
              <div class="addr-line">{{ address.consignee }} {{ address.phone }}</div>
              <div class="muted">{{ address.districtName || '' }}{{ address.detail }}</div>
            </div>
            <span v-else class="muted">请选择收货地址</span>
          </template>
        </van-cell>
      </van-cell-group>

      <van-cell-group inset class="block">
        <van-cell v-for="item in cart.items" :key="item.id" :title="item.name" :label="item.dishFlavor || ''">
          <template #value>
            <span class="muted">×{{ item.number }}</span>
            <span class="price" style="margin-left: 8px">{{ money(lineAmount(item)) }}</span>
          </template>
        </van-cell>
        <van-cell title="商品合计">
          <template #value><span class="price">{{ money(cart.total) }}</span></template>
        </van-cell>
      </van-cell-group>

      <van-cell-group inset class="block">
        <van-field v-model="remark" label="备注" placeholder="如：不要香菜、少辣" maxlength="100" />
        <van-cell title="支付方式" value="模拟支付（不接入微信支付）" />
      </van-cell-group>

      <van-submit-bar
        :price="cents(cart.total)"
        button-text="提交订单"
        :loading="submitting"
        :disabled="!address || !cart.items.length"
        @submit="onSubmit"
      >
        <template #tip>最终金额以后端返回为准；提交后进入模拟支付</template>
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
            <van-icon v-if="a.isDefault === 1" name="success" color="#07c160" />
          </template>
        </van-cell>
        <div class="picker-foot">
          <van-button size="small" plain type="primary" @click="goCreateAddress">新增地址</van-button>
        </div>
      </div>
    </van-popup>

    <van-dialog
      v-model:show="payDialog"
      title="模拟支付"
      show-cancel-button
      confirm-button-text="确认支付"
      cancel-button-text="稍后再付"
      @confirm="onPay"
      @cancel="afterSubmit"
    >
      <div class="pay-body">
        <p>订单号：{{ created.orderNumber }}</p>
        <p>应付金额：<span class="price">{{ money(created.orderAmount) }}</span></p>
        <p class="muted">课程内不调用微信支付，确认后仅把订单状态改为“待接单”。</p>
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
    // 契约要求只提交地址与备注；金额、明细、运费均由后端计算，客户端不传金额
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
.block { margin-top: 12px; }
.addr-line { font-size: 14px; font-weight: 600; }
.addr { text-align: right; }
.pay-body { padding: 12px 20px; font-size: 13px; line-height: 1.8; }
.loading { padding: 40px 0; }
.picker { padding-bottom: 12px; max-height: 60vh; overflow-y: auto; }
.picker-title { padding: 14px 16px 8px; font-weight: 600; }
.picker-foot { padding: 12px 16px 0; text-align: right; }
</style>
