<script setup lang="ts">
import { Dropdown, type DropdownProps } from './index';

const labeled: DropdownProps = { label: '操作', items: [] };
const iconOnly: DropdownProps = { ariaLabel: 'タスクの操作', items: [] };
// @ts-expect-error A menu button must have an accessible name.
const unnamed: DropdownProps = { items: [] };
</script>

<template>
  <Dropdown label="操作" :items="[]" />
  <Dropdown ariaLabel="タスクの操作" :items="[]" />
  <!-- @vue-expect-error A menu button must have an accessible name. -->
  <Dropdown :items="[]" />
</template>
