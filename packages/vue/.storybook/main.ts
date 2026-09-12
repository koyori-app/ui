import type { StorybookConfig } from '@storybook/vue3-vite';

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(ts|tsx)'],
  addons: ['@storybook/addon-a11y', '@storybook/addon-docs'],
  framework: {
    name: '@storybook/vue3-vite',
    options: {
      builder: { viteConfigPath: false },
      docgen: 'vue-component-meta',
    },
  },
  core: { disableTelemetry: true },
};

export default config;
