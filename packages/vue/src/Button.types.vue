<script setup lang="ts">
import { Button, type ButtonProps } from './index';

const labeled: ButtonProps = { label: 'Save' };
const iconOnly: ButtonProps = { ariaLabel: 'More actions' };
// @ts-expect-error A button must have an accessible name.
const unnamed: ButtonProps = { variant: 'ghost' };
const dangerText: ButtonProps = { label: 'Withdraw', variant: 'ghost', tone: 'danger' };
const link: ButtonProps = { label: 'Open on GitHub', href: 'https://github.com', target: '_blank', rel: 'noopener' };
// @ts-expect-error tone is default or danger.
const unknownTone: ButtonProps = { label: 'Save', tone: 'warning' };
// @ts-expect-error target is _blank or _self.
const unknownTarget: ButtonProps = { label: 'Open', href: '/', target: '_parent' };
</script>

<template>
  <Button label="Save" />
  <Button ariaLabel="More actions" />
  <!-- @vue-expect-error A button must have an accessible name. -->
  <Button variant="ghost" />
  <Button label="Withdraw" variant="ghost" tone="danger" />
  <Button label="Open on GitHub" href="https://github.com" target="_blank" />
  <!-- @vue-expect-error tone is default or danger. -->
  <Button label="Save" tone="warning" />
</template>
