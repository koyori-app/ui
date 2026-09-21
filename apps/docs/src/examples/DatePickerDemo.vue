<script setup lang="ts">
import { ref } from 'vue';
import { DatePicker, Field } from '@koyori-app/ui-vue';
import '@koyori-app/ui-vue/style.css';

const date = ref('');
// Fixed calendar dates keep the server and client preview identical.
const presets = [{ label: '今日', value: '2026-12-31' }, { label: '明日', value: '2027-01-01' }];
</script>

<template>
  <div style="max-width: 360px">
    <Field id="vue-due-date" label="期限" description="日付を選ぶか、クリアで未設定にできます。">
      <DatePicker label="期限" :value="date" :on-value-change="value => date = value" locale="ja-JP"
        today="2026-12-31" :presets="presets" />
    </Field>
    <p>選択: {{ date || '未設定' }}</p>
  </div>
</template>
