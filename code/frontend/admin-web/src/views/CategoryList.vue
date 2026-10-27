<template>
  <div class="page-card">
    <div class="page-head">
      <h2>分类管理</h2>
      <el-button type="primary" @click="openCreate">新增分类</el-button>
    </div>

    <div class="toolbar">
      <el-select v-model="query.type" placeholder="全部类型" clearable style="width: 160px" @change="reload">
        <el-option label="菜品分类" :value="1" />
        <el-option label="套餐分类" :value="2" />
      </el-select>
      <el-input v-model="query.name" placeholder="分类名称" clearable style="width: 200px" @keyup.enter="reload" />
      <el-button type="primary" plain @click="reload">查询</el-button>
    </div>

    <el-table :data="rows" border v-loading="loading">
      <el-table-column prop="id" label="ID" width="80" />
      <el-table-column prop="name" label="分类名称" min-width="160" />
      <el-table-column label="类型" width="120">
        <template #default="{ row }">
          <el-tag :type="row.type === 1 ? '' : 'success'" effect="plain">{{ row.type === 1 ? '菜品分类' : '套餐分类' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="sort" label="排序" width="90" />
      <el-table-column label="状态" width="130">
        <template #default="{ row }">
          <el-switch
            :model-value="row.status === 1"
            :loading="statusLoading === row.id"
            @change="(v) => toggleStatus(row, v)"
          />
          <span class="muted" style="margin-left: 6px">{{ row.status === 1 ? '启用' : '停用' }}</span>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="150">
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

    <el-dialog v-model="dialog" :title="form.id ? '编辑分类' : '新增分类'" width="440px">
      <el-form :model="form" :rules="rules" ref="formRef" label-width="88px">
        <el-form-item label="分类名称" prop="name">
          <el-input v-model="form.name" maxlength="16" show-word-limit />
        </el-form-item>
        <el-form-item label="分类类型" prop="type">
          <el-radio-group v-model="form.type">
            <el-radio :value="1">菜品分类</el-radio>
            <el-radio :value="2">套餐分类</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="排序" prop="sort">
          <el-input-number v-model="form.sort" :min="0" :max="999" />
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
import { categoryApi } from '../api/admin'

const rows = ref([])
const total = ref(0)
const loading = ref(false)
const saving = ref(false)
const statusLoading = ref(0)
const dialog = ref(false)
const formRef = ref(null)

const query = reactive({ type: '', name: '', page: 1, pageSize: 10 })
const form = reactive({ id: null, name: '', type: 1, sort: 0 })
const rules = {
  name: [{ required: true, message: '请输入分类名称', trigger: 'blur' }],
  type: [{ required: true, message: '请选择类型', trigger: 'change' }]
}

async function load() {
  loading.value = true
  try {
    const page = await categoryApi.page({
      page: query.page, pageSize: query.pageSize,
      name: query.name || undefined,
      type: query.type === '' ? undefined : query.type
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

function openCreate() {
  Object.assign(form, { id: null, name: '', type: 1, sort: 0 })
  dialog.value = true
}

function openEdit(row) {
  Object.assign(form, { id: row.id, name: row.name, type: row.type, sort: row.sort })
  dialog.value = true
}

async function onSave() {
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return
  saving.value = true
  try {
    // 契约：新增 POST /admin/category，修改 PUT /admin/category（body 带 id）
    if (form.id) await categoryApi.update({ ...form })
    else await categoryApi.create({ name: form.name, type: form.type, sort: form.sort })
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
    await categoryApi.changeStatus(checked ? 1 : 0, row.id)
    ElMessage.success(checked ? '已启用' : '已停用')
    await load()
  } catch (e) {
    ElMessage.error(e.message || '状态变更失败')
  } finally {
    statusLoading.value = 0
  }
}

async function onDelete(row) {
  try {
    await ElMessageBox.confirm(`确定删除分类「${row.name}」吗？分类下仍有商品时后端会拒绝。`, '删除确认', { type: 'warning' })
  } catch (e) { return }
  try {
    await categoryApi.remove(row.id)
    ElMessage.success('已删除')
    await load()
  } catch (e) {
    ElMessage.error(e.message || '删除失败')
  }
}

onMounted(load)
</script>

<style scoped>
.pager { margin-top: 12px; justify-content: flex-end; }
</style>
