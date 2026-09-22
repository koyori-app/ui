<script setup lang="ts">
import { ref } from 'vue';
import { IconPicker } from '@koyori-app/ui-vue';
import '@koyori-app/ui-vue/style.css';

const emojis = ['🌱', '📘', '🛠️', '🎯', '🚀', '🧪', '🍎', '🗂️'];
const emoji = ref('📘');
const imageUrl = ref<string | undefined>(undefined);
const message = ref('');

function change(value: string) {
  emoji.value = value;
  imageUrl.value = undefined;
  message.value = '';
}

// MIME とサイズの検証、アップロード、保存はアプリ側の責務。ここでは受け取るだけ。
function select(file: File) {
  if (!file.type.startsWith('image/')) { message.value = '画像ファイルを選んでください。'; return; }
  if (file.size > 1024 * 1024) { message.value = '1MB 以下の画像を選んでください。'; return; }
  message.value = `${file.name} を選びました。`;
  imageUrl.value = URL.createObjectURL(file);
}

function remove() {
  imageUrl.value = undefined;
  message.value = '画像を削除しました。';
}
</script>

<template>
  <div style="display: grid; gap: 12px; max-width: 360px">
    <IconPicker label="プロジェクトのアイコン" :emojis="emojis" :emoji="emoji" :image-url="imageUrl"
      :on-emoji-change="change" :on-image-select="select" :on-image-remove="remove" />
    <p role="status" style="margin: 0">{{ message }}</p>
  </div>
</template>
