<template>
  <div class="page">
    <van-nav-bar title="菜品详情" left-arrow fixed placeholder @click-left="router.back()" />

    <van-loading v-if="loading" class="loading" vertical>加载中...</van-loading>
    <van-empty v-else-if="error" image="error" :description="error" />

    <template v-else-if="dish">
      <div class="cover">
        <img v-if="dish.image" :src="dish.image" :alt="dish.name" />
        <span v-else>{{ dish.name }}</span>
      </div>

      <van-cell-group inset class="block">
        <van-cell :title="dish.name" :label="dish.description || '暂无描述'">
          <template #value><span class="price">{{ money(dish.price) }}</span></template>
        </van-cell>
        <van-cell title="状态" :value="dish.status === 1 ? '在售' : '已停售'" />
      </van-cell-group>

      <van-cell-group v-if="flavorGroups.length" inset class="block">
        <van-cell v-for="g in flavorGroups" :key="g.name" :title="g.name">
          <template #value>
            <div class="flavor-tags">
              <van-tag
                v-for="v in g.values"
                :key="v"
                :type="picked[g.name] === v ? 'primary' : 'default'"
                size="medium"
                round
                @click="picked[g.name] = v"
              >{{ v }}</van-tag>
            </div>
          </template>
        </van-cell>
      </van-cell-group>

      <van-cell-group inset class="block">
        <van-cell title="数量">
          <template #value>
            <van-stepper v-model="number" :min="1" :max="99" integer />
          </template>
        </van-cell>
      </van-cell-group>

      <van-submit-bar
        :price="cents(dish.price) * number"
        button-text="加入购物车"
        :disabled="dish.status !== 1"
        :loading="submitting"
        @submit="onAdd"
      >
        <template #tip>金额由后端按商品现价计算，此处仅用于交互预览</template>
      </van-submit-bar>
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
    // 用户端没有“菜品详情”接口，改用列表接口按分类查（同分类下查找目标菜品）
    const list = (await catalogApi.dishes({})) || []
    const target = list.find((d) => String(d.id) === String(route.params.id))
    if (!target) {
      error.value = '菜品不存在或已停售'
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
.cover {
  height: 160px;
  background: linear-gradient(135deg, #ffe9c7, #ffd08a);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 26px;
  font-weight: 700;
}
.cover img { width: 100%; height: 100%; object-fit: cover; }
.block { margin-top: 12px; }
.flavor-tags { display: flex; flex-wrap: wrap; gap: 6px; justify-content: flex-end; }
.loading { padding: 40px 0; }
</style>
