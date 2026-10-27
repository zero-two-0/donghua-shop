<template>
  <div class="page home">
    <van-nav-bar :title="shopOpen ? '东华食堂' : '东华食堂（休息中）'" fixed placeholder />

    <van-notice-bar
      v-if="shopStatus === 0"
      left-icon="info-o"
      wrapable
      :scrollable="false"
      text="当前店铺已打烊，可浏览菜品但无法下单；请管理员在管理端切换营业状态。"
    />

    <van-search v-model="keyword" shape="round" placeholder="搜索菜品，如：宫保" @search="loadDishes" @clear="loadDishes" />

    <van-loading v-if="loading" class="loading" vertical>加载中...</van-loading>
    <van-empty v-else-if="error" image="error" :description="error">
      <van-button round type="primary" size="small" @click="init">重新加载</van-button>
    </van-empty>

    <div v-else class="body">
      <van-sidebar v-model="active" class="cats">
        <van-sidebar-item v-for="c in categories" :key="c.id" :title="c.name" />
      </van-sidebar>

      <div class="list">
        <van-empty v-if="!currentList.length" description="该分类下暂无在售商品" />

        <div v-for="d in currentList" :key="d.id" class="dish-row" @click="openDetail(d)">
          <div class="thumb">
            <img v-if="d.image" :src="d.image" :alt="d.name" />
            <span v-else>{{ d.name.slice(0, 1) }}</span>
          </div>
          <div class="info">
            <div class="name">{{ d.name }}</div>
            <div class="desc muted">{{ d.description }}</div>
            <div v-if="isSetmealCategory" class="muted">套餐价，含固定搭配</div>
            <div v-else-if="flavorHint(d)" class="muted">{{ flavorHint(d) }}</div>
            <div class="row-bottom">
              <span class="price">{{ money(d.price) }}</span>
              <van-button
                size="mini"
                type="primary"
                round
                :disabled="!shopOpen"
                :loading="addingId === d.id"
                @click.stop="quickAdd(d)"
              >加入购物车</van-button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { showToast } from 'vant'
import { catalogApi } from '../api/user'
import { useAuthStore } from '../stores/auth'
import { useCartStore } from '../stores/cart'
import { money, parseFlavorValues } from '../utils/format'

const router = useRouter()
const auth = useAuthStore()
const cart = useCartStore()

const categories = ref([])
const dishes = ref([])
const setmeals = ref([])
const active = ref(0)
const keyword = ref('')
const loading = ref(true)
const error = ref('')
const shopStatus = ref(1)
const addingId = ref(0)

const shopOpen = computed(() => shopStatus.value === 1)
const currentCategory = computed(() => categories.value[active.value] || null)
const isSetmealCategory = computed(() => (currentCategory.value || {}).type === 2)
const currentList = computed(() => (isSetmealCategory.value ? setmeals.value : dishes.value))

function flavorHint(dish) {
  const groups = (dish.flavors || []).map((f) => `${f.name}：${parseFlavorValues(f.value).join('/')}`)
  return groups.length ? groups.join('　') : ''
}

async function init() {
  loading.value = true
  error.value = ''
  try {
    const [dishCats, setmealCats, status] = await Promise.all([
      catalogApi.categories(1).catch(() => []),
      catalogApi.categories(2).catch(() => []),
      catalogApi.shopStatus().catch(() => 1)
    ])
    categories.value = [...(dishCats || []), ...(setmealCats || [])]
    shopStatus.value = Number(status) === 0 ? 0 : 1
    await loadCurrent()
  } catch (e) {
    error.value = e.message || '加载失败'
  } finally {
    loading.value = false
  }
}

async function loadCurrent() {
  const cat = currentCategory.value
  if (!cat) return
  try {
    if (cat.type === 2) {
      setmeals.value = (await catalogApi.setmeals({ categoryId: cat.id })) || []
    } else {
      dishes.value = (await catalogApi.dishes({ categoryId: cat.id, keyword: keyword.value || undefined })) || []
    }
  } catch (e) {
    showToast(e.message || '加载失败')
  }
}

async function loadDishes() {
  // 关键词搜索跨分类：清空分类条件重新查询
  if (!keyword.value) return loadCurrent()
  try {
    const list = await catalogApi.dishes({ keyword: keyword.value })
    dishes.value = list || []
    if (currentCategory.value && currentCategory.value.type === 2) active.value = 0
  } catch (e) {
    showToast(e.message || '搜索失败')
  }
}

watch(active, () => loadCurrent())

function openDetail(item) {
  const cat = currentCategory.value
  router.push(cat && cat.type === 2 ? `/setmeal/${item.id}` : `/dish/${item.id}`)
}

async function quickAdd(item) {
  if (!auth.isLogin) {
    showToast('请先登录')
    router.push({ path: '/login', query: { redirect: '/home' } })
    return
  }
  if (!shopOpen.value) {
    showToast('店铺已打烊')
    return
  }
  addingId.value = item.id
  try {
    const payload = isSetmealCategory.value ? { setmealId: item.id } : { dishId: item.id }
    await cart.add(payload, 1)
    showToast({ type: 'success', message: `已加入：${item.name}` })
  } catch (e) {
    showToast(e.message || '加入购物车失败')
  } finally {
    addingId.value = 0
  }
}

onMounted(init)
</script>

<style scoped>
.home { background: #fff; }
.loading { padding: 48px 0; }
.body { display: flex; align-items: flex-start; }
.cats { width: 96px; flex: none; }
.list { flex: 1; padding: 0 12px 12px 0; }
.dish-row {
  display: flex;
  gap: 10px;
  padding: 12px 0;
  border-bottom: 1px solid #f2f3f5;
  cursor: pointer;
}
.thumb {
  width: 84px;
  height: 84px;
  flex: none;
  border-radius: 8px;
  overflow: hidden;
  background: linear-gradient(135deg, #ffe9c7, #ffd08a);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 24px;
  font-weight: 700;
}
.thumb img { width: 100%; height: 100%; object-fit: cover; }
.info { flex: 1; min-width: 0; }
.name { font-size: 15px; font-weight: 600; }
.desc { margin-top: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.row-bottom { display: flex; align-items: center; justify-content: space-between; margin-top: 6px; }
</style>
