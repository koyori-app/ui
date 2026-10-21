<script setup lang="ts">
import { ref } from 'vue';
import { Button, EyeIcon, EyeOffIcon, Field, Input } from '@koyori-app/ui-vue';
import '@koyori-app/ui-vue/style.css';

const visible = ref(false);
const value = ref('');
const group = ref<HTMLDivElement | null>(null);

// type を変えると選択が失われるため、位置を控えて描画後に戻す。
function toggle() {
  const input = group.value?.querySelector('input');
  const start = input?.selectionStart ?? null;
  const end = input?.selectionEnd ?? null;
  visible.value = !visible.value;
  requestAnimationFrame(() => {
    if (!input || start === null || end === null) return;
    input.focus();
    input.setSelectionRange(start, end);
  });
}
</script>

<template>
  <div ref="group" style="display: grid; gap: 12px; max-width: 360px">
    <Field id="password-demo" label="パスワード" description="8 文字以上で入力してください。">
      <Input :type="visible ? 'text' : 'password'" :value="value" autocomplete="current-password"
        :on-value-change="(next) => (value = next)">
        <template #suffix>
          <Button variant="ghost" ariaLabel="パスワードを表示" :ariaPressed="visible ? 'true' : 'false'" :on-click="toggle">
            <template #icon><EyeOffIcon v-if="visible" /><EyeIcon v-else /></template>
          </Button>
        </template>
      </Input>
    </Field>
    <Field id="amount-demo" label="金額">
      <Input type="number" :min="0">
        <template #prefix>¥</template>
        <template #suffix>円</template>
      </Input>
    </Field>
  </div>
</template>
