<script setup lang="ts">
import { ref } from 'vue';
import { Button, UserPanel, type UserPanelSection } from '@koyori-app/ui-vue';
import '@koyori-app/ui-vue/style.css';

const items: UserPanelSection[] = [
  { items: [{ value: 'profile', label: 'プロフィール', href: '#使い方' }, { value: 'settings', label: 'アカウントの設定' }] },
  { items: [{ value: 'logout', label: 'ログアウト', destructive: true }] },
];
const message = ref('');
</script>

<template>
  <div style="display: flex; flex-direction: column; justify-content: flex-end; width: 240px; height: 320px">
    <UserPanel name="hanako" description="hanako@example.com" card-label="hanako のプロフィール" :items="items"
      :on-select="(value) => (message = `${value} を選びました`)">
      <template #action>
        <Button ariaLabel="設定" variant="ghost" :on-click="() => (message = '設定を押しました')">
          <template #icon>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3" /><circle cx="12" cy="12" r="9" /></svg>
          </template>
        </Button>
      </template>
    </UserPanel>
    <p style="margin: 8px 0 0" aria-live="polite">{{ message }}</p>
  </div>
</template>
