<script setup lang="ts">
import { ref } from 'vue';
import { Field, Switch } from '@koyori-app/ui-vue';
import '@koyori-app/ui-vue/style.css';

const notify = ref(true);
const digest = ref(false);
</script>

<template>
  <div style="display: grid; gap: 16px; max-width: 420px">
    <Switch label="メール通知" :checked="notify" :on-checked-change="(next) => (notify = next)" />
    <Field id="switch-demo-digest" label="週次ダイジェスト" description="毎週月曜の朝にまとめて届きます。">
      <Switch label="週次ダイジェスト" hide-label :checked="digest" :on-checked-change="(next) => (digest = next)" />
    </Field>
    <p role="status" style="margin: 0">
      メール通知: {{ notify ? '有効' : '無効' }} / 週次ダイジェスト: {{ digest ? '有効' : '無効' }}
    </p>
  </div>
</template>
