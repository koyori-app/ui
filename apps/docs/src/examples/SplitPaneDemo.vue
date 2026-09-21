<script setup lang="ts">
import { ref } from 'vue';
import { Button, SplitPane } from '@koyori-app/ui-vue';
import '@koyori-app/ui-vue/style.css';
const size = ref(240);
</script>

<template>
  <div>
    <p>一覧の希望幅: {{ Math.round(size) }}px。境界はドラッグ、← / →、Home / End で動かせます。</p>
    <div style="height: 240px; border: 1px solid var(--koyori-color-border)">
      <SplitPane label="タスク一覧" primary-id="docs-vue-tasks" aria-labelled-by="docs-vue-tasks-title"
        :size="size" :min-size="160" :min-secondary-size="160" :on-size-change="value => size = value">
        <template #primary><section style="padding: 16px"><h3 id="docs-vue-tasks-title">タスク一覧</h3><Button label="期限を確認する" variant="ghost" /></section></template>
        <template #secondary><section style="padding: 16px"><h3>詳細</h3><p>日程と担当者を確認します。</p><Button label="詳細を開く" variant="secondary" /></section></template>
      </SplitPane>
    </div>
  </div>
</template>
