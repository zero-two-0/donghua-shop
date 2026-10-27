import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { cartApi } from '../api/user'

// 购物车以服务端为准：任何增改删后都重新读取 /user/shoppingCart/list，
// 页面不本地累加数量或金额（金额由后端按商品现价计算）。
export const useCartStore = defineStore('cart', () => {
  const items = ref([])
  const loading = ref(false)

  const count = computed(() => items.value.reduce((sum, i) => sum + Number(i.number || 0), 0))
  // amount 是单价：合计 = Σ 单价 × 数量，与后端下单时的计价口径一致
  const total = computed(() =>
    items.value.reduce((sum, i) => sum + Number(i.amount || 0) * Number(i.number || 0), 0)
  )

  async function load() {
    loading.value = true
    try {
      items.value = (await cartApi.list()) || []
    } finally {
      loading.value = false
    }
  }

  // 加入购物车：接口每次 +1；需要一次加多份时，加完再按数量更新该行
  async function add(payload, number = 1) {
    await cartApi.add(payload)
    await load()
    if (Number(number) > 1) {
      const target = items.value.find((i) => {
        const sameDish = payload.dishId ? String(i.dishId) === String(payload.dishId) : !i.dishId
        const sameSetmeal = payload.setmealId ? String(i.setmealId) === String(payload.setmealId) : !i.setmealId
        const sameFlavor = (i.dishFlavor || '') === (payload.dishFlavor || '')
        return sameDish && sameSetmeal && sameFlavor
      })
      if (target) {
        await cartApi.updateNumber(target.id, Math.min(Number(number), 99))
        await load()
      }
    }
  }

  async function updateNumber(id, number) {
    await cartApi.updateNumber(id, number)
    await load()
  }

  async function remove(id) {
    await cartApi.remove(id)
    await load()
  }

  async function clear() {
    await cartApi.clear()
    items.value = []
  }

  return { items, loading, count, total, load, add, updateNumber, remove, clear }
})
