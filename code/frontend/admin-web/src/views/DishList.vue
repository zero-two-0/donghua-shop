<template>
  <div class="page-card">
    <div class="page-head">
      <h2>菜品管理</h2>
      <el-button type="primary" @click="openCreate">新增菜品</el-button>
    </div>

    <div class="toolbar">
      <el-input v-model="query.name" placeholder="菜品名称" clearable style="width: 160px" @keyup.enter="reload" />
      <el-select v-model="query.categoryId" placeholder="全部分类" clearable style="width: 160px" @change="reload">
        <el-option v-for="c in categories" :key="c.id" :label="c.name" :value="c.id" />
      </el-select>
      <el-select v-model="query.status" placeholder="全部状态" clearable style="width: 130px" @change="reload">
        <el-option label="起售" :value="1" />
        <el-option label="停售" :value="0" />
      </el-select>
      <el-button type="primary" plain @click="reload">查询</el-button>
    </div>

    <el-table :data="rows" border v-loading="loading">
      <el-table-column prop="name" label="菜品名称" min-width="150" />
      <el-table-column prop="categoryName" label="分类" width="120" />
      <el-table-column label="价格" width="100">
        <template #default="{ row }"><span class="price">¥{{ moneyText(row.price) }}</span></template>
      </el-table-column>
      <el-table-column label="口味" width="160">
        <template #default="{ row }">
          <span class="muted">{{ flavorText(row.flavors) || '无' }}</span>
        </template>
      </el-table-column>
      <el-table-column prop="description" label="描述" min-width="150" show-overflow-tooltip />
      <el-table-column label="状态" width="120">
        <template #default="{ row }">
          <el-switch
            :model-value="row.status === 1"
            :loading="statusLoading === row.id"
            @change="(v) => toggleStatus(row, v)"
          />
          <span class="muted" style="margin-left: 6px">{{ row.status === 1 ? '起售' : '停售' }}</span>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="140" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
          <el-button link type="danger" @click="onDelete(row)">删除</el-button>
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

    <el-dialog v-model="dialog" :title="form.id ? '编辑菜品' : '新增菜品'" width="560px">
      <el-form :model="form" :rules="rules" ref="formRef" label-width="92px">
        <el-form-item label="菜品名称" prop="name">
          <el-input v-model="form.name" maxlength="40" show-word-limit />
        </el-form-item>
        <el-form-item label="所属分类" prop="categoryId">
          <el-select v-model="form.categoryId" placeholder="请选择菜品分类" style="width: 100%">
            <el-option v-for="c in categories" :key="c.id" :label="c.name" :value="c.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="价格（元）" prop="price">
          <el-input-number v-model="form.price" :min="0.01" :max="9999" :precision="2" :step="1" />
        </el-form-item>
        <el-form-item label="图片 URL" prop="image">
          <el-input v-model="form.image" placeholder="必填；课程内可用后端静态资源，如 /assets/dish-1.svg" />
        </el-form-item>
        <el-form-item label="描述" prop="description">
          <el-input v-model="form.description" type="textarea" :rows="2" maxlength="120" show-word-limit />
        </el-form-item>
        <el-form-item label="口味">
          <div class="flavor-editor">
            <div v-for="(f, idx) in form.flavors" :key="idx" class="flavor-row">
              <el-input v-model="f.name" placeholder="口味名，如 辣度" style="width: 130px" />
              <el-input v-model="f.valuesText" placeholder="可选值，逗号分隔：不辣,微辣,中辣" style="flex: 1" />
              <el-button link type="danger" @click="form.flavors.splice(idx, 1)">删除</el-button>
            </div>
            <el-button size="small" plain @click="addFlavor">添加口味组</el-button>
            <div class="muted">后端 dish_flavor.value 存 JSON 数组字符串，保存时自动转换</div>
          </div>
        </el-form-item>
        <el-form-item label="起售状态">
          <el-switch v-model="form.status" :active-value="1" :inactive-value="0" active-text="起售" inactive-text="停售" />
          <span class="muted" style="margin-left: 8px">后端新菜品默认停售，需显式设为起售</span>
        </el-form-item>
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
import { ElMessage, ElMessageBox } from 'element-plus'
import { categoryApi, dishApi } from '../api/admin'
import { moneyText } from '../constants/order'

