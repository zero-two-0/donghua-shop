// 订单状态与可用操作：与组长契约（1 待付款 / 2 待接单 / 3 已接单 / 4 派送中 / 5 已完成 / 6 已取消）一致。
export const ORDER_STATUS_TEXT = {
  1: '待付款',
  2: '待接单',
  3: '已接单',
  4: '派送中',
  5: '已完成',
  6: '已取消'
}

export function orderStatusText(status) {
  return ORDER_STATUS_TEXT[status] || '未知状态'
}

// 管理端可执行动作：依据后端 OrderServiceImpl 的状态迁移实现，按钮仅作提示，最终由后端校验
export function adminActions(status) {
  const list = []
  if (status === 1) list.push({ key: 'cancel', label: '取消订单', type: 'danger' })
  if (status === 2) {
    list.push({ key: 'confirm', label: '接单', type: 'primary' })
    list.push({ key: 'reject', label: '拒单', type: 'danger' })
  }
  if (status === 3) {
    list.push({ key: 'delivery', label: '开始派送', type: 'primary' })
    list.push({ key: 'cancel', label: '取消订单', type: 'danger' })
  }
  if (status === 4) list.push({ key: 'complete', label: '完成订单', type: 'success' })
  return list
}

export function orderTagType(status) {
  if (status === 1) return 'warning'
  if (status === 2) return 'danger'
  if (status === 3) return ''
  if (status === 4) return 'primary'
  if (status === 5) return 'success'
  return 'info'
}

export function moneyText(value) {
  const n = Number(value)
  return Number.isFinite(n) ? n.toFixed(2) : '0.00'
}

export function formatDateTime(value) {
  if (!value) return '-'
  return String(value).replace('T', ' ').slice(0, 19)
}
