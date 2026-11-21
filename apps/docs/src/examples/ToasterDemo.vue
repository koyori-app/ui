<script setup lang="ts">
import { Toaster, toast } from '@koyori-app/ui-vue';
import '@koyori-app/ui-vue/style.css';
</script>

<template>
  <div style="display: flex; flex-wrap: wrap; gap: 8px">
    <button type="button" @click="toast.success('保存しました。')">保存</button>
    <button type="button"
      @click="toast.success('タスクを作成しました。', { action: { label: 'タスクを開く', href: '#' } })">作成</button>
    <button type="button" @click="toast.error('保存できませんでした。時間をおいて試してください。')">失敗</button>
    <Toaster />
  </div>
</template>
