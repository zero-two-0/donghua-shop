<template>
  <div class="page addr-page">
    <van-nav-bar title="收货地址" left-arrow fixed placeholder @click-left="router.back()" />

    <div v-if="loading" class="skeleton-wrap">
      <van-skeleton title :row="2" />
      <van-skeleton title :row="2" style="margin-top: 18px" />
    </div>

    <van-empty v-else-if="!list.length" image="search" description="还没有收货地址">
      <van-button round type="primary" size="small" @click="create">新增地址</van-button>
    </van-empty>

    <div v-else class="list">
      <article v-for="a in list" :key="a.id" class="addr-card" @click="edit(a)">
        <div class="addr-main">
          <div class="line">
            <b>{{ a.consignee }}</b>
            <span class="phone">{{ a.phone }}</span>
            <van-tag v-if="a.isDefault === 1" type="primary" class="tag">默认</van-tag>
            <van-tag v-else-if="a.label" plain class="tag">{{ a.label }}</van-tag>
          </div>
          <p class="detail">{{ (a.districtName || '') + a.detail }}</p>
        </div>
        <div class="ops">
          <van-button v-if="a.isDefault !== 1" size="mini" plain round @click.stop="setDefault(a)">
            设为默认
          </van-button>
          <van-button size="mini" plain round type="danger" @click.stop="remove(a)">删除</van-button>
        </div>
      </article>
    </div>

    <div v-if="list.length" class="add-row">
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
  router.push({ path: '/addresses/edit', query: route.query.redirect ? { redirect: route.query.redirect } : {} })
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

onMounted(load)
</script>

<style scoped>
.addr-page {
  background: var(--bg);
}

.list {
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.addr-card {
  background: #fff;
  border-radius: var(--radius-md);
  padding: 14px;
  box-shadow: var(--shadow-sm);
  cursor: pointer;
}

.line {
  display: flex;
  align-items: center;
  gap: 8px;
}

.line b {
  font-size: 15px;
}

.phone {
  font-size: 12px;
  color: var(--ink-3);
}

.tag {
  margin-left: auto;
}

.detail {
  margin: 6px 0 0;
  font-size: 13px;
  color: var(--ink-2);
  line-height: 1.5;
}

.ops {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid var(--line);
}

.add-row {
  padding: 8px 16px calc(24px + env(safe-area-inset-bottom));
}
</style>
