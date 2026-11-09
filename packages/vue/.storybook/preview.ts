import '@fontsource-variable/inter';
import '@fontsource-variable/noto-sans-jp';
// ユーティリティクラスは部品から読み込まれないため、Storybook では明示的に読み込む。
import '../src/generated/components/shared/utilities.css';
import type { Preview } from '@storybook/vue3-vite';

const preview: Preview = {
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  globalTypes: {
    theme: {
      description: 'テーマ',
      toolbar: { title: 'Theme', icon: 'mirror', items: ['light', 'dark'], dynamicTitle: true },
    },
  },
  initialGlobals: { theme: 'light' },
  decorators: [
    (story, context) => {
      // ダークは祖先の data-theme で切り替わる。centered レイアウトの地色もテーマに合わせる。
      document.documentElement.dataset.theme = context.globals.theme;
      document.body.style.background = 'var(--koyori-color-surface)';
      document.body.style.color = 'var(--koyori-color-text)';
      return story();
    },
  ],
};

export default preview;
