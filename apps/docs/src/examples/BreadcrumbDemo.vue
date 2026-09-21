<script setup lang="ts">
import { computed, ref } from 'vue';
import { Breadcrumb } from '@koyori-app/ui-vue';
import '@koyori-app/ui-vue/style.css';

const pages = [
  { label: 'プロジェクト', href: '/projects' },
  { label: 'Koyori UI', href: '/projects/ui' },
  { label: 'コンポーネント', href: '/projects/ui/components' },
  { label: 'Breadcrumb', href: '/projects/ui/components/breadcrumb' },
];

const depth = ref(pages.length);
const items = computed(() => pages.slice(0, depth.value).map((page, index) =>
  index === depth.value - 1 ? { label: page.label } : page));

// Breadcrumb は遷移を持たない。クリックを親で受けてアプリのルーターに渡す。
function navigate(event: MouseEvent) {
  const link = (event.target as HTMLElement).closest('a');
  if (!link) return;
  event.preventDefault();
  depth.value = pages.findIndex((page) => page.href === link.getAttribute('href')) + 1;
}
</script>

<template>
  <div style="display: grid; gap: 12px" @click="navigate">
    <Breadcrumb :items="items" />
    <p style="margin: 0">表示中のページ: {{ pages[depth - 1].label }}</p>
  </div>
</template>
