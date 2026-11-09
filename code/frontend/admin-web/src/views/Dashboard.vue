<template>
  <div class="dashboard">
    <div class="grid-stats">
      <div v-for="card in cards" :key="card.label" class="stat-card">
        <div class="stat-top">
          <span class="stat-label">{{ card.label }}</span>
          <span :class="['stat-icon', card.tone]">
            <el-icon><component :is="card.icon" /></el-icon>
          </span>
        </div>
        <div class="stat-value">{{ card.value }}</div>
        <div class="stat-hint">{{ card.hint }}</div>
      </div>
    </div>

    <div class="grid-main">
      <section class="panel">
        <header class="panel-head">
          <h2>待处理订单</h2>
          <el-button link type="primary" @click="router.push('/orders')">全部订单</el-button>
        </header>
        <div class="mini-row">
          <div
            v-for="item in statisticsCards"
            :key="item.label"
            class="mini-card"
            :class="item.tone"
            @click="goOrders(item.status)"
          >
            <span class="mini-value">{{ item.value }}</span>
            <span class="mini-label">{{ item.label }}</span>
          </div>
        </div>

        <header class="panel-head mt">
          <h2>快捷入口</h2>
        </header>
        <div class="quick-row">
          <button v-for="q in quickLinks" :key="q.path" class="quick" @click="router.push(q.path)">
            <el-icon><component :is="q.icon" /></el-icon>
            <span>{{ q.label }}</span>
          </button>
        </div>
      </section>

      <section class="panel">
        <header class="panel-head">
          <h2>营业额报表</h2>
          <div class="toolbar-inline">
            <el-date-picker
              v-model="range"
              type="daterange"
              value-format="YYYY-MM-DD"
              start-placeholder="开始日期"
              end-placeholder="结束日期"
              size="small"
              style="width: 220px"
            />
            <el-button size="small" type="primary" :loading="reportLoading" @click="loadReport">查询</el-button>
          </div>
        </header>

        <el-table :data="reportRows" size="small" v-loading="reportLoading" max-height="300" class="report-table">
          <template #empty>
            <div class="empty">所选区间暂无营业额数据</div>
          </template>
          <el-table-column prop="date" label="日期" min-width="120" />
          <el-table-column prop="turnover" label="营业额（元）" min-width="120" align="right" />
        </el-table>

        <div v-if="reportRows.length" class="report-total">
          <span>区间合计</span>
          <b>¥{{ reportSum }}</b>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Odometer, Money, Tickets, User, Dish, Box, Menu, List } from '@element-plus/icons-vue'
import { orderApi, reportApi } from '../api/admin'
import { moneyText } from '../constants/order'

const router = useRouter()
const business = ref({})
const statistics = ref({})
const range = ref([])
const reportRows = ref([])
const reportLoading = ref(false)

const cards = computed(() => [
  { label: '今日营业额', value: '¥' + moneyText(business.value.turnover), hint: '已支付且未取消的订单', icon: Money, tone: 'orange' },
  { label: '有效订单', value: business.value.validOrderCount ?? 0, hint: '完成率 ' + Math.round((business.value.orderCompletionRate || 0) * 100) + '%', icon: Tickets, tone: 'blue' },
  { label: '平均客单价', value: '¥' + moneyText(business.value.unitPrice), hint: '营业额 ÷ 有效订单数', icon: Odometer, tone: 'green' },
  { label: '新增用户', value: business.value.newUsers ?? 0, hint: '今日注册的校园用户', icon: User, tone: 'purple' }
])

const statisticsCards = computed(() => [
  { label: '待接单', value: statistics.value.toBeConfirmed ?? 0, status: '2', tone: 'warn' },
  { label: '已接单', value: statistics.value.confirmed ?? 0, status: '3', tone: 'info' },
  { label: '派送中', value: statistics.value.deliveryInProgress ?? 0, status: '4', tone: 'good' }
])

const quickLinks = [
  { label: '菜品管理', path: '/dishes', icon: Dish },
  { label: '套餐管理', path: '/setmeals', icon: Box },
  { label: '分类管理', path: '/categories', icon: Menu },
  { label: '员工管理', path: '/employees', icon: List }
]

const reportSum = computed(() => {
  const sum = reportRows.value.reduce((acc, r) => acc + Number(r.raw || 0), 0)
  return moneyText(sum)
})

function today() {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

function goOrders(status) {
  router.push({ path: '/orders', query: { status } })
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
    reportRows.value = dates.map((d, i) => ({
      date: d,
      turnover: moneyText(turnovers[i] || 0),
      raw: Number(turnovers[i] || 0)
    }))
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
.dashboard {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.grid-stats {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}

.stat-card {
  background: #fff;
  border-radius: 14px;
  padding: 16px 18px;
  box-shadow: 0 2px 10px rgba(31, 35, 41, 0.05);
}

.stat-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.stat-label {
  font-size: 13px;
  color: #8a9199;
}

.stat-icon {
  width: 30px;
  height: 30px;
  border-radius: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 15px;
}

.stat-icon.orange { background: #fff2e8; color: #f2701f; }
.stat-icon.blue { background: #eaf1ff; color: #2f6fe4; }
.stat-icon.green { background: #e9f9ef; color: #12a150; }
.stat-icon.purple { background: #f2edff; color: #7a5af8; }

.stat-value {
  margin: 10px 0 4px;
  font-size: 26px;
  font-weight: 600;
  letter-spacing: -0.5px;
  color: #1f2329;
}

.stat-hint {
  font-size: 12px;
  color: #a3aab3;
}

.grid-main {
  display: grid;
  grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr);
  gap: 16px;
}

.panel {
  background: #fff;
  border-radius: 14px;
  padding: 16px 18px 18px;
  box-shadow: 0 2px 10px rgba(31, 35, 41, 0.05);
}

.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.panel-head h2 {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: #1f2329;
}

.panel-head.mt {
  margin-top: 18px;
}

.mini-row {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.mini-card {
  border-radius: 12px;
  padding: 14px 10px;
  text-align: center;
  cursor: pointer;
  transition: transform 0.12s ease, box-shadow 0.15s ease;
}

.mini-card:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(31, 35, 41, 0.08);
}

.mini-card.warn { background: #fff7ec; }
.mini-card.info { background: #eef3ff; }
.mini-card.good { background: #ecf9f1; }

.mini-value {
  display: block;
  font-size: 22px;
  font-weight: 600;
  color: #1f2329;
}

.mini-label {
  font-size: 12px;
  color: #8a9199;
}

.quick-row {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}

.quick {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 12px 6px;
  border: 1px solid #eef0f3;
  border-radius: 12px;
  background: #fbfcfd;
  color: #4e5969;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.quick:hover {
  border-color: #ffc79a;
  background: #fff8f2;
  color: #e8631a;
}

.quick .el-icon {
  font-size: 17px;
}

.toolbar-inline {
  display: flex;
  gap: 8px;
  align-items: center;
}

.report-table :deep(.el-table__inner-wrapper::before) {
  display: none;
}

.report-total {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px dashed #eef0f3;
  font-size: 13px;
  color: #8a9199;
}

.report-total b {
  font-size: 18px;
  color: #f2701f;
}

.empty {
  padding: 26px 0;
  color: #a3aab3;
  font-size: 13px;
}

@media (max-width: 1180px) {
  .grid-stats { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .grid-main { grid-template-columns: minmax(0, 1fr); }
}
</style>
