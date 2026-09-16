<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import { Button, CheckIcon, Drawer, EllipsisIcon, MenuIcon, Sidebar, SidebarLink } from '@koyori-app/ui-vue';
import '@koyori-app/ui-vue/style.css';

// サーバー描画では広い画面として扱い、マウント後に実際の幅へ合わせる。
const narrow = ref(false);
const open = ref(true);
let media: MediaQueryList | undefined;

// 狭くなったら閉じ、広くなったら常時表示に戻す。
const sync = () => {
  narrow.value = media!.matches;
  open.value = !narrow.value;
};

onMounted(() => {
  media = matchMedia('(max-width: 768px)');
  sync();
  media.addEventListener('change', sync);
});
onUnmounted(() => media?.removeEventListener('change', sync));
</script>

<template>
  <div style="display: flex; gap: 12px; height: 320px">
    <Drawer :modal="narrow" :open="open" label="メニュー" :on-close="() => open = false">
      <Sidebar id="responsive-nav-vue" label="メインナビゲーション" :open="open">
        <SidebarLink label="概要" href="#responsive-overview" current><template #icon><CheckIcon /></template></SidebarLink>
        <SidebarLink label="受信トレイ" href="#responsive-inbox" badge="4"><template #icon><EllipsisIcon /></template></SidebarLink>
      </Sidebar>
    </Drawer>
    <div style="flex: 1; min-width: 0">
      <Button ariaLabel="メニュー" variant="ghost" :aria-expanded="open" aria-controls="responsive-nav-vue"
        :on-click="() => open = !open"><template #icon><MenuIcon /></template></Button>
      <p>{{ narrow ? '狭い画面: ハンバーガーで開くモーダル' : '広い画面: 常時表示' }}</p>
    </div>
  </div>
</template>
