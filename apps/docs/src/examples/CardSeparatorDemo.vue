<script setup lang="ts">
import { ref } from 'vue';
import { Button, Field, Input } from '@koyori-app/ui-vue';
import '@koyori-app/ui-vue/style.css';

const email = ref('');
</script>

<template>
  <div class="koyori-card" style="max-width: 360px">
    <h2 class="koyori-card-heading">ログイン</h2>
    <Field id="card-demo-email" label="メールアドレス" description="登録に使ったアドレスを入力してください。">
      <Input type="email" autocomplete="email" :value="email" :on-value-change="(next) => (email = next)" />
    </Field>
    <Field id="card-demo-password" label="パスワード">
      <Input type="password" autocomplete="current-password" />
    </Field>
    <hr class="koyori-separator" />
    <div class="koyori-card-actions">
      <Button variant="tertiary" label="パスワードを忘れた" />
      <Button label="ログイン" />
    </div>
  </div>
</template>
