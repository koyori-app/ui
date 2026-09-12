<script setup lang="ts">
import { ref } from 'vue';
import { Accordion } from '@koyori-app/ui-vue';
import '@koyori-app/ui-vue/style.css';
const opened = ref<string | null>('general');
</script>

<template>
  <div style="max-width: 480px">
    <Accordion id="vue-doc-general" label="ワークスペースについて" :open="opened === 'general'" :on-open-change="open => opened = open ? 'general' : null">
      <p style="margin: 0">プロジェクト、メンバー、通知をひとつの場所で管理できます。</p>
    </Accordion>
    <Accordion id="vue-doc-members" label="メンバーを招待するには？" :open="opened === 'members'" :on-open-change="open => opened = open ? 'members' : null">
      <p style="margin: 0">チームの設定から招待できます。招待した人にはメールが届きます。</p>
    </Accordion>
    <Accordion id="vue-doc-notices" label="通知を変更するには？" :open="opened === 'notices'" :on-open-change="open => opened = open ? 'notices' : null">
      <p style="margin: 0">通知の設定で、受け取りたい更新だけを選べます。</p>
    </Accordion>
  </div>
</template>
