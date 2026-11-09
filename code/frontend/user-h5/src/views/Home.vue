<template>
  <div class="page home">
    <header class="brand-bar">
      <div class="brand-row">
        <div class="logo">DHU</div>
        <div class="brand-text">
          <h1>东华食堂</h1>
          <p>松江校区 · 第一食堂</p>
        </div>
        <span :class="['status', { off: !shopOpen }]">
          <i class="dot"></i>{{ shopOpen ? '营业中' : '休息中' }}
        </span>
      </div>
      <van-search
        v-model="keyword"
        shape="round"
        background="transparent"
        placeholder="搜索菜品或套餐"
        @search="loadDishes"
        @clear="loadDishes"
      />
    </header>

    <van-notice-bar
      v-if="shopStatus === 0"
      left-icon="info-o"
      wrapable
      :scrollable="false"
      text="食堂已结束今日营业，可浏览菜单，明早 07:00 恢复供应。"
    />

    <div v-if="loading" class="skeleton-wrap">
      <van-skeleton title avatar :row="3" />
      <van-skeleton title avatar :row="3" style="margin-top: 20px" />
      <van-skeleton title avatar :row="3" style="margin-top: 20px" />
    </div>

    <van-empty v-else-if="error" image="error" :description="error">
      <van-button round type="primary" size="small" @click="init">重新加载</van-button>
    </van-empty>

    <div v-else class="body">
      <van-sidebar v-model="active" class="cats">
        <van-sidebar-item v-for="c in categories" :key="c.id" :title="c.name" />
      </van-sidebar>

      <div class="list">
        <div class="list-head">
          <span class="list-title">{{ (currentCategory || {}).name || '全部' }}</span>
          <span class="muted">{{ currentList.length }} 款</span>
        </div>

        <van-empty v-if="!currentList.length" image="search" description="这个分类还没有上新" />

        <article
          v-for="d in currentList"
          :key="d.id"
          class="dish-card"
          @click="openDetail(d)"
        >
          <div class="thumb">
            <img v-if="d.image" :src="d.image" :alt="d.name" loading="lazy" />
            <span v-else>{{ d.name.slice(0, 1) }}</span>
          </div>

          <div class="info">
            <div class="name">{{ d.name }}</div>
            <div class="desc">{{ d.description || '食堂当日现做' }}</div>
            <div v-if="isSetmealCategory" class="meta">套餐 · 含固定搭配</div>
            <div v-else-if="flavorHint(d)" class="meta ellipsis">{{ flavorHint(d) }}</div>

            <div class="row-bottom">
              <span class="price">{{ money(d.price) }}</span>
              <button
                class="add-btn"
                type="button"
                :disabled="!shopOpen || addingId === d.id"
                :aria-label="`加入购物车：${d.name}`"
                @click.stop="quickAdd(d)"
              >
                <van-loading v-if="addingId === d.id" size="14" color="#fff" />
                <van-icon v-else name="plus" />
              </button>
            </div>
          </div>
        </article>
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
    showToast('食堂休息中，暂不接单')
    return
  }
  addingId.value = item.id
  try {
    const payload = isSetmealCategory.value ? { setmealId: item.id } : { dishId: item.id }
    await cart.add(payload, 1)
    showToast({ type: 'success', message: '已加入购物车' })
  } catch (e) {
    showToast(e.message || '加入购物车失败')
  } finally {
    addingId.value = 0
  }
}

onMounted(init)
</script>

<style scoped>
.home {
  background: var(--bg);
}

.brand-bar {
  position: sticky;
  top: 0;
  z-index: 20;
  padding: 14px 14px 4px;
  background: linear-gradient(180deg, #fff4ec 0%, #fffaf5 100%);
  backdrop-filter: blur(8px);
}

.brand-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.logo {
  width: 38px;
  height: 38px;
  border-radius: 12px;
  background: linear-gradient(140deg, #ffa65c, #ff7a2f);
  color: #fff;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.5px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(255, 122, 47, 0.28);
}

.brand-text {
  flex: 1;
  min-width: 0;
}

.brand-text h1 {
  margin: 0;
  font-size: 17px;
  font-weight: 600;
  letter-spacing: 0.3px;
}

.brand-text p {
  margin: 2px 0 0;
  font-size: 11px;
  color: var(--ink-3);
}

.status {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 9px;
  border-radius: 999px;
  background: #eaf9ef;
  color: #12a150;
  font-size: 11px;
  font-weight: 500;
  white-space: nowrap;
}

.status.off {
  background: #f2f3f5;
  color: #86909c;
}

.dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
}

.body {
  display: flex;
  align-items: flex-start;
  padding-top: 4px;
}

.cats {
  width: 88px;
  flex: none;
  padding: 4px 0;
  background: transparent;
}

.cats :deep(.van-sidebar-item) {
  background: transparent;
  border-radius: 0 12px 12px 0;
  font-size: 13px;
  padding: 14px 8px;
  color: var(--ink-2);
}

.cats :deep(.van-sidebar-item--select) {
  background: #fff;
  color: var(--ink-1);
  font-weight: 600;
}

.cats :deep(.van-sidebar-item--select::before) {
  width: 3px;
  height: 16px;
  border-radius: 2px;
  background: var(--brand);
}

.list {
  flex: 1;
  min-width: 0;
  padding: 0 12px 16px 6px;
}

.list-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  padding: 8px 2px 6px;
}

.list-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--ink-1);
}

.dish-card {
  display: flex;
  gap: 10px;
  padding: 10px;
  margin-bottom: 10px;
  background: #fff;
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
  transition: transform 0.12s ease, box-shadow 0.15s ease;
  cursor: pointer;
}

.dish-card:active {
  transform: scale(0.994);
  box-shadow: var(--shadow-md);
}

.thumb {
  width: 78px;
  height: 78px;
  flex: none;
  border-radius: 10px;
  overflow: hidden;
  background: linear-gradient(135deg, #ffe3c4, #ffbf86);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 22px;
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
  color: var(--ink-1);
}

.desc {
  margin-top: 2px;
  font-size: 12px;
  color: var(--ink-3);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.meta {
  margin-top: 2px;
  font-size: 11px;
  color: #b0874f;
}

.ellipsis {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.row-bottom {
  margin-top: auto;
  padding-top: 6px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
}

.price {
  font-size: 17px;
}

.add-btn {
  width: 28px;
  height: 28px;
  flex: none;
  border: none;
  border-radius: 50%;
  background: var(--brand);
  color: #fff;
  font-size: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 3px 8px rgba(255, 122, 47, 0.32);
  transition: transform 0.12s ease, opacity 0.15s ease;
}

.add-btn:active {
  transform: scale(0.92);
}

.add-btn:disabled {
  background: #d8dbe0;
  box-shadow: none;
}

/* 320px 窄屏 */
@media (max-width: 360px) {
  .cats {
    width: 74px;
    --van-sidebar-font-size: 12px;
    --van-sidebar-padding: 12px 6px;
  }

  .thumb {
    width: 60px;
    height: 60px;
    font-size: 18px;
  }

  .name {
    font-size: 14px;
  }

  .desc {
    font-size: 11px;
  }

  .price {
    font-size: 15px;
  }
}
</style>
