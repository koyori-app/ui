<script setup lang="ts">
import { ref } from 'vue';
import { Avatar, HoverCard } from '@koyori-app/ui-vue';
import '@koyori-app/ui-vue/style.css';

const people: Record<string, { role: string; bio: string }> = {
  hanako: { role: 'デザイナー · プロダクト部', bio: '画面と部品のデザインを担当しています。' },
  yupix: { role: 'エンジニア · 基盤チーム', bio: 'API とビルドの仕組みを見ています。' },
};

// 外の要素を起点にする例。本文は v-html で描くため、メンションは Vue の部品ではない。
const html = '<a class="mention" href="#使い方" data-user="hanako">@hanako</a> と <a class="mention" href="#使い方" data-user="yupix">@yupix</a> がレビューします。';
const body = ref<HTMLElement | null>(null);
const user = ref<string | null>(null);
</script>

<template>
  <div class="demo">
    <div class="line">
      デザインは
      <HoverCard label="hanako のプロフィール">
        <a class="mention" href="#使い方">@hanako</a>
        <template #content>
          <div class="profile">
            <Avatar name="hanako" :size="40" />
            <div><strong>hanako</strong><div class="muted">{{ people.hanako.role }}</div></div>
          </div>
          <div class="bio">{{ people.hanako.bio }}</div>
          <div class="foot"><a href="#使い方">プロフィールを見る →</a><span class="muted">Esc で閉じる</span></div>
        </template>
      </HoverCard>
      が担当します。
    </div>
    <div class="line">
      <span ref="body" v-html="html"></span>
      <HoverCard label="メンションのプロフィール" :container="body" selector="a.mention[data-user]"
        :on-open-change="(open, trigger) => (user = open ? trigger.dataset.user ?? null : null)">
        <template #content>
          <template v-if="user">
            <div class="profile">
              <Avatar :name="user" :size="40" />
              <div><strong>{{ user }}</strong><div class="muted">{{ people[user].role }}</div></div>
            </div>
            <div class="bio">{{ people[user].bio }}</div>
            <div class="foot"><a href="#使い方">プロフィールを見る →</a><span class="muted">Esc で閉じる</span></div>
          </template>
        </template>
      </HoverCard>
    </div>
  </div>
</template>

<style scoped>
.demo { padding: 24px; line-height: 1.8; }
.line { margin: 0 0 8px; }
.demo :deep(.mention) { padding: 0 4px; border-radius: 4px; background: var(--koyori-color-selection); color: var(--koyori-color-text); font-weight: 500; text-decoration: none; }
.demo :deep(.mention:focus-visible), .foot a:focus-visible { outline: var(--koyori-focus-width) solid var(--koyori-focus-color); outline-offset: var(--koyori-focus-offset); }
.profile { display: flex; gap: 10px; align-items: center; padding: 12px 14px 8px; }
.muted { color: var(--koyori-color-text-muted); font-size: 12px; }
.bio { margin: 0; padding: 0 14px 12px; }
.foot { display: flex; justify-content: space-between; align-items: center; padding: 8px 14px; border-top: 1px solid var(--koyori-color-border); }
.foot a { color: var(--koyori-color-text); font-weight: 500; text-decoration: none; }
</style>
