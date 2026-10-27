<template>
  <el-container class="layout">
    <el-aside width="208px" class="aside">
      <div class="brand">
        <span class="dot"></span>
        <span>东华食堂 · 管理</span>
      </div>
      <el-menu :default-active="activeMenu" router class="menu" background-color="#1f2d3d" text-color="#bfcbd9" active-text-color="#ffd08a">
        <el-menu-item index="/dashboard"><el-icon><Odometer /></el-icon><span>工作台</span></el-menu-item>
        <el-menu-item index="/orders"><el-icon><List /></el-icon><span>订单管理</span></el-menu-item>
        <el-menu-item index="/categories"><el-icon><Menu /></el-icon><span>分类管理</span></el-menu-item>
        <el-menu-item index="/dishes"><el-icon><Dish /></el-icon><span>菜品管理</span></el-menu-item>
        <el-menu-item index="/setmeals"><el-icon><Box /></el-icon><span>套餐管理</span></el-menu-item>
        <el-menu-item index="/employees"><el-icon><User /></el-icon><span>员工管理</span></el-menu-item>
      </el-menu>
      <div class="aside-foot">课程项目 · 前端已接入组长真实后端</div>
    </el-aside>

    <el-container>
      <el-header class="header">
        <div class="header-title">{{ route.meta.title }}</div>
        <div class="header-right">
          <span class="shop-state">
            营业状态
            <el-switch
              :model-value="shopStatus === 1"
              :loading="shopLoading"
              size="small"
              inline-prompt
              active-text="营业"
              inactive-text="打烊"
              @change="toggleShop"
            />
          </span>
          <el-dropdown @command="onCommand">
            <span class="user">{{ auth.name }} <el-icon><ArrowDown /></el-icon></span>
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
    ElMessage.success(open ? '已开始营业' : '已打烊')
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
.layout { height: 100vh; }
.aside { background: #1f2d3d; display: flex; flex-direction: column; }
.brand {
  height: 56px; display: flex; align-items: center; gap: 8px; padding: 0 16px;
  color: #fff; font-weight: 600; border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}
.dot { width: 8px; height: 8px; border-radius: 50%; background: #f2a63b; }
.menu { border-right: none; flex: 1; }
.aside-foot { padding: 12px 16px; color: #6b7a8d; font-size: 12px; }
.header {
  height: 56px; background: #fff; display: flex; align-items: center;
  justify-content: space-between; border-bottom: 1px solid #ebeef5;
}
.header-title { font-size: 16px; font-weight: 600; }
.header-right { display: flex; align-items: center; gap: 16px; }
.shop-state { display: flex; align-items: center; gap: 8px; font-size: 13px; color: #606266; }
.user { display: flex; align-items: center; gap: 4px; cursor: pointer; color: #303133; }
.main { background: #f5f7fa; padding: 16px; }
</style>
