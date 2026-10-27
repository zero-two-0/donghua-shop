<template>
  <div class="page">
    <van-nav-bar :title="isEdit ? '编辑地址' : '新增地址'" left-arrow fixed placeholder @click-left="router.back()" />

    <van-form @submit="onSubmit">
      <van-cell-group inset class="block">
        <van-field v-model="form.consignee" label="收货人" placeholder="请输入收货人姓名" :rules="[{ required: true, message: '请填写收货人' }]" />
        <van-field
          v-model="form.phone"
          label="手机号"
          type="tel"
          maxlength="11"
          placeholder="请输入 11 位手机号"
          :rules="[{ pattern: /^1\d{10}$/, message: '手机号格式不正确' }]"
        />
        <van-field v-model="form.districtName" label="区域" placeholder="如：松江区" />
        <van-field v-model="form.detail" label="详细地址" type="textarea" rows="2" placeholder="宿舍楼/教学楼 + 门牌号" :rules="[{ required: true, message: '请填写详细地址' }]" />
        <van-field v-model="form.label" label="标签" placeholder="宿舍 / 教学楼 / 办公室" maxlength="10" />
        <van-field v-model="form.sex" label="性别" placeholder="1 男 / 2 女" maxlength="1" />
        <van-cell v-if="!isEdit" title="说明" label="新增后可在地址列表里设为默认地址" />
      </van-cell-group>

      <div class="submit-wrap">
        <van-button round block type="primary" native-type="submit" :loading="submitting">保存</van-button>
      </div>
    </van-form>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showToast } from 'vant'
import { addressApi } from '../api/user'

const route = useRoute()
const router = useRouter()
const submitting = ref(false)

const isEdit = computed(() => Boolean(route.params.id))
const form = reactive({
  id: null,
  consignee: '',
  phone: '',
  sex: '1',
  provinceCode: '310000',
  provinceName: '上海市',
  cityCode: '310100',
  cityName: '上海市',
  districtCode: '310118',
  districtName: '松江区',
  detail: '',
  label: '学校'
})

async function loadDetail() {
  if (!isEdit.value) return
  try {
    const target = await addressApi.detail(route.params.id)
    if (target) Object.assign(form, target)
  } catch (e) {
    showToast(e.message || '地址加载失败')
  }
}

async function onSubmit() {
  submitting.value = true
  try {
    if (isEdit.value) {
      await addressApi.update({ ...form, id: Number(route.params.id) })
    } else {
      const { id, ...payload } = form
      await addressApi.create(payload)
    }
    showToast({ type: 'success', message: '保存成功' })
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : null
    router.replace(redirect || '/addresses')
  } catch (e) {
    showToast(e.message || '保存失败')
  } finally {
    submitting.value = false
  }
}

onMounted(loadDetail)
</script>

<style scoped>
.block { margin-top: 12px; }
.submit-wrap { padding: 20px 16px; }
</style>
