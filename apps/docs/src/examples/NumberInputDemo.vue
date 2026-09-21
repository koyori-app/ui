<script setup lang="ts">
import { ref } from 'vue';
import { Field, Input } from '@koyori-app/ui-vue';
import '@koyori-app/ui-vue/style.css';

const draft = ref('0');
const value = ref<number | null>(0);
const error = ref('');
function change(text: string) { draft.value = text; error.value = ''; }
function commit(number: number | null) { value.value = number; error.value = ''; }
</script>

<template>
  <div style="max-width: 360px">
    <Field id="vue-progress-input" label="進捗率" description="0〜100の整数。空欄は未設定です。" :error="error">
      <Input type="number" :min="0" :max="100" :step="1" :value="draft"
        :on-value-change="change" :on-number-commit="commit" :on-number-invalid="(message) => error = message" />
    </Field>
    <p>確定値: {{ value === null ? '未設定' : `${value}%` }}</p>
  </div>
</template>
