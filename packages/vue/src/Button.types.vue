<script setup lang="ts">
import { Button, type ButtonProps } from './index';

const labeled: ButtonProps = { label: 'Save' };
const iconOnly: ButtonProps = { ariaLabel: 'More actions' };
// @ts-expect-error A button must have an accessible name.
const unnamed: ButtonProps = { variant: 'ghost' };
</script>

<template>
  <Button label="Save" />
  <Button ariaLabel="More actions" />
  <!-- @vue-expect-error A button must have an accessible name. -->
  <Button variant="ghost" />
</template>
