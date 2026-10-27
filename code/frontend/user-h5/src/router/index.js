import { createRouter, createWebHashHistory } from 'vue-router'
import { getToken } from '../api/http'

const routes = [
  { path: '/', redirect: '/home' },
  { path: '/login', name: 'login', component: () => import('../views/Login.vue'), meta: { title: '登录' } },
  { path: '/home', name: 'home', component: () => import('../views/Home.vue'), meta: { title: '点餐', tabbar: true } },
  { path: '/dish/:id', name: 'dish', component: () => import('../views/DishDetail.vue'), meta: { title: '菜品详情' } },
  { path: '/setmeal/:id', name: 'setmeal', component: () => import('../views/SetmealDetail.vue'), meta: { title: '套餐详情' } },
  { path: '/cart', name: 'cart', component: () => import('../views/Cart.vue'), meta: { title: '购物车', tabbar: true, requiresAuth: true } },
  { path: '/order/confirm', name: 'order-confirm', component: () => import('../views/OrderConfirm.vue'), meta: { title: '确认订单', requiresAuth: true } },
  { path: '/orders', name: 'orders', component: () => import('../views/OrderList.vue'), meta: { title: '我的订单', tabbar: true, requiresAuth: true } },
  { path: '/orders/:id', name: 'order-detail', component: () => import('../views/OrderDetail.vue'), meta: { title: '订单详情', requiresAuth: true } },
  { path: '/addresses', name: 'addresses', component: () => import('../views/AddressList.vue'), meta: { title: '收货地址', requiresAuth: true } },
  { path: '/addresses/edit/:id?', name: 'address-edit', component: () => import('../views/AddressEdit.vue'), meta: { title: '编辑地址', requiresAuth: true } },
  { path: '/profile', name: 'profile', component: () => import('../views/Profile.vue'), meta: { title: '个人中心', tabbar: true } },
  { path: '/:pathMatch(.*)*', redirect: '/home' }
]

const router = createRouter({ history: createWebHashHistory(), routes })

router.beforeEach((to) => {
  if (to.meta.requiresAuth && !getToken()) {
    return { path: '/login', query: { redirect: to.fullPath } }
  }
  if (to.meta.title) document.title = `${to.meta.title} · 东华食堂`
  return true
})

export default router
