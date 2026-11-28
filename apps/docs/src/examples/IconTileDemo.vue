<script setup lang="ts">
import { IconTile } from '@koyori-app/ui-vue';
import '@koyori-app/ui-vue/style.css';

const image = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect width="80" height="80" fill="#3b82f6"/><circle cx="40" cy="40" r="20" fill="#fbbf24"/></svg>')}`;
</script>

<template>
  <!-- タイルは読み上げから外れるので、名前は隣の文字や包む側の aria-label で伝える。 -->
  <ul style="display: flex; gap: 16px; margin: 0; padding: 0; list-style: none">
    <li style="display: flex; align-items: center; gap: 8px"><IconTile name="Acme" :src="image" />Acme</li>
    <li style="display: flex; align-items: center; gap: 8px"><IconTile name="お茶会" emoji="🍵" />お茶会</li>
    <li style="display: flex; align-items: center; gap: 8px"><IconTile name="𠮷野商店" />𠮷野商店</li>
    <li style="display: flex; align-items: center; gap: 8px"><IconTile name="小さい" emoji="🌿" :size="24" />24px</li>
  </ul>
</template>
