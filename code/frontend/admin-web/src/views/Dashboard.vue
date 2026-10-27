<template>
  <div>
    <el-row :gutter="16">
      <el-col :span="6" v-for="card in cards" :key="card.label">
        <div class="stat-card">
          <div class="label">{{ card.label }}</div>
          <div class="value">{{ card.value }}</div>
          <div class="muted">{{ card.hint }}</div>
        </div>
      </el-col>
    </el-row>

    <div class="page-card mt">
      <div class="page-head">
        <h2>订单状态计数</h2>
        <span class="muted">GET /admin/order/statistics</span>
      </div>
      <el-row :gutter="16">
        <el-col :span="8" v-for="item in statisticsCards" :key="item.label">
          <div class="mini-card">
            <div class="label">{{ item.label }}</div>
            <div class="value">{{ item.value }}</div>
          </div>
        </el-col>
      </el-row>
    </div>

    <div class="page-card mt">
      <div class="page-head">
        <h2>营业额报表</h2>
        <div class="toolbar-inline">
          <el-date-picker v-model="range" type="daterange" value-format="YYYY-MM-DD" start-placeholder="开始日期" end-placeholder="结束日期" size="small" />
          <el-button size="small" type="primary" :loading="reportLoading" @click="loadReport">查询</el-button>
        </div>
      </div>
      <el-table :data="reportRows" size="small" border v-loading="reportLoading" max-height="320">
        <el-table-column prop="date" label="日期" width="160" />
        <el-table-column prop="turnover" label="营业额（元）" width="160" />
        <el-table-column label="数据口径">
          <template #default>
            <span class="muted">后端 turnoverStatistics 返回 dateList / turnoverList 两个逗号串，前端按位置配对展示</span>
          </template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { orderApi, reportApi } from '../api/admin'
import { moneyText } from '../constants/order'

const business = ref({})
const statistics = ref({})
const range = ref([])
const reportRows = ref([])
const reportLoading = ref(false)

const cards = computed(() => [
  { label: '今日营业额', value: '¥' + moneyText(business.value.turnover), hint: '已支付且未取消订单' },
  { label: '今日有效订单', value: business.value.validOrderCount ?? 0, hint: '完成率 ' + Math.round((business.value.orderCompletionRate || 0) * 100) + '%' },
  { label: '平均客单价', value: '¥' + moneyText(business.value.unitPrice), hint: '营业额 / 有效订单数' },
  { label: '今日新增用户', value: business.value.newUsers ?? 0, hint: '课程库内测试身份' }
])

const statisticsCards = computed(() => [
  { label: '待接单', value: statistics.value.toBeConfirmed ?? 0 },
  { label: '已接单', value: statistics.value.confirmed ?? 0 },
  { label: '派送中', value: statistics.value.deliveryInProgress ?? 0 }
])

function today() {
  return new Date().toISOString().slice(0, 10)
}

async function loadBusiness() {
  try {
    business.value = (await reportApi.businessData(today())) || {}
  } catch (e) {
    ElMessage.error(e.message || '经营数据加载失败')
  }
}

async function loadStatistics() {
  try {
    statistics.value = (await orderApi.statistics()) || {}
  } catch (e) {
    ElMessage.error(e.message || '订单统计加载失败')
  }
}

async function loadReport() {
  const begin = range.value?.[0] || today()
  const end = range.value?.[1] || today()
  reportLoading.value = true
  try {
    const data = (await reportApi.turnover(begin, end)) || {}
    const dates = String(data.dateList || '').split(',').filter(Boolean)
    const turnovers = String(data.turnoverList || '').split(',').filter(Boolean)
    reportRows.value = dates.map((d, i) => ({ date: d, turnover: moneyText(turnovers[i] || 0) }))
  } catch (e) {
    ElMessage.error(e.message || '报表加载失败')
    reportRows.value = []
  } finally {
    reportLoading.value = false
  }
}

onMounted(() => {
  loadBusiness()
  loadStatistics()
  loadReport()
})
</script>

<style scoped>
.mt { margin-top: 16px; }
.stat-card { background: #fff; border-radius: 8px; padding: 16px; box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04); }
.stat-card .label { color: #909399; font-size: 13px; }
.stat-card .value { font-size: 24px; font-weight: 700; margin: 6px 0; }
.mini-card { background: #f7f9fc; border-radius: 8px; padding: 12px; text-align: center; }
.mini-card .label { color: #909399; font-size: 13px; }
.mini-card .value { font-size: 22px; font-weight: 700; margin-top: 4px; }
.toolbar-inline { display: flex; gap: 8px; align-items: center; }
</style>
