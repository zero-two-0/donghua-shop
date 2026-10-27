<template>
  <div class="page-card">
    <div class="page-head">
      <h2>订单管理</h2>
      <el-button plain @click="load">刷新</el-button>
    </div>

    <div class="toolbar">
      <el-input v-model="query.number" placeholder="订单号" clearable style="width: 180px" @keyup.enter="reload" />
      <el-input v-model="query.phone" placeholder="手机号" clearable style="width: 150px" @keyup.enter="reload" />
      <el-select v-model="query.status" placeholder="全部状态" clearable style="width: 140px" @change="reload">
        <el-option v-for="(text, value) in ORDER_STATUS_TEXT" :key="value" :label="text" :value="Number(value)" />
      </el-select>
      <el-date-picker
        v-model="range"
        type="datetimerange"
        value-format="YYYY-MM-DD HH:mm:ss"
        start-placeholder="下单开始"
        end-placeholder="下单结束"
        style="width: 360px"
        @change="reload"
      />
      <el-button type="primary" plain @click="reload">查询</el-button>
    </div>

    <el-table :data="rows" border v-loading="loading">
      <el-table-column prop="number" label="订单号" width="180" />
      <el-table-column label="状态" width="100">
        <template #default="{ row }">
          <el-tag :type="orderTagType(row.status)" effect="plain">{{ orderStatusText(row.status) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="consignee" label="收货人" width="110" />
      <el-table-column prop="phone" label="电话" width="130" />
      <el-table-column prop="address" label="地址" min-width="200" show-overflow-tooltip />
      <el-table-column label="金额" width="100">
        <template #default="{ row }"><span class="price">¥{{ moneyText(row.amount) }}</span></template>
      </el-table-column>
      <el-table-column label="下单时间" width="160">
        <template #default="{ row }">{{ formatDateTime(row.orderTime) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="230" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="openDetail(row)">详情</el-button>
          <el-button
            v-for="act in adminActions(row.status)"
            :key="act.key"
            link
            :type="act.type"
            @click="runAction(row, act)"
          >{{ act.label }}</el-button>
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

    <el-drawer v-model="drawer" title="订单详情" size="460px">
      <template v-if="current">
        <el-descriptions :column="1" border>
          <el-descriptions-item label="订单号">{{ current.number }}</el-descriptions-item>
          <el-descriptions-item label="状态">{{ orderStatusText(current.status) }}</el-descriptions-item>
          <el-descriptions-item label="收货人">{{ current.consignee }} {{ current.phone }}</el-descriptions-item>
          <el-descriptions-item label="地址">{{ current.address }}</el-descriptions-item>
          <el-descriptions-item label="备注">{{ current.remark || '无' }}</el-descriptions-item>
          <el-descriptions-item label="下单时间">{{ formatDateTime(current.orderTime) }}</el-descriptions-item>
          <el-descriptions-item label="支付时间">{{ formatDateTime(current.checkoutTime) }}</el-descriptions-item>
          <el-descriptions-item label="拒单原因">{{ current.rejectionReason || '-' }}</el-descriptions-item>
          <el-descriptions-item label="取消原因">{{ current.cancelReason || '-' }}</el-descriptions-item>
        </el-descriptions>

        <h3 class="items-title">商品明细</h3>
        <el-table :data="current.orderDetailList || []" size="small" border>
          <el-table-column prop="name" label="商品" min-width="150" />
          <el-table-column prop="dishFlavor" label="口味" width="100" />
          <el-table-column prop="number" label="数量" width="70" />
          <el-table-column label="小计" width="90">
            <template #default="{ row }">¥{{ moneyText(row.amount) }}</template>
          </el-table-column>
        </el-table>
        <div class="total-line">订单总额：<span class="price">¥{{ moneyText(current.amount) }}</span></div>
      </template>
    </el-drawer>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { orderApi } from '../api/admin'
import {
  ORDER_STATUS_TEXT, adminActions, formatDateTime, moneyText, orderStatusText, orderTagType
} from '../constants/order'

const rows = ref([])
const total = ref(0)
const loading = ref(false)
const drawer = ref(false)
const current = ref(null)
const range = ref([])

const query = reactive({ number: '', phone: '', status: '', page: 1, pageSize: 10 })

async function load() {
  loading.value = true
  try {
    const page = await orderApi.search({
      page: query.page,
      pageSize: query.pageSize,
      number: query.number || undefined,
      phone: query.phone || undefined,
      status: query.status === '' ? undefined : query.status,
      beginTime: range.value?.[0],
      endTime: range.value?.[1]
    })
    rows.value = (page && page.records) || []
    total.value = (page && page.total) || 0
  } catch (e) {
    ElMessage.error(e.message || '加载失败')
  } finally {
    loading.value = false
  }
}

function reload() {
  query.page = 1
  load()
}

function onPage(p) {
  query.page = p
  load()
}

async function openDetail(row) {
  try {
    current.value = await orderApi.detail(row.id)
    drawer.value = true
  } catch (e) {
    ElMessage.error(e.message || '详情加载失败')
  }
}

async function runAction(row, act) {
  if (act.key === 'confirm') {
    try {
      await ElMessageBox.confirm(`确认接单：${row.number}？`, '接单', { type: 'warning' })
    } catch (e) { return }
    await call(() => orderApi.confirm(row.id), '已接单')
  } else if (act.key === 'delivery') {
    try {
      await ElMessageBox.confirm(`确认开始派送：${row.number}？`, '派送', { type: 'warning' })
    } catch (e) { return }
    await call(() => orderApi.delivery(row.id), '已开始派送')
  } else if (act.key === 'complete') {
    try {
      await ElMessageBox.confirm(`确认完成订单：${row.number}？`, '完成', { type: 'warning' })
    } catch (e) { return }
    await call(() => orderApi.complete(row.id), '订单已完成')
  } else if (act.key === 'reject') {
    let reason = ''
    try {
      const res = await ElMessageBox.prompt('请填写拒单原因（必填）', '拒单', { inputPattern: /\S+/, inputErrorMessage: '原因不能为空' })
      reason = res.value
    } catch (e) { return }
    await call(() => orderApi.reject(row.id, reason), '已拒单')
  } else if (act.key === 'cancel') {
    let reason = ''
    try {
      const res = await ElMessageBox.prompt('请填写取消原因（必填）', '取消订单', { inputPattern: /\S+/, inputErrorMessage: '原因不能为空' })
      reason = res.value
    } catch (e) { return }
    await call(() => orderApi.cancel(row.id, reason), '已取消')
  }
}

async function call(fn, okMessage) {
  try {
    await fn()
    ElMessage.success(okMessage)
    await load()
  } catch (e) {
    ElMessage.error(e.message || '操作失败')
  }
}

onMounted(load)
</script>

<style scoped>
.pager { margin-top: 12px; justify-content: flex-end; }
.items-title { font-size: 14px; margin: 16px 0 8px; }
.total-line { margin-top: 12px; text-align: right; }
</style>
