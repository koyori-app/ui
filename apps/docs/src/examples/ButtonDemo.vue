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
    <p><label><input v-model="disabled" type="checkbox" /> 無効にする</label></p>
    <p role="status">クリック回数: {{ clicks }}</p>
  </div>
</template>
