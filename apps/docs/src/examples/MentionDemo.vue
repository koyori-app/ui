<script setup lang="ts">
import { Mention } from '@koyori-app/ui-vue';
import '@koyori-app/ui-vue/style.css';

const photo = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 2 2'><rect width='2' height='2' fill='%23c4b5df'/><circle cx='1' cy='0.75' r='0.45' fill='%23faf8f5'/><circle cx='1' cy='2.1' r='0.85' fill='%23faf8f5'/></svg>";

// 右の列は、利用側が HTML に書く形。
const cases = [
  { name: 'member', label: '@aki', avatar: { name: 'aki' },
    html: '<span class="koyori-mention koyori-mention-member"><span class="koyori-mention-avatar" data-initials="a" aria-hidden="true"></span><span class="koyori-mention-label">@aki</span></span>' },
  { name: 'member（画像・リンク）', label: '@taro', href: '#', avatar: { name: 'taro', src: photo },
    html: `<a class="koyori-mention koyori-mention-member" href="#"><span class="koyori-mention-avatar" data-initials="t" aria-hidden="true"><img src="${photo}" alt=""></span><span class="koyori-mention-label">@taro</span></a>` },
  { name: 'self', label: '@aki', self: true, avatar: { name: 'aki' },
    html: '<span class="koyori-mention koyori-mention-member koyori-mention-self"><span class="koyori-mention-avatar" data-initials="a" aria-hidden="true"></span><span class="koyori-mention-label">@aki</span></span>' },
  { name: 'outside', label: '@hanako', status: 'outside' as const, avatar: { name: 'hanako' },
    html: '<span class="koyori-mention koyori-mention-outside"><span class="koyori-mention-avatar" data-initials="h" aria-hidden="true"></span><span class="koyori-mention-label">@hanako</span></span>' },
  { name: 'gone', label: '@（退会した利用者）', status: 'gone' as const,
    html: '<span class="koyori-mention koyori-mention-gone"><span class="koyori-mention-label">@（退会した利用者）</span></span>' },
  { name: 'unknown', label: '@（不明な利用者）', status: 'unknown' as const,
    html: '<span class="koyori-mention koyori-mention-unknown"><span class="koyori-mention-label">@（不明な利用者）</span></span>' },
];
</script>

<template>
  <div style="display: grid; grid-template-columns: auto auto auto; gap: 12px 24px; align-items: center; justify-content: start">
    <strong>状態</strong><strong>部品</strong><strong>固定 class の HTML</strong>
    <template v-for="item in cases" :key="item.name">
      <span>{{ item.name }}</span>
      <span><Mention :label="item.label" :status="item.status" :self="item.self" :avatar="item.avatar" :href="item.href" /></span>
      <span v-html="item.html"></span>
    </template>
  </div>
</template>
