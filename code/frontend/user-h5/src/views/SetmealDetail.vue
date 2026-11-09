<template>
  <div class="page setmeal-page">
    <van-nav-bar title="套餐详情" left-arrow fixed placeholder @click-left="router.back()" />

    <van-skeleton v-if="loading" title :row="5" class="skeleton-wrap" style="padding-top: 16px" />
    <van-empty v-else-if="error" image="error" :description="error" />

    <template v-else-if="setmeal">
      <div class="hero">
        <img v-if="setmeal.image" :src="setmeal.image" :alt="setmeal.name" />
        <div v-else class="hero-fallback">{{ setmeal.name.slice(0, 1) }}</div>
        <div v-if="setmeal.status !== 1" class="hero-mask">今日已售完</div>
      </div>

      <section class="card head-card">
        <div class="head-main">
          <h1>{{ setmeal.name }}</h1>
          <p class="desc">{{ setmeal.description || '食堂当日搭配，按套餐结算更划算' }}</p>
        </div>
        <div class="head-price">
          <span class="price">{{ money(setmeal.price) }}</span>
          <span class="unit">/ 套</span>
        </div>
      </section>

      <section class="card">
        <h2 class="card-title">套餐包含</h2>
        <div v-for="(item, idx) in items" :key="idx" class="combo">
          <div class="combo-thumb">
            <img v-if="item.image" :src="item.image" :alt="item.name" />
            <span v-else>{{ (item.name || '?').slice(0, 1) }}</span>
          </div>
          <div class="combo-main">
            <div class="combo-name">{{ item.name }}</div>
            <div v-if="item.description" class="combo-desc">{{ item.description }}</div>
          </div>
          <span class="copies">×{{ item.copies }}</span>
        </div>
        <van-empty v-if="!items.length" image="search" description="暂未查询到套餐组成" />
      </section>

      <van-submit-bar
        :price="cents(setmeal.price)"
        :button-text="setmeal.status === 1 ? '加入购物车' : '今日已售完'"
        :disabled="setmeal.status !== 1"
        :loading="submitting"
        class="bar"
        @submit="onAdd"
      />
    </template>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showToast } from 'vant'
import { catalogApi } from '../api/user'
import { useAuthStore } from '../stores/auth'
import { useCartStore } from '../stores/cart'
import { cents, money } from '../utils/format'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const cart = useCartStore()

const setmeal = ref(null)
const items = ref([])
const loading = ref(true)
const error = ref('')
const submitting = ref(false)

async function load() {
  loading.value = true
  error.value = ''
  try {
    const list = (await catalogApi.setmeals({})) || []
    const target = list.find((s) => String(s.id) === String(route.params.id))
    if (!target) {
      error.value = '套餐不存在或已下架'
      return
    }
    setmeal.value = target
    items.value = (await catalogApi.setmealDishes(target.id)) || []
  } catch (e) {
    error.value = e.message || '加载失败'
  } finally {
    loading.value = false
  }
}

async function onAdd() {
  if (!auth.isLogin) {
    router.push({ path: '/login', query: { redirect: route.fullPath } })
    return
  }
  submitting.value = true
  try {
    await cart.add({ setmealId: setmeal.value.id }, 1)
    showToast({ type: 'success', message: '已加入购物车' })
    router.push('/cart')
  } catch (e) {
    showToast(e.message || '加入失败')
  } finally {
    submitting.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.setmeal-page {
  background: var(--bg);
  padding-bottom: 84px;
}

.hero {
  position: relative;
  height: 190px;
  background: linear-gradient(135deg, #ffe3c4, #ffbf86);
  overflow: hidden;
}

.hero img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.hero-fallback {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 46px;
  font-weight: 700;
}

.hero-mask {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(31, 35, 41, 0.55);
  color: #fff;
  font-size: 15px;
  letter-spacing: 2px;
}

.card {
  margin: 12px;
  background: #fff;
  border-radius: var(--radius-lg);
  padding: 14px;
  box-shadow: var(--shadow-sm);
}

.head-card {
  margin-top: -22px;
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.head-main {
  flex: 1;
  min-width: 0;
}

.head-main h1 {
  margin: 0;
  font-size: 19px;
  font-weight: 600;
}

.desc {
  margin: 6px 0 0;
  font-size: 12px;
  color: var(--ink-3);
  line-height: 1.6;
}

.head-price {
  flex: none;
  text-align: right;
}

.head-price .price {
  font-size: 22px;
}

.unit {
  display: block;
  font-size: 11px;
  color: var(--ink-3);
}

.card-title {
  margin: 0 0 10px;
  font-size: 14px;
  font-weight: 600;
}

.combo {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 0;
}

.combo + .combo {
  border-top: 1px solid var(--line);
}

.combo-thumb {
  width: 40px;
  height: 40px;
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

.combo-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.combo-main {
  flex: 1;
  min-width: 0;
}

.combo-name {
  font-size: 14px;
}

.combo-desc {
  font-size: 11px;
  color: var(--ink-3);
}

.copies {
  font-size: 13px;
  color: var(--ink-3);
}

.bar {
  padding-bottom: env(safe-area-inset-bottom);
}
</style>
