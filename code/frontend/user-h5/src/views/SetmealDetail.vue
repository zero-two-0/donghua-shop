<template>
  <div class="page">
    <van-nav-bar title="套餐详情" left-arrow fixed placeholder @click-left="router.back()" />

    <van-loading v-if="loading" class="loading" vertical>加载中...</van-loading>
    <van-empty v-else-if="error" image="error" :description="error" />

    <template v-else-if="setmeal">
      <div class="cover">
        <img v-if="setmeal.image" :src="setmeal.image" :alt="setmeal.name" />
        <span v-else>{{ setmeal.name }}</span>
      </div>

      <van-cell-group inset class="block">
        <van-cell :title="setmeal.name" :label="setmeal.description || '暂无描述'">
          <template #value><span class="price">{{ money(setmeal.price) }}</span></template>
        </van-cell>
        <van-cell title="状态" :value="setmeal.status === 1 ? '在售' : '已停售'" />
      </van-cell-group>

      <van-cell-group inset class="block">
        <van-cell title="套餐组成" />
        <van-cell v-for="(item, idx) in items" :key="idx" :title="item.name" :label="item.description || ''">
          <template #value><span class="muted">×{{ item.copies }}</span></template>
        </van-cell>
        <van-empty v-if="!items.length" description="暂未查询到套餐组成" />
      </van-cell-group>

      <van-submit-bar
        :price="cents(setmeal.price)"
        button-text="加入购物车"
        :disabled="setmeal.status !== 1"
        :loading="submitting"
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
      error.value = '套餐不存在或已停售'
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
.loading { padding: 40px 0; }
</style>
