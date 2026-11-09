<template>
  <div class="login-page">
    <div class="panel">
      <aside class="side">
        <div class="logo">DHU</div>
        <h1>东华食堂</h1>
        <p class="side-sub">商家管理后台</p>
        <ul class="features">
          <li><el-icon><List /></el-icon>订单接单与派送</li>
          <li><el-icon><Dish /></el-icon>菜品与套餐维护</li>
          <li><el-icon><Odometer /></el-icon>营业额与经营数据</li>
        </ul>
        <p class="side-foot">松江校区 · 第一食堂</p>
      </aside>

      <section class="form-side">
        <h2>员工登录</h2>
        <p class="form-sub">请使用食堂员工账号登录后台</p>

        <el-form :model="form" :rules="rules" ref="formRef" size="large" @submit.prevent="onSubmit">
          <el-form-item prop="username">
            <el-input v-model="form.username" placeholder="员工账号" clearable :prefix-icon="User" />
          </el-form-item>
          <el-form-item prop="password">
            <el-input
              v-model="form.password"
              type="password"
              placeholder="登录密码"
              show-password
              :prefix-icon="Lock"
              @keyup.enter="onSubmit"
            />
          </el-form-item>
          <el-button type="primary" class="submit" :loading="loading" @click="onSubmit">登 录</el-button>
        </el-form>

        <p class="form-foot">登录即表示同意《后台使用规范》；账号异常请联系系统管理员</p>
      </section>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { User, Lock, List, Dish, Odometer } from '@element-plus/icons-vue'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()

const formRef = ref(null)
const loading = ref(false)
const form = reactive({ username: 'admin', password: '' })

const rules = {
  username: [{ required: true, message: '请输入员工账号', trigger: 'blur' }],
  password: [{ required: true, message: '请输入登录密码', trigger: 'blur' }]
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
    ElMessage.error(e.message || '账号或密码不正确')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-page {
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: radial-gradient(circle at 20% 10%, #2a3a4d 0%, #151d27 55%, #0f151d 100%);
}

.panel {
  display: flex;
  width: 820px;
  min-height: 440px;
  border-radius: 18px;
  overflow: hidden;
  background: #fff;
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.35);
}

.side {
  width: 330px;
  padding: 34px 30px;
  color: #fff;
  background: linear-gradient(155deg, #ff9a4d 0%, #ff7a2f 50%, #ef5f16 100%);
  display: flex;
  flex-direction: column;
}

.logo {
  width: 42px;
  height: 42px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.22);
  border: 1px solid rgba(255, 255, 255, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 1px;
}

.side h1 {
  margin: 18px 0 2px;
  font-size: 22px;
  font-weight: 600;
  letter-spacing: 1px;
}

.side-sub {
  margin: 0;
  font-size: 13px;
  opacity: 0.86;
}

.features {
  list-style: none;
  margin: 26px 0 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
  font-size: 13px;
  opacity: 0.95;
}

.features li {
  display: flex;
  align-items: center;
  gap: 8px;
}

.side-foot {
  margin-top: auto;
  font-size: 11px;
  opacity: 0.75;
  letter-spacing: 1px;
}

.form-side {
  flex: 1;
  padding: 46px 44px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.form-side h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
}

.form-sub {
  margin: 6px 0 24px;
  font-size: 12px;
  color: #8a9199;
}

.submit {
  width: 100%;
  margin-top: 6px;
  height: 42px;
  font-weight: 600;
  letter-spacing: 2px;
}

.form-foot {
  margin: 18px 0 0;
  font-size: 11px;
  color: #a3aab3;
  line-height: 1.6;
}

@media (max-width: 860px) {
  .panel { width: 92vw; }
  .side { display: none; }
  .form-side { padding: 36px 28px; }
}
</style>
