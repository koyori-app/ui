<script setup lang="ts">
import { ref } from 'vue';
import { Field, PasswordInput } from '@koyori-app/ui-vue';
import '@koyori-app/ui-vue/style.css';

// 値は利用側が持つ。表示の切り替えは PasswordInput に任せる（visible を渡せば親が持てる）。
const current = ref('');
const next = ref('');
</script>

<template>
  <div style="display: grid; gap: 16px; max-width: 360px">
    <Field id="password-input-demo-current" label="現在のパスワード">
      <PasswordInput autocomplete="current-password" :value="current" :on-value-change="(value) => (current = value)" />
    </Field>
    <Field id="password-input-demo-new" label="新しいパスワード" description="12 文字以上を推奨します。">
      <PasswordInput autocomplete="new-password" :value="next" :on-value-change="(value) => (next = value)" />
    </Field>
  </div>
</template>
