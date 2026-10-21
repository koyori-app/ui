<script setup lang="ts">
import { computed, ref } from 'vue';
import { Field, Input, Meter } from '@koyori-app/ui-vue';
import '@koyori-app/ui-vue/style.css';

const password = ref('');
// 長さだけの簡易判定。実際の判定はアプリ側で行う。
const level = computed(() => {
  const length = password.value.length;
  return length === 0 ? 0 : length < 8 ? 1 : length < 12 ? 2 : 3;
});
const text = computed(() => ['未入力', '弱い', '普通', '強い'][level.value]);
</script>

<template>
  <div style="display: grid; gap: 8px; max-width: 360px">
    <Field id="meter-demo-password" label="新しいパスワード" description="12 文字以上で「強い」になります。">
      <Input type="password" autocomplete="new-password" :value="password" :on-value-change="(next) => (password = next)" />
    </Field>
    <Meter label="パスワードの強度" :value="level" :value-text="text" />
    <!-- 文は段が変わった時だけ変わるので、打鍵ごとには読み上げない。 -->
    <p role="status" style="position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap">{{ level ? `パスワードの強度: ${text}` : '' }}</p>
  </div>
</template>
