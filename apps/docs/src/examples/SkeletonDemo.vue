<script setup lang="ts">
import { ref } from 'vue';
import { Avatar, Checkbox, Skeleton } from '@koyori-app/ui-vue';
import '@koyori-app/ui-vue/style.css';

const loading = ref(true);
</script>

<template>
  <div style="display: grid; gap: 12px; max-width: 360px">
    <Checkbox label="読み込み中" :checked="loading" :on-checked-change="(checked) => (loading = checked)" />
    <div :aria-busy="loading ? 'true' : undefined"
      style="display: grid; gap: 12px; padding: 16px; border: 1px solid var(--koyori-color-border); border-radius: 12px">
      <!-- 常設の live region。読み上げは Skeleton ではなくこちらが担う。 -->
      <p role="status" style="margin: 0; font-size: 0.875rem">{{ loading ? 'プロフィールを読み込み中' : '' }}</p>
      <template v-if="loading">
        <div style="display: flex; gap: 12px; align-items: center">
          <Skeleton width="40px" height="40px" radius="50%" />
          <Skeleton width="120px" height="16px" />
        </div>
        <Skeleton :lines="3" />
      </template>
      <template v-else>
        <div style="display: flex; gap: 12px; align-items: center">
          <Avatar name="山田 太郎" :size="40" />
          <span>山田 太郎</span>
        </div>
        <p style="margin: 0">
          2025 年 4 月からタスク管理チームの担当です。週次の棚卸しと、アクセシビリティ検証の進行を受け持っています。
        </p>
      </template>
    </div>
  </div>
</template>
