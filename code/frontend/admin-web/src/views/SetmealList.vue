<template>
  <div class="page-card">
    <div class="page-head">
      <h2>套餐管理</h2>
      <el-button type="primary" @click="openCreate">新增套餐</el-button>
    </div>

    <div class="toolbar">
      <el-input v-model="query.name" placeholder="套餐名称" clearable style="width: 160px" @keyup.enter="reload" />
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
      <el-table-column prop="name" label="套餐名称" min-width="160" />
      <el-table-column prop="categoryName" label="分类" width="120" />
      <el-table-column label="价格" width="100">
        <template #default="{ row }"><span class="price">¥{{ moneyText(row.price) }}</span></template>
      </el-table-column>
      <el-table-column label="组成" min-width="200">
        <template #default="{ row }">
          <span class="muted">{{ (row.setmealDishes || []).map((d) => `${d.name}×${d.copies}`).join('、') || '未配置' }}</span>
        </template>
      </el-table-column>
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

    <el-dialog v-model="dialog" :title="form.id ? '编辑套餐' : '新增套餐'" width="600px">
      <el-form :model="form" :rules="rules" ref="formRef" label-width="92px">
        <el-form-item label="套餐名称" prop="name">
          <el-input v-model="form.name" maxlength="40" show-word-limit />
        </el-form-item>
        <el-form-item label="套餐分类" prop="categoryId">
          <el-select v-model="form.categoryId" placeholder="请选择套餐分类" style="width: 100%">
            <el-option v-for="c in categories" :key="c.id" :label="c.name" :value="c.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="价格（元）" prop="price">
          <el-input-number v-model="form.price" :min="0.01" :max="9999" :precision="2" />
        </el-form-item>
        <el-form-item label="图片 URL" prop="image">
          <el-input v-model="form.image" placeholder="必填，如 /assets/setmeal-1.svg" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="form.description" type="textarea" :rows="2" maxlength="120" />
        </el-form-item>
        <el-form-item label="包含菜品" prop="setmealDishes">
          <div class="dish-editor">
            <div v-for="(d, idx) in form.setmealDishes" :key="idx" class="dish-row">
              <el-select v-model="d.dishId" placeholder="选择菜品" style="flex: 1" @change="(id) => onPickDish(d, id)">
                <el-option v-for="dish in dishOptions" :key="dish.id" :label="`${dish.name}（¥${moneyText(dish.price)}）`" :value="dish.id" />
              </el-select>
              <el-input-number v-model="d.copies" :min="1" :max="20" size="small" />
              <el-button link type="danger" @click="form.setmealDishes.splice(idx, 1)">删除</el-button>
            </div>
            <el-button size="small" plain @click="addDish">添加菜品</el-button>
            <div class="muted">套餐组成会保存到 setmeal_dish，价格取菜品单价快照</div>
          </div>
        </el-form-item>
        <el-form-item label="起售状态">
          <el-switch v-model="form.status" :active-value="1" :inactive-value="0" active-text="起售" inactive-text="停售" />
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
import { categoryApi, dishApi, setmealApi } from '../api/admin'
import { moneyText } from '../constants/order'

const rows = ref([])
const categories = ref([])
const dishOptions = ref([])
const total = ref(0)
const loading = ref(false)
const saving = ref(false)
const statusLoading = ref(0)
const dialog = ref(false)
const formRef = ref(null)

const query = reactive({ name: '', categoryId: '', status: '', page: 1, pageSize: 10 })
const form = reactive({
  id: null, name: '', categoryId: '', price: 20, image: '/assets/setmeal-1.svg',
  description: '', status: 0, setmealDishes: []
})

const rules = {
  name: [{ required: true, message: '请输入套餐名称', trigger: 'blur' }],
  categoryId: [{ required: true, message: '请选择套餐分类', trigger: 'change' }],
  price: [{ required: true, message: '请输入价格', trigger: 'blur' }],
  image: [{ required: true, message: '请填写图片地址', trigger: 'blur' }]
}

async function loadCategories() {
  try {
    categories.value = (await categoryApi.list(2)) || []
  } catch (e) {
    ElMessage.error(e.message || '分类加载失败')
  }
}

async function loadDishOptions() {
  try {
    dishOptions.value = (await dishApi.list()) || []
  } catch (e) {
    dishOptions.value = []
  }
}

async function load() {
  loading.value = true
  try {
    const page = await setmealApi.page({
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

function addDish() {
  form.setmealDishes.push({ dishId: null, name: '', price: 0, copies: 1 })
}

function onPickDish(row, dishId) {
  const dish = dishOptions.value.find((d) => d.id === dishId)
  if (dish) {
    row.name = dish.name
    row.price = Number(dish.price)
  }
}

function openCreate() {
  Object.assign(form, {
    id: null, name: '', categoryId: categories.value[0]?.id || '', price: 20,
    image: '/assets/setmeal-1.svg', description: '', status: 0, setmealDishes: []
  })
  dialog.value = true
}

async function openEdit(row) {
  Object.assign(form, { ...row, price: Number(row.price), setmealDishes: [] })
  dialog.value = true
  try {
    const detail = await setmealApi.detail(row.id)
    Object.assign(form, {
      ...detail,
      price: Number(detail.price),
      setmealDishes: (detail.setmealDishes || []).map((d) => ({
        dishId: d.dishId, name: d.name, price: Number(d.price), copies: d.copies
      }))
    })
  } catch (e) {
    ElMessage.error(e.message || '详情加载失败')
  }
}

async function onSave() {
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return
  if (!form.setmealDishes.length || form.setmealDishes.some((d) => !d.dishId)) {
    ElMessage.warning('请至少选择一项菜品并填写份数')
    return
  }
  saving.value = true
  try {
    const payload = {
      name: form.name,
      categoryId: form.categoryId,
      price: Number(form.price),
      image: form.image,
      description: form.description,
      status: form.status,
      setmealDishes: form.setmealDishes.map((d) => ({
        dishId: d.dishId, name: d.name, price: Number(d.price), copies: d.copies
      }))
    }
    if (form.id) await setmealApi.update({ ...payload, id: form.id })
    else await setmealApi.create(payload)
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
    await setmealApi.changeStatus(checked ? 1 : 0, row.id)
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
    await ElMessageBox.confirm(`确定删除套餐「${row.name}」吗？`, '删除确认', { type: 'warning' })
  } catch (e) { return }
  try {
    await setmealApi.remove(row.id)
    ElMessage.success('已删除')
    await load()
  } catch (e) {
    ElMessage.error(e.message || '删除失败')
  }
}

onMounted(async () => {
  await Promise.all([loadCategories(), loadDishOptions()])
  await load()
})
</script>

<style scoped>
.pager { margin-top: 12px; justify-content: flex-end; }
.dish-editor { width: 100%; display: flex; flex-direction: column; gap: 8px; }
.dish-row { display: flex; gap: 8px; align-items: center; }
</style>
