import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
// 只注册模板与按钮实际用到的图标，避免把整套图标打进首屏包
import {
  ArrowDown,
  Box,
  Dish,
  List,
  Menu,
  Odometer,
  Refresh,
  Search,
  Tickets,
  User
} from '@element-plus/icons-vue'
import 'element-plus/dist/index.css'
import './styles/app.css'

import App from './App.vue'
import router from './router'

const app = createApp(App)
const icons = { ArrowDown, Box, Dish, List, Menu, Odometer, Refresh, Search, Tickets, User }
for (const [name, comp] of Object.entries(icons)) {
  app.component(name, comp)
}
app.use(createPinia())
app.use(router)
app.use(ElementPlus, { locale: zhCn })
app.mount('#app')
