import { createRouter, createWebHashHistory } from 'vue-router'
import { getToken } from '../api/http'

const routes = [
  { path: '/login', name: 'login', component: () => import('../views/Login.vue'), meta: { title: '员工登录' } },
  {
    path: '/',
    component: () => import('../layout/AdminLayout.vue'),
    redirect: '/dashboard',
    children: [
      { path: 'dashboard', name: 'dashboard', component: () => import('../views/Dashboard.vue'), meta: { title: '工作台' } },
      { path: 'orders', name: 'orders', component: () => import('../views/OrderList.vue'), meta: { title: '订单管理' } },
      { path: 'categories', name: 'categories', component: () => import('../views/CategoryList.vue'), meta: { title: '分类管理' } },
      { path: 'dishes', name: 'dishes', component: () => import('../views/DishList.vue'), meta: { title: '菜品管理' } },
      { path: 'setmeals', name: 'setmeals', component: () => import('../views/SetmealList.vue'), meta: { title: '套餐管理' } },
      { path: 'employees', name: 'employees', component: () => import('../views/EmployeeList.vue'), meta: { title: '员工管理' } }
    ]
  },
  { path: '/:pathMatch(.*)*', redirect: '/dashboard' }
]

const router = createRouter({ history: createWebHashHistory(), routes })

router.beforeEach((to) => {
  if (to.name !== 'login' && !getToken()) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }
  if (to.meta.title) document.title = `${to.meta.title} · 东华食堂管理端`
  return true
})

export default router