const rows = ref([])
const categories = ref([])
const total = ref(0)
const loading = ref(false)
const saving = ref(false)
const statusLoading = ref(0)
const dialog = ref(false)
const formRef = ref(null)

const query = reactive({ name: '', categoryId: '', status: '', page: 1, pageSize: 10 })
const form = reactive({
  id: null, name: '', categoryId: '', price: 10, image: '/assets/dish-1.svg',
  description: '', status: 1, flavors: []
})

const rules = {
  name: [{ required: true, message: '请输入菜品名称', trigger: 'blur' }],
  categoryId: [{ required: true, message: '请选择分类', trigger: 'change' }],
  price: [{ required: true, message: '请输入价格', trigger: 'blur' }],
  image: [{ required: true, message: '请填写图片地址（后端契约要求必填）', trigger: 'blur' }]
}

function parseValues(value) {
  if (!value) return []
  const text = String(value).trim()
  if (text.startsWith('[')) {
    try { return JSON.parse(text).map((v) => String(v)) } catch (e) { return [] }
  }
  return text.split(',').map((v) => v.trim()).filter(Boolean)
}

function flavorText(flavors) {
  return (flavors || []).map((f) => `${f.name}：${parseValues(f.value).join('/')}`).join('；')
}

async function loadCategories() {
  try {
    categories.value = (await categoryApi.list(1)) || []
  } catch (e) {
    ElMessage.error(e.message || '分类加载失败')
  }
}

async function load() {
  loading.value = true
  try {
    const page = await dishApi.page({
      page: query.page, pageSize: query.pageSize,
      name: query.name || undefined,
      categoryId: query.categoryId === '' ? undefined : query.categoryId,
      status: query.status === '' ? undefined : query.status
    })
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

function addFlavor() {
  form.flavors.push({ name: '', valuesText: '' })
}

function openCreate() {
  Object.assign(form, {
    id: null, name: '', categoryId: categories.value[0]?.id || '', price: 10,
    image: '/assets/dish-1.svg', description: '', status: 0, flavors: []
  })
  dialog.value = true
}

async function openEdit(row) {
  Object.assign(form, { ...row, price: Number(row.price), flavors: [] })
  dialog.value = true
  try {
    const detail = await dishApi.detail(row.id)
    Object.assign(form, {
      ...detail,
      price: Number(detail.price),
      flavors: (detail.flavors || []).map((f) => ({ name: f.name, valuesText: parseValues(f.value).join(',') }))
    })
  } catch (e) {
    ElMessage.error(e.message || '详情加载失败')
  }
}

async function onSave() {
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return
  saving.value = true
  try {
    const flavors = form.flavors
      .filter((f) => f.name && f.valuesText)
      .map((f) => ({
        name: f.name,
        value: JSON.stringify(f.valuesText.split(',').map((v) => v.trim()).filter(Boolean))
      }))
    const payload = {
      name: form.name,
      categoryId: form.categoryId,
      price: Number(form.price),
      image: form.image,
      description: form.description,
      status: form.status,
      flavors
    }
    if (form.id) await dishApi.update({ ...payload, id: form.id })
    else await dishApi.create(payload)
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
    await dishApi.changeStatus(checked ? 1 : 0, row.id)
    ElMessage.success(checked ? '已起售' : '已停售')
    await load()
  } catch (e) {
    ElMessage.error(e.message || '状态变更失败')
  } finally {
    statusLoading.value = 0
  }
}

async function onDelete(row) {
  try {
    await ElMessageBox.confirm(`确定删除菜品「${row.name}」吗？被套餐引用时后端会拒绝。`, '删除确认', { type: 'warning' })
  } catch (e) { return }
  try {
    await dishApi.remove(row.id)
    ElMessage.success('已删除')
    await load()
  } catch (e) {
    ElMessage.error(e.message || '删除失败')
  }
}

onMounted(async () => {
  await loadCategories()
  await load()
})
</script>

<style scoped>
.pager { margin-top: 12px; justify-content: flex-end; }
.flavor-editor { width: 100%; display: flex; flex-direction: column; gap: 8px; }
.flavor-row { display: flex; gap: 8px; align-items: center; }
</style>
