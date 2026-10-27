<template>
  <div class="login-page">
    <div class="card">
      <div class="brand">
        <div class="logo">DHU</div>
        <div>
          <h1>东华食堂 · 商家管理端</h1>
          <p class="muted">员工登录（账号由后端 COURSE_ADMIN_PASSWORD 初始化，口令不写入仓库）</p>
        </div>
      </div>

      <el-form :model="form" :rules="rules" ref="formRef" label-width="72px" @submit.prevent="onSubmit">
        <el-form-item label="账号" prop="username">
          <el-input v-model="form.username" placeholder="请输入员工账号" size="large" clearable />
        </el-form-item>
        <el-form-item label="密码" prop="password">
          <el-input v-model="form.password" type="password" placeholder="请输入密码" size="large" show-password @keyup.enter="onSubmit" />
        </el-form-item>
        <el-button type="primary" size="large" class="submit" :loading="loading" @click="onSubmit">登录</el-button>
      </el-form>

      <el-alert
        class="alert"
        type="info"
        :closable="false"
        show-icon
        title="接口说明"
        description="POST /admin/employee/login 返回 data.token；后续请求使用 Authorization: Bearer <token>。用户令牌不能访问管理端接口。"
      />
    </div>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()

const formRef = ref(null)
const loading = ref(false)
const form = reactive({ username: 'admin', password: '' })

const rules = {
  username: [{ required: true, message: '请输入账号', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }]
}

async function onSubmit() {
  if (formRef.value) {
    const valid = await formRef.value.validate().catch(() => false)
    if (!valid) return
  }
  loading.value = true
  try {
    await auth.login(form.username, form.password)
    ElMessage.success('登录成功')
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/dashboard'
    router.replace(redirect)
  } catch (e) {
    ElMessage.error(e.message || '登录失败')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-page {
  height: 100vh;
  display: flex; align-items: center; justify-content: center;
  background: linear-gradient(150deg, #1f2d3d, #334b66);
}
.card {
  width: 440px; background: #fff; border-radius: 12px; padding: 28px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.25);
}
.brand { display: flex; gap: 12px; align-items: center; margin-bottom: 20px; }
.logo {
  width: 44px; height: 44px; border-radius: 10px;
  background: linear-gradient(135deg, #f2a63b, #ee7a24); color: #fff;
  display: flex; align-items: center; justify-content: center; font-weight: 700;
}
h1 { font-size: 17px; margin: 0 0 4px; }
.muted { color: #909399; font-size: 12px; margin: 0; }
.submit { width: 100%; margin-top: 4px; }
.alert { margin-top: 18px; }
</style>
