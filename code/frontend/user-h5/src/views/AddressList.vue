<template>
  <div class="page">
    <van-nav-bar title="收货地址" left-arrow fixed placeholder @click-left="router.back()" />

    <van-loading v-if="loading" class="loading" vertical>加载中...</van-loading>
    <van-empty v-else-if="!list.length" description="还没有收货地址" />

    <van-cell-group v-else inset class="block">
      <van-cell
        v-for="a in list"
        :key="a.id"
        :title="`${a.consignee} ${a.phone}`"
        :label="`${a.districtName || ''}${a.detail}${a.label ? ' · ' + a.label : ''}`"
      >
        <template #value>
          <div class="ops">
            <van-tag v-if="a.isDefault === 1" type="primary">默认</van-tag>
            <van-button v-else size="mini" plain @click="setDefault(a)">设默认</van-button>
            <van-button size="mini" plain @click="edit(a)">编辑</van-button>
            <van-button size="mini" plain type="danger" @click="remove(a)">删除</van-button>
          </div>
        </template>
      </van-cell>
    </van-cell-group>

    <div class="add-row">
      <van-button type="primary" round block icon="plus" @click="create">新增收货地址</van-button>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showConfirmDialog, showToast } from 'vant'
import { addressApi } from '../api/user'

const router = useRouter()
const route = useRoute()
const list = ref([])
const loading = ref(true)

async function load() {
  loading.value = true
  try {
    list.value = (await addressApi.list()) || []
  } catch (e) {
    showToast(e.message || '加载失败')
  } finally {
    loading.value = false
  }
}

function edit(a) {
  router.push(`/addresses/edit/${a.id}`)
}

function create() {
  router.push('/addresses/edit')
}

async function setDefault(a) {
  try {
    await addressApi.setDefault(a.id)
    showToast({ type: 'success', message: '已设为默认地址' })
    await load()
  } catch (e) {
    showToast(e.message || '设置失败')
  }
}

async function remove(a) {
  try {
    await showConfirmDialog({ title: '删除地址', message: `确定删除「${a.detail}」吗？` })
  } catch (e) {
    return
  }
  try {
    await addressApi.remove(a.id)
    showToast('已删除')
    await load()
  } catch (e) {
    showToast(e.message || '删除失败')
  }
}

onMounted(() => {
  load()
  // 从确认订单页跳来新增地址后返回，重新拉取
  if (route.query.redirect) router.replace({ path: route.path })
})
</script>

<style scoped>
.block { margin-top: 12px; }
.ops { display: flex; align-items: center; gap: 6px; justify-content: flex-end; }
.add-row { padding: 20px 16px; }
.loading { padding: 40px 0; }
</style>
