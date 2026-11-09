<template>
  <div class="page-card">
    <div class="page-head">
      <div class="head-info">
        <h2>订单管理</h2>
        <span class="muted">共 {{ total }} 条订单</span>
      </div>
      <el-button plain :icon="Refresh" @click="load">刷新</el-button>
    </div>

    <div class="toolbar">
      <el-input
        v-model="query.number"
        placeholder="订单号"
        clearable
        :prefix-icon="Search"
        style="width: 190px"
        @keyup.enter="reload"
      />
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
        style="width: 340px"
        @change="reload"
      />
      <el-button type="primary" :icon="Search" @click="reload">查询</el-button>
      <el-button text @click="resetQuery">重置</el-button>
    </div>

    <el-table :data="rows" v-loading="loading" row-key="id" class="order-table">
      <template #empty>
        <div class="empty">
          <el-icon><Tickets /></el-icon>
          <p>当前筛选条件下没有订单</p>
        </div>
      </template>

      <el-table-column prop="number" label="订单号" min-width="180">
        <template #default="{ row }">
          <span class="mono">{{ row.number }}</span>
        </template>
      </el-table-column>
      <el-table-column label="状态" width="96">
        <template #default="{ row }">
          <el-tag :type="orderTagType(row.status)" effect="light" round>{{ orderStatusText(row.status) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="收货信息" min-width="200">
        <template #default="{ row }">
          <div class="consignee">{{ row.consignee }} <span class="muted">{{ row.phone }}</span></div>
          <div class="address">{{ row.address }}</div>
        </template>
      </el-table-column>
      <el-table-column label="金额" width="110" align="right">
        <template #default="{ row }">
          <span class="price">¥{{ moneyText(row.amount) }}</span>
        </template>
      </el-table-column>
      <el-table-column label="下单时间" width="150">
        <template #default="{ row }">
          <span class="muted">{{ formatDateTime(row.orderTime) }}</span>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="236" fixed="right">
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
      layout="total, sizes, prev, pager, next"
      :total="total"
      :page-sizes="[10, 20, 50]"
      :page-size="query.pageSize"
      :current-page="query.page"
      @size-change="onSize"
      @current-change="onPage"
    />

    <el-drawer v-model="drawer" title="订单详情" size="480px">
      <template v-if="current">
        <div class="drawer-head">
          <el-tag :type="orderTagType(current.status)" effect="dark" round>
            {{ orderStatusText(current.status) }}
          </el-tag>
          <span class="mono order-no">{{ current.number }}</span>
        </div>

        <el-descriptions :column="1" border size="small" class="desc">
          <el-descriptions-item label="收货人">{{ current.consignee }} {{ current.phone }}</el-descriptions-item>
          <el-descriptions-item label="收货地址">{{ current.address }}</el-descriptions-item>
          <el-descriptions-item label="备注">{{ current.remark || '无' }}</el-descriptions-item>
          <el-descriptions-item label="下单时间">{{ formatDateTime(current.orderTime) }}</el-descriptions-item>
          <el-descriptions-item label="支付时间">{{ formatDateTime(current.checkoutTime) }}</el-descriptions-item>
          <el-descriptions-item v-if="current.rejectionReason" label="拒单原因">{{ current.rejectionReason }}</el-descriptions-item>
          <el-descriptions-item v-if="current.cancelReason" label="取消原因">{{ current.cancelReason }}</el-descriptions-item>
        </el-descriptions>

        <h3 class="items-title">商品明细</h3>
        <el-table :data="current.orderDetailList || []" size="small" border>
          <el-table-column prop="name" label="商品" min-width="150" />
          <el-table-column prop="dishFlavor" label="口味" width="100" />
          <el-table-column prop="number" label="数量" width="64" align="center" />
          <el-table-column label="小计" width="90" align="right">
            <template #default="{ row }">¥{{ moneyText(row.amount) }}</template>
          </el-table-column>
        </el-table>

        <div class="total-line">
          <span class="muted">订单总额</span>
          <b class="price">¥{{ moneyText(current.amount) }}</b>
        </div>
      </template>
    </el-drawer>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Refresh, Search, Tickets } from '@element-plus/icons-vue'
import { orderApi } from '../api/admin'
import {
  ORDER_STATUS_TEXT, adminActions, formatDateTime, moneyText, orderStatusText, orderTagType
} from '../constants/order'

const route = useRoute()

const rows = ref([])
const total = ref(0)
const loading = ref(false)
const drawer = ref(false)
const current = ref(null)
const range = ref([])

const query = reactive({
  number: '',
  phone: '',
  status: typeof route.query.status === 'string' ? Number(route.query.status) : '',
  page: 1,
  pageSize: 10
})

async function load() {
  loading.value = true
  try {
    const page = await orderApi.search({
      page: query.page,
      pageSize: query.pageSize,
      number: query.number || undefined,
      phone: query.phone || undefined,
      status: query.status === '' || query.status === null ? undefined : query.status,
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

function onSize(size) {
  query.pageSize = size
  query.page = 1
  load()
}

function resetQuery() {
  query.number = ''
  query.phone = ''
  query.status = ''
  range.value = []
  reload()
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

// 从工作台“待接单/已接单/派送中”跳转过来时，按状态过滤
watch(
  () => route.query.status,
  (v) => {
    const next = typeof v === 'string' && v !== '' ? Number(v) : ''
    if (next !== query.status) {
      query.status = next
      reload()
    }
  }
)

onMounted(load)
</script>

<style scoped>
.head-info {
  display: flex;
  align-items: baseline;
  gap: 10px;
}

.order-table :deep(.el-table__row) {
  height: 62px;
}

.mono {
  font-family: "SFMono-Regular", Consolas, "Liberation Mono", monospace;
  font-size: 12px;
  color: #4e5969;
}

.consignee {
  font-size: 13px;
}

.address {
  font-size: 12px;
  color: #8a9199;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.empty {
  padding: 34px 0;
  color: #a3aab3;
}

.empty .el-icon {
  font-size: 26px;
}

.empty p {
  margin: 8px 0 0;
  font-size: 13px;
}

.drawer-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 14px;
}

.order-no {
  font-size: 12px;
  color: #8a9199;
}

.desc {
  margin-bottom: 8px;
}

.items-title {
  margin: 18px 0 8px;
  font-size: 14px;
  font-weight: 600;
}

.total-line {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px dashed #eef0f3;
}

.total-line b {
  font-size: 18px;
}
</style>
