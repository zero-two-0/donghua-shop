<template>
  <el-container class="layout">
    <el-aside width="212px" class="aside">
      <div class="brand">
        <div class="logo">DHU</div>
        <div class="brand-text">
          <b>东华食堂</b>
          <span>管理后台</span>
        </div>
      </div>

      <el-menu :default-active="activeMenu" router class="menu">
        <el-menu-item index="/dashboard">
          <el-icon><Odometer /></el-icon><span>工作台</span>
        </el-menu-item>
        <el-menu-item index="/orders">
          <el-icon><List /></el-icon><span>订单管理</span>
        </el-menu-item>
        <el-menu-item index="/categories">
          <el-icon><Menu /></el-icon><span>分类管理</span>
        </el-menu-item>
        <el-menu-item index="/dishes">
          <el-icon><Dish /></el-icon><span>菜品管理</span>
        </el-menu-item>
        <el-menu-item index="/setmeals">
          <el-icon><Box /></el-icon><span>套餐管理</span>
        </el-menu-item>
        <el-menu-item index="/employees">
          <el-icon><User /></el-icon><span>员工管理</span>
        </el-menu-item>
      </el-menu>

      <div class="aside-foot">v1.2.0 · 松江校区</div>
    </el-aside>

    <el-container>
      <el-header class="header">
        <div class="header-left">
          <div class="header-title">{{ route.meta.title }}</div>
          <div class="header-sub">{{ subtitle }}</div>
        </div>
        <div class="header-right">
          <div :class="['shop-pill', { off: shopStatus !== 1 }]">
            <span class="pill-dot"></span>
            <span class="pill-text">{{ shopStatus === 1 ? '营业中' : '已打烊' }}</span>
            <el-switch
              :model-value="shopStatus === 1"
              :loading="shopLoading"
              size="small"
              @change="toggleShop"
            />
          </div>
          <el-dropdown @command="onCommand">
            <span class="user">
              <span class="avatar">{{ (auth.name || '管').slice(0, 1) }}</span>
              <span class="user-name">{{ auth.name }}</span>
              <el-icon><ArrowDown /></el-icon>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="logout">退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>

      <el-main class="main">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '../stores/auth'
import { shopApi } from '../api/admin'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const shopStatus = ref(1)
const shopLoading = ref(false)
const activeMenu = computed(() => `/${route.path.split('/')[1]}`)

const subtitle = computed(() => {
  const map = {
    '/dashboard': '今日经营概览与待处理事项',
    '/orders': '接单、派送与订单状态跟踪',
    '/categories': '菜品与套餐的分类维护',
    '/dishes': '在售菜品、价格与口味配置',
    '/setmeals': '套餐组合与上架管理',
    '/employees': '员工账号与权限'
  }
  return map[activeMenu.value] || ''
})

async function loadShopStatus() {
  try {
    shopStatus.value = Number(await shopApi.status()) === 0 ? 0 : 1
  } catch (e) {
    shopStatus.value = 1
  }
}

async function toggleShop(open) {
  shopLoading.value = true
  try {
    await shopApi.setStatus(open ? 1 : 0)
    shopStatus.value = open ? 1 : 0
    ElMessage.success(open ? '已开始营业' : '已打烊，用户端将停止下单')
  } catch (e) {
    ElMessage.error(e.message || '切换失败')
    await loadShopStatus()
  } finally {
    shopLoading.value = false
  }
}

async function onCommand(cmd) {
  if (cmd === 'logout') {
    await auth.logout()
    ElMessage.success('已退出登录')
    router.replace('/login')
  }
}

onMounted(() => {
  if (auth.isLogin) loadShopStatus()
})
</script>

<style scoped>
.layout {
  height: 100vh;
  background: #f5f6f8;
}

.aside {
  background: linear-gradient(180deg, #1b2431 0%, #232f3e 100%);
  display: flex;
  flex-direction: column;
}

.brand {
  height: 64px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 18px;
}

.logo {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  background: linear-gradient(140deg, #ffa65c, #ff7a2f);
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  letter-spacing: 0.5px;
}

.brand-text {
  display: flex;
  flex-direction: column;
  line-height: 1.25;
}

.brand-text b {
  color: #fff;
  font-size: 15px;
  font-weight: 600;
  letter-spacing: 0.3px;
}

.brand-text span {
  color: #7d8797;
  font-size: 11px;
}

.menu {
  border-right: none;
  background: transparent;
  flex: 1;
  padding: 6px 10px;
}

.menu :deep(.el-menu-item) {
  height: 44px;
  margin-bottom: 2px;
  border-radius: 10px;
  color: #a9b3c1;
  font-size: 14px;
}

.menu :deep(.el-menu-item:hover) {
  background: rgba(255, 255, 255, 0.06);
  color: #e8ecf1;
}

.menu :deep(.el-menu-item.is-active) {
  background: rgba(255, 122, 47, 0.16);
  color: #ffb27a;
  font-weight: 600;
}

.menu :deep(.el-menu-item.is-active::before) {
  content: '';
  position: absolute;
  left: 0;
  top: 12px;
  width: 3px;
  height: 20px;
  border-radius: 2px;
  background: #ff7a2f;
}

.aside-foot {
  padding: 14px 18px 18px;
  color: #5f6b7a;
  font-size: 11px;
  letter-spacing: 0.3px;
}

.header {
  height: 64px;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  border-bottom: 1px solid #eef0f3;
}

.header-left {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.header-title {
  font-size: 16px;
  font-weight: 600;
  color: #1f2329;
}

.header-sub {
  font-size: 12px;
  color: #97a0ab;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 18px;
}

.shop-pill {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 10px 5px 12px;
  border-radius: 999px;
  background: #eefaf1;
  color: #12a150;
  font-size: 12px;
}

.shop-pill.off {
  background: #f3f4f6;
  color: #8a9199;
}

.pill-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
}

.pill-text {
  font-weight: 500;
}

.user {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  color: #1f2329;
  font-size: 13px;
}

.avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #fff1e6;
  color: #e8631a;
  font-size: 12px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
}

.main {
  background: #f5f6f8;
  padding: 18px 20px 24px;
  overflow-y: auto;
}
</style>
