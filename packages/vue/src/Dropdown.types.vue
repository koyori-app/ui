<script setup lang="ts">
import { Dropdown, type DropdownItem, type DropdownProps } from './index';

const labeled: DropdownProps = { label: '操作', items: [] };
const iconOnly: DropdownProps = { ariaLabel: 'タスクの操作', items: [] };
// @ts-expect-error A menu button must have an accessible name.
const unnamed: DropdownProps = { items: [] };
const withIcon: DropdownItem = { value: 'doing', label: '進行中', kind: 'radio', checked: true, icon: '#3b82f6' };
</script>

<template>
  <Dropdown label="操作" :items="[]" />
  <Dropdown ariaLabel="タスクの操作" :items="[]" />
  <!-- @vue-expect-error A menu button must have an accessible name. -->
  <Dropdown :items="[]" />
  <Dropdown label="ステータス" :items="[withIcon]">
    <template #item-icon="{ item }"><span :style="{ color: item.icon }" /></template>
  </Dropdown>
</template>
