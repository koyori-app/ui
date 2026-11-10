// ユーティリティクラスは部品から読み込まれないため、Storybook では明示的に読み込む。
import '../src/generated/components/shared/utilities.css';
import './preview.css';
import type { Preview } from '@storybook/vue3-vite';
import { themes } from 'storybook/theming';

const preview: Preview = {
  parameters: { layout: 'centered', docs: { theme: themes.dark } },
  tags: ['autodocs'],
  globalTypes: {
    theme: {
      description: '配色',
      toolbar: { icon: 'contrast', items: [{ value: 'dark', title: '墨（ダーク）' }, { value: 'light', title: 'ライト' }], dynamicTitle: true },
    },
  },
  initialGlobals: { theme: 'dark' },
  decorators: [
    (story, context) => {
      document.documentElement.dataset.theme = context.globals.theme;
      return story();
    },
  ],
};

export default preview;
