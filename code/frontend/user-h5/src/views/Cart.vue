<template>
  <div class="page cart-page">
    <van-nav-bar title="购物车" fixed placeholder>
      <template #right>
        <span v-if="cart.items.length" class="nav-action" @click="onClear">清空</span>
      </template>
    </van-nav-bar>

    <div v-if="cart.loading" class="skeleton-wrap">
      <van-skeleton title avatar :row="2" />
      <van-skeleton title avatar :row="2" style="margin-top: 18px" />
    </div>

    <van-empty v-else-if="!cart.items.length" image="search" description="购物车空空如也">
      <van-button round type="primary" size="small" to="/home">去逛逛</van-button>
    </van-empty>

    <template v-else>
      <div class="tip">
        <van-icon name="clock-o" />
        <span>下单后约 15 分钟出餐，请按取餐号在前台取餐</span>
      </div>

      <div class="list">
        <van-swipe-cell v-for="item in cart.items" :key="item.id" class="swipe">
          <div class="cart-item">
            <div class="thumb">
              <img v-if="item.image" :src="item.image" :alt="item.name" />
              <span v-else>{{ item.name.slice(0, 1) }}</span>
            </div>
            <div class="info">
              <div class="name">{{ item.name }}</div>
              <div v-if="item.dishFlavor" class="flavor">{{ item.dishFlavor }}</div>
              <div class="row-bottom">
                <span class="price">{{ money(lineAmount(item)) }}</span>
                <van-stepper
                  :model-value="item.number"
                  :min="1"
                  :max="99"
                  integer
                  async-change
                  button-size="24"
                  @change="(v) => onChange(item, v)"
                />
              </div>
            </div>
          </div>
          <template #right>
            <van-button square type="danger" text="删除" class="del" @click="onRemove(item)" />
          </template>
        </van-swipe-cell>
      </div>

      <div class="summary card">
        <div class="line">
          <span>商品件数</span>
          <span>{{ cart.count }} 件</span>
        </div>
        <div class="line">
          <span>打包费</span>
          <span>¥0.00</span>
        </div>
        <div class="line total">
          <span>合计</span>
          <span class="price">{{ money(cart.total) }}</span>
        </div>
      </div>

      <van-submit-bar
        :price="cents(cart.total)"
        button-text="去结算"
        class="bar"
        @submit="goConfirm"
      >
        <template #tip>到店出示订单号即可取餐</template>
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
.cart-page {
  background: var(--bg);
}

.nav-action {
  font-size: 14px;
  color: var(--ink-2);
}

.tip {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 12px 12px 0;
  padding: 8px 12px;
  border-radius: 10px;
  background: var(--brand-soft);
  color: #a15a20;
  font-size: 12px;
}

.list {
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.swipe {
  border-radius: var(--radius-md);
  overflow: hidden;
  box-shadow: var(--shadow-sm);
}

.cart-item {
  display: flex;
  gap: 12px;
  padding: 12px;
  background: #fff;
}

.thumb {
  width: 74px;
  height: 74px;
  flex: none;
  border-radius: 10px;
  overflow: hidden;
  background: linear-gradient(135deg, #ffe3c4, #ffbf86);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 20px;
  font-weight: 700;
}

.thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.name {
  font-size: 15px;
  font-weight: 600;
}

.flavor {
  margin-top: 3px;
  font-size: 12px;
  color: var(--ink-3);
}

.row-bottom {
  margin-top: auto;
  padding-top: 8px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
}

.price {
  font-size: 16px;
}

.del {
  height: 100%;
}

.summary {
  margin: 0 12px 96px;
}

.line {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 2px;
  font-size: 13px;
  color: var(--ink-2);
}

.line.total {
  margin-top: 4px;
  padding-top: 10px;
  border-top: 1px dashed var(--line);
  font-size: 14px;
  color: var(--ink-1);
  font-weight: 600;
}

.bar {
  padding-bottom: env(safe-area-inset-bottom);
}

@media (max-width: 360px) {
  .thumb {
    width: 58px;
    height: 58px;
    font-size: 18px;
  }

  .name {
    font-size: 14px;
  }
}
</style>
