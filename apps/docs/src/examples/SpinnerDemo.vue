<script setup lang="ts">
import { ref } from 'vue';
import { Spinner } from '@koyori-app/ui-vue';
import '@koyori-app/ui-vue/style.css';

const loading = ref(false);
const comments = ref<string[]>([]);

// 取得の代わりに少し待つ。読み込み中は領域に aria-busy を付け、終わったら外す。
function load() {
  loading.value = true;
  comments.value = [];
  setTimeout(() => {
    comments.value = ['デザインを確認しました。', '来週のリリースに入れます。'];
    loading.value = false;
  }, 1500);
}
</script>

<template>
  <div style="display: grid; gap: 12px; max-width: 360px">
    <button type="button" @click="load">コメントを読み込む</button>
    <div class="koyori-card" :aria-busy="loading ? 'true' : undefined" style="display: grid; place-items: center; min-height: 96px">
      <Spinner v-if="loading" label="コメントを読み込み中" />
      <ul v-else-if="comments.length" style="margin: 0; justify-self: stretch">
        <li v-for="comment in comments" :key="comment">{{ comment }}</li>
      </ul>
      <p v-else style="margin: 0">まだ読み込んでいません。</p>
    </div>
  </div>
</template>
