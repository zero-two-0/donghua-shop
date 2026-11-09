<template>
  <div class="page dish-page">
    <van-nav-bar title="菜品详情" left-arrow fixed placeholder @click-left="router.back()" />

    <van-skeleton v-if="loading" title :row="5" class="skeleton-wrap" style="padding-top: 16px" />
    <van-empty v-else-if="error" image="error" :description="error" />

    <template v-else-if="dish">
      <div class="hero">
        <img v-if="dish.image" :src="dish.image" :alt="dish.name" />
        <div v-else class="hero-fallback">{{ dish.name.slice(0, 1) }}</div>
        <div v-if="dish.status !== 1" class="hero-mask">今日已售完</div>
      </div>

      <section class="card head-card">
        <div class="head-main">
          <h1>{{ dish.name }}</h1>
          <p class="desc">{{ dish.description || '食堂当日现做，配料以门店为准' }}</p>
        </div>
        <div class="head-price">
          <span class="price">{{ money(dish.price) }}</span>
          <span class="unit">/ 份</span>
        </div>
      </section>

      <section v-if="flavorGroups.length" class="card">
        <h2 class="card-title">选择口味</h2>
        <div v-for="g in flavorGroups" :key="g.name" class="flavor-group">
          <div class="flavor-label">{{ g.name }}</div>
          <div class="chips">
            <button
              v-for="v in g.values"
              :key="v"
              type="button"
              :class="['chip', { on: picked[g.name] === v }]"
              @click="picked[g.name] = v"
            >{{ v }}</button>
          </div>
        </div>
      </section>

      <section class="card">
        <div class="qty-row">
          <span class="qty-label">数量</span>
          <van-stepper v-model="number" :min="1" :max="99" integer button-size="26" />
        </div>
      </section>

      <van-submit-bar
        :price="cents(dish.price) * number"
        :button-text="dish.status === 1 ? '加入购物车' : '今日已售完'"
        :disabled="dish.status !== 1"
        :loading="submitting"
        class="bar"
        @submit="onAdd"
      />
    </template>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showToast } from 'vant'
import { catalogApi } from '../api/user'
import { useAuthStore } from '../stores/auth'
import { useCartStore } from '../stores/cart'
import { cents, money, parseFlavorValues } from '../utils/format'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const cart = useCartStore()

const dish = ref(null)
const loading = ref(true)
const error = ref('')
const number = ref(1)
const submitting = ref(false)
const picked = reactive({})

const flavorGroups = computed(() => {
  if (!dish.value || !dish.value.flavors) return []
  return dish.value.flavors.map((f) => ({ name: f.name, values: parseFlavorValues(f.value) }))
})

async function load() {
  loading.value = true
  error.value = ''
  try {
    // 用户端没有“菜品详情”接口，改用列表接口查（已在缺陷记录 F-04 中登记）
    const list = (await catalogApi.dishes({})) || []
    const target = list.find((d) => String(d.id) === String(route.params.id))
    if (!target) {
      error.value = '菜品不存在或已下架'
      return
    }
    dish.value = target
    flavorGroups.value.forEach((g) => { picked[g.name] = g.values[0] || '' })
  } catch (e) {
    error.value = e.message || '加载失败'
  } finally {
    loading.value = false
  }
}

function flavorText() {
  const parts = Object.entries(picked).filter(([, v]) => v)
  return parts.map(([k, v]) => `${k}:${v}`).join(',')
}

async function onAdd() {
  if (!auth.isLogin) {
    router.push({ path: '/login', query: { redirect: route.fullPath } })
    return
  }
  submitting.value = true
  try {
    await cart.add({ dishId: dish.value.id, dishFlavor: flavorText() }, number.value)
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
.dish-page {
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
  letter-spacing: 0.3px;
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

.flavor-group + .flavor-group {
  margin-top: 12px;
}

.flavor-label {
  font-size: 12px;
  color: var(--ink-3);
  margin-bottom: 8px;
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.chip {
  padding: 7px 14px;
  border-radius: 999px;
  border: 1px solid var(--line);
  background: #f7f8fa;
  color: var(--ink-2);
  font-size: 13px;
  transition: all 0.15s ease;
}

.chip.on {
  border-color: var(--brand);
  background: var(--brand-soft);
  color: var(--brand-dark);
  font-weight: 600;
}

.qty-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.qty-label {
  font-size: 14px;
}

.bar {
  padding-bottom: env(safe-area-inset-bottom);
}
</style>
