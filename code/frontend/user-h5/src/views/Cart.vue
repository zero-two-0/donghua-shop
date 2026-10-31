<template>
  <div class="page cart-page">
    <van-nav-bar title="购物车" fixed placeholder />

    <van-loading v-if="cart.loading" class="loading" vertical>加载中...</van-loading>
    <van-empty v-else-if="!cart.items.length" description="购物车还是空的">
      <van-button round type="primary" size="small" to="/home">去点餐</van-button>
    </van-empty>

    <template v-else>
      <van-cell-group inset class="list">
        <van-swipe-cell v-for="item in cart.items" :key="item.id">
          <div class="cart-item">
            <div class="thumb">
              <img v-if="item.image" :src="item.image" :alt="item.name" />
              <span v-else>{{ item.name.slice(0, 1) }}</span>
            </div>
            <div class="info">
              <div class="name">{{ item.name }}</div>
              <div v-if="item.dishFlavor" class="muted">{{ item.dishFlavor }}</div>
              <div class="row-bottom">
                <span class="price">{{ money(lineAmount(item)) }}</span>
                <van-stepper
                  :model-value="item.number"
                  :min="1"
                  :max="99"
                  integer
                  async-change
                  @change="(v) => onChange(item, v)"
                />
              </div>
            </div>
          </div>
          <template #right>
            <van-button square type="danger" text="删除" class="del" @click="onRemove(item)" />
          </template>
        </van-swipe-cell>
      </van-cell-group>

      <div class="clear-row">
        <van-button size="small" plain type="danger" @click="onClear">清空购物车</van-button>
      </div>

      <van-submit-bar :price="cents(cart.total)" button-text="去结算" @submit="goConfirm">
        <template #tip>
          共 {{ cart.count }} 件；金额按 单价 × 数量 展示，最终以下单返回为准
        </template>
      </van-submit-bar>
    </template>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { showConfirmDialog, showToast } from 'vant'
import { useCartStore } from '../stores/cart'
import { cents, lineAmount, money } from '../utils/format'

const cart = useCartStore()
const router = useRouter()

async function onChange(item, value) {
  try {
    await cart.updateNumber(item.id, Number(value))
  } catch (e) {
    showToast(e.message || '修改数量失败')
    await cart.load()
  }
}

async function onRemove(item) {
  try {
    await cart.remove(item.id)
    showToast('已删除')
  } catch (e) {
    showToast(e.message || '删除失败')
  }
}

async function onClear() {
  try {
    await showConfirmDialog({ title: '清空购物车', message: '确定要清空全部商品吗？' })
  } catch (e) {
    return
  }
  try {
    await cart.clear()
    showToast('已清空')
  } catch (e) {
    showToast(e.message || '清空失败')
  }
}

function goConfirm() {
  if (!cart.items.length) {
    showToast('购物车为空')
    return
  }
  router.push('/order/confirm')
}

onMounted(() => {
  cart.load().catch((e) => showToast(e.message || '加载失败'))
})
</script>

<style scoped>
.list { margin-top: 12px; }
.cart-item { display: flex; gap: 10px; padding: 12px; }
.thumb {
  width: 72px;
  height: 72px;
  flex: none;
  border-radius: 8px;
  overflow: hidden;
  background: linear-gradient(135deg, #ffe9c7, #ffd08a);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 20px;
  font-weight: 700;
}
.thumb img { width: 100%; height: 100%; object-fit: cover; }
.info { flex: 1; min-width: 0; }
.name { font-size: 15px; font-weight: 600; }
.row-bottom { display: flex; align-items: center; justify-content: space-between; gap: 4px; flex-wrap: wrap; margin-top: 8px; }
@media (max-width: 360px) {
  .thumb { width: 56px; height: 56px; font-size: 18px; }
  .name { font-size: 14px; }
}
.del { height: 100%; }
.clear-row { padding: 12px 16px 80px; text-align: right; }
.loading { padding: 40px 0; }
</style>
