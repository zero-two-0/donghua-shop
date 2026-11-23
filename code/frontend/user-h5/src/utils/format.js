// 展示层工具：金额、时间、订单状态、口味解析。
// 后端金额为 JSON number（数据库 DECIMAL(10,2)），前端统一格式化为两位小数字符串展示。

export function money(value) {
  const n = Number(value)
  return Number.isFinite(n) ? n.toFixed(2) : '0.00'
}

export function yuan(value) {
  return '¥' + money(value)
}

export function cents(value) {
  const n = Number(value)
  return Number.isFinite(n) ? Math.round(n * 100) : 0
}

// 购物车行的金额：后端 shopping_cart.amount 存的是“单价”（OrderServiceImpl 以 Σ amount×number 计算订单总额），
// 因此行小计必须由 单价 × 数量 得出；字段名 amount 的语义歧义见 docs/integration/defects.md F-01。
export function lineAmount(item) {
  const n = Number(item && item.amount) * Number(item && item.number)
  return Number.isFinite(n) ? n : 0
}

export const ORDER_STATUS = {
  1: '待付款',
  2: '待接单',
  3: '已接单',
  4: '派送中',
  5: '已完成',
  6: '已取消'
}

export function orderStatusText(status) {
  return ORDER_STATUS[status] || '未知状态'
}

export const PAY_STATUS = { 0: '未支付', 1: '已支付', 2: '模拟退款' }

export function payStatusText(status) {
  return PAY_STATUS[status] || '-'
}

// dish_flavor.value 在数据库中保存 JSON 数组字符串，如 ["不辣","微辣"]；
// 兼容历史逗号分隔写法，解析失败时退化为空数组，避免页面白屏。
export function parseFlavorValues(value) {
  if (!value) return []
  const text = String(value).trim()
  if (text.startsWith('[')) {
    try {
      const arr = JSON.parse(text)
      return Array.isArray(arr) ? arr.map((v) => String(v)) : []
    } catch (e) {
      return []
    }
  }
  return text.split(',').map((v) => v.trim()).filter(Boolean)
}

/** 后端返回的订单地址形如“上海市上海市松江区…”，去掉省市重名与多余空白 */
export function tidyAddress(text) {
  if (!text) return ''
  let s = String(text).trim()
  const dup = s.match(/^(.{2,8}?(?:市|省|自治区))\1/)
  if (dup) s = s.slice(dup[1].length)
  return s
}

export function formatDateTime(value) {
  if (!value) return '-'
  return String(value).replace('T', ' ').slice(0, 19)
}

/** 订单列表用的相对时间：今天 18:28 / 昨天 12:10 / 11-07 18:05（今年）/ 2025-11-07 18:05 */
export function timeText(value) {
  if (!value) return '-'
  const text = String(value).replace('T', ' ')
  const d = new Date(text.replace(/-/g, '/'))
  if (Number.isNaN(d.getTime())) return text.slice(0, 16)
  const pad = (n) => String(n).padStart(2, '0')
  const now = new Date()
  const hm = pad(d.getHours()) + ':' + pad(d.getMinutes())
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const startOfDay = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  const diffDays = Math.round((startOfToday - startOfDay) / 86400000)
  if (diffDays === 0) return '今天 ' + hm
  if (diffDays === 1) return '昨天 ' + hm
  if (diffDays > 1 && diffDays < 7) {
    return ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][d.getDay()] + ' ' + hm
  }
  const md = pad(d.getMonth() + 1) + '-' + pad(d.getDate())
  if (d.getFullYear() === now.getFullYear()) return md + ' ' + hm
  return d.getFullYear() + '-' + md + ' ' + hm
}

// 订单卡片摘要：orderDishes 形如 "宫保鸡丁*2;番茄炒蛋*1;"
export function orderSummaryText(order) {
  if (!order) return ''
  if (order.orderDishes) {
    return order.orderDishes.split(';').filter(Boolean).join('、')
  }
  const list = order.orderDetailList || []
  return list.map((i) => `${i.name}×${i.number}`).join('、')
}
