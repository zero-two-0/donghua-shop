<template>
  <div class="page-card">
    <div class="page-head">
      <h2>员工管理</h2>
      <el-button type="primary" @click="openCreate">新增员工</el-button>
    </div>

    <div class="toolbar">
      <el-input v-model="query.name" placeholder="姓名" clearable style="width: 180px" @keyup.enter="reload" />
      <el-button type="primary" plain @click="reload">查询</el-button>
    </div>

    <el-table :data="rows" border v-loading="loading">
      <el-table-column prop="id" label="ID" width="80" />
      <el-table-column prop="username" label="账号" width="150" />
      <el-table-column prop="name" label="姓名" width="120" />
      <el-table-column prop="phone" label="手机号" width="140" />
      <el-table-column label="性别" width="80">
        <template #default="{ row }">{{ row.sex === '1' ? '男' : (row.sex === '2' ? '女' : '-') }}</template>
      </el-table-column>
      <el-table-column prop="idNumber" label="证件号" min-width="180" />
      <el-table-column label="状态" width="130">
        <template #default="{ row }">
          <el-switch
            :model-value="row.status === 1"
            :loading="statusLoading === row.id"
            @change="(v) => toggleStatus(row, v)"
          />
          <span class="muted" style="margin-left: 6px">{{ row.status === 1 ? '启用' : '禁用' }}</span>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="120">
        <template #default="{ row }">
          <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-pagination
      class="pager"
      layout="total, prev, pager, next"
      :total="total"
      :page-size="query.pageSize"
      :current-page="query.page"
      @current-change="onPage"
    />

    <el-dialog v-model="dialog" :title="form.id ? '编辑员工' : '新增员工'" width="480px">
      <el-form :model="form" :rules="rules" ref="formRef" label-width="88px">
        <el-form-item label="账号" prop="username">
          <el-input v-model="form.username" :disabled="!!form.id" maxlength="32" />
        </el-form-item>
        <el-form-item v-if="!form.id" label="密码" prop="password">
          <el-input v-model="form.password" type="password" show-password placeholder="至少 8 位" />
        </el-form-item>
        <el-form-item label="姓名" prop="name">
          <el-input v-model="form.name" maxlength="32" />
        </el-form-item>
        <el-form-item label="手机号">
          <el-input v-model="form.phone" maxlength="11" />
        </el-form-item>
        <el-form-item label="性别">
          <el-radio-group v-model="form.sex">
            <el-radio value="1">男</el-radio>
            <el-radio value="2">女</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="证件号">
          <el-input v-model="form.idNumber" maxlength="18" />
        </el-form-item>
        <el-alert
          type="info"
          :closable="false"
          show-icon
          title="口令由后端 PBKDF2 加盐保存"
          description="响应不会返回密码字段；编辑时不修改密码，改密需后端提供独立接口（当前契约未包含）。"
        />
      </el-form>
      <template #footer>
        <el-button @click="dialog = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="onSave">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { employeeApi } from '../api/admin'

const rows = ref([])
const total = ref(0)
const loading = ref(false)
const saving = ref(false)
const statusLoading = ref(0)
const dialog = ref(false)
const formRef = ref(null)

const query = reactive({ name: '', page: 1, pageSize: 10 })
const form = reactive({ id: null, username: '', password: '', name: '', phone: '', sex: '1', idNumber: '' })

const rules = {
  username: [{ required: true, message: '请输入账号', trigger: 'blur' }],
  password: [{ required: true, min: 8, message: '密码至少 8 位', trigger: 'blur' }],
  name: [{ required: true, message: '请输入姓名', trigger: 'blur' }]
}

async function load() {
  loading.value = true
  try {
    const page = await employeeApi.page({ page: query.page, pageSize: query.pageSize, name: query.name || undefined })
    rows.value = (page && page.records) || []
    total.value = (page && page.total) || 0
  } catch (e) {
    ElMessage.error(e.message || '加载失败')
  } finally {
    loading.value = false
  }
}

function reload() { query.page = 1; load() }
function onPage(p) { query.page = p; load() }

function openCreate() {
  Object.assign(form, { id: null, username: '', password: '', name: '', phone: '', sex: '1', idNumber: '' })
  dialog.value = true
}

async function openEdit(row) {
  try {
    const detail = await employeeApi.detail(row.id)
    Object.assign(form, { ...detail, password: '' })
    dialog.value = true
  } catch (e) {
    ElMessage.error(e.message || '详情加载失败')
  }
}

async function onSave() {
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return
  saving.value = true
  try {
    if (form.id) {
      const { id, username, name, phone, sex, idNumber } = form
      await employeeApi.update({ id, username, name, phone, sex, idNumber })
    } else {
      const { username, password, name, phone, sex, idNumber } = form
      await employeeApi.create({ username, password, name, phone, sex, idNumber })
    }
    ElMessage.success('保存成功')
    dialog.value = false
    await load()
  } catch (e) {
    ElMessage.error(e.message || '保存失败')
  } finally {
    saving.value = false
  }
}

async function toggleStatus(row, checked) {
  statusLoading.value = row.id
  try {
    await employeeApi.changeStatus(checked ? 1 : 0, row.id)
    ElMessage.success(checked ? '已启用' : '已禁用')
    await load()
  } catch (e) {
    ElMessage.error(e.message || '状态变更失败')
  } finally {
    statusLoading.value = 0
  }
}

onMounted(load)
</script>

<style scoped>
.pager { margin-top: 12px; justify-content: flex-end; }
</style>
