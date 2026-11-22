<script setup lang="ts">
import { ref } from 'vue';
import { Button } from '@koyori-app/ui-vue';
import '@koyori-app/ui-vue/style.css';

const disabled = ref(false);
const clicks = ref(0);
const variants = ['primary', 'secondary', 'tertiary', 'ghost'] as const;
</script>

<template>
  <div>
    <div style="display: flex; flex-wrap: wrap; gap: 12px">
      <Button
        v-for="variant in variants"
        :key="variant"
        :label="variant[0].toUpperCase() + variant.slice(1)"
        :variant="variant"
        :disabled="disabled"
        :on-click="() => clicks++"
      />
    </div>
    <div style="display: flex; flex-wrap: wrap; gap: 12px; margin-top: 12px">
      <Button label="取り下げる…" variant="ghost" tone="danger" :disabled="disabled" :on-click="() => clicks++" />
      <Button label="取り下げる…" variant="tertiary" tone="danger" :disabled="disabled" :on-click="() => clicks++" />
      <Button label="GitHub で開く" variant="tertiary" href="https://github.com/koyori-app/ui" target="_blank" :disabled="disabled" />
    </div>
    <p><label><input v-model="disabled" type="checkbox" /> 無効にする</label></p>
    <p role="status">クリック回数: {{ clicks }}</p>
  </div>
</template>
