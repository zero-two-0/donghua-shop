<template>
  <div class="phone-canvas">
    <router-view />

    <van-tabbar v-if="showTabbar" route fixed placeholder>
      <van-tabbar-item to="/home" icon="shop-o">点餐</van-tabbar-item>
      <van-tabbar-item to="/cart" icon="shopping-cart-o" :badge="cart.count || ''">购物车</van-tabbar-item>
      <van-tabbar-item to="/orders" icon="orders-o">订单</van-tabbar-item>
      <van-tabbar-item to="/profile" icon="user-o">我的</van-tabbar-item>
    </van-tabbar>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useCartStore } from './stores/cart'
import { getToken } from './api/http'

const route = useRoute()
const cart = useCartStore()
const showTabbar = computed(() => Boolean(route.meta.tabbar))

onMounted(() => {
  if (getToken()) cart.load().catch(() => {})
})
</script>
