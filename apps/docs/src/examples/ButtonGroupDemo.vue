<script setup lang="ts">
import { ref } from 'vue';
import { Button, ButtonGroup, EllipsisIcon } from '@koyori-app/ui-vue';
import '@koyori-app/ui-vue/style.css';

const action = ref('未実行');
</script>

<template>
  <div>
    <div style="display: flex; flex-wrap: wrap; gap: 8px">
      <Button label="戻る" variant="tertiary" :on-click="() => action = '戻る'" />
      <ButtonGroup label="整理">
        <Button label="アーカイブ" variant="tertiary" :on-click="() => action = 'アーカイブ'" />
        <Button label="報告" variant="tertiary" :on-click="() => action = '報告'" />
      </ButtonGroup>
      <ButtonGroup label="通知">
        <Button label="スヌーズ" variant="tertiary" :on-click="() => action = 'スヌーズ'" />
        <Button ariaLabel="その他の操作" variant="tertiary" :on-click="() => action = 'その他の操作'">
          <template #icon><EllipsisIcon :size="16" /></template>
        </Button>
      </ButtonGroup>
    </div>
    <p role="status">操作: {{ action }}</p>
  </div>
</template>
