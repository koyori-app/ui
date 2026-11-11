// ユーティリティクラスは部品から読み込まれないため、Storybook では明示的に読み込む。
import '../src/generated/components/shared/utilities.css';
import '../src/generated/components/Mention/mention.css';
import type { Preview } from '@storybook/react-vite';

const preview: Preview = {
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
};

export default preview;
