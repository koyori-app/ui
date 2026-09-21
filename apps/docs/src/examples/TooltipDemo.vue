<script setup lang="ts">
import { Button, EllipsisIcon, Tooltip } from '@koyori-app/ui-vue';
import '@koyori-app/ui-vue/style.css';
</script>

<template>
  <div style="display: flex; flex-wrap: wrap; gap: 24px; padding: 24px">
    <Tooltip id="vue-actions-help" content="タスクの移動・複製などを選びます。">
      <Button ariaLabel="その他の操作" variant="tertiary"><template #icon><EllipsisIcon /></template></Button>
    </Tooltip>
    <Tooltip id="vue-title-help" content="今月の全プロジェクトの進捗をまとめたレポート" placement="bottom">
      <a href="#使い方" style="max-width: 180px; overflow: hidden; white-space: nowrap; text-overflow: ellipsis">今月の全プロジェクトの進捗をまとめたレポート</a>
    </Tooltip>
    <Tooltip id="vue-disabled-help" content="削除する権限がありません。">
      <span tabindex="0" role="group" aria-label="削除できない理由">
        <span style="pointer-events: none"><Button label="削除" disabled /></span>
      </span>
    </Tooltip>
  </div>
</template>
