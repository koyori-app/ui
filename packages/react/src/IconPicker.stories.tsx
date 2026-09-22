import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { IconPicker } from './index';

const emojis = ['🌱', '📘', '🛠️', '🎯', '🚀', '🧪'];
const sample = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" fill="%23c4b5df"/></svg>';

const meta = {
  title: 'Components/IconPicker',
  component: IconPicker,
  parameters: { layout: 'padded' },
  args: { label: 'プロジェクトのアイコン', emojis },
  render: args => <div style={{ width: 320 }}><IconPicker {...args} /></div>,
} satisfies Meta<typeof IconPicker>;

export default meta;
type Story = StoryObj<typeof meta>;

/* 選択も画像もアプリ側が持つ。ここでは受け取った通知を反映するだけ。 */
function Example(args: React.ComponentProps<typeof IconPicker>) {
  const [emoji, setEmoji] = useState(args.emoji);
  const [imageUrl, setImageUrl] = useState(args.imageUrl);
  const [picked, setPicked] = useState('なし');
  return <div style={{ display: 'grid', gap: 12, width: 320 }}>
    <IconPicker {...args} emoji={emoji} imageUrl={imageUrl}
      onEmojiChange={value => { setEmoji(value); setImageUrl(undefined); }}
      onImageSelect={file => { setPicked(`${file.name} / ${file.type}`); setImageUrl(sample); }}
      onImageRemove={() => setImageUrl(undefined)} />
    <p>選んだファイル: <output>{picked}</output></p>
  </div>;
}

export const Default: Story = { args: { emoji: '📘' }, render: args => <Example {...args} /> };
export const WithImage: Story = { args: { emoji: '📘', imageUrl: sample }, render: args => <Example {...args} /> };
export const ImageError: Story = { args: { emoji: '📘', imageUrl: '/koyori-missing-icon.png' }, render: args => <Example {...args} /> };
export const Disabled: Story = { args: { emoji: '📘', disabled: true } };

/* 折り返しが起きる数で、↑ ↓ の移動を確かめる。 */
export const ManyEmojis: Story = {
  args: { emoji: '🍎', emojis: ['🌱', '📘', '🛠️', '🎯', '🚀', '🧪', '🍎', '🍊', '🍋', '🍇', '🍓', '🍑', '🥝', '🍍'] },
  render: args => <Example {...args} />,
};
