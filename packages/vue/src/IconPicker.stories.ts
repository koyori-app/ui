import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { ref } from 'vue';
import { IconPicker, type IconPickerProps } from './index';

const emojis = ['🌱', '📘', '🛠️', '🎯', '🚀', '🧪'];
const sample = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" fill="%23c4b5df"/></svg>';

/* 選択も画像もアプリ側が持つ。ここでは受け取った通知を反映するだけ。 */
const example = (args: IconPickerProps) => ({
  components: { IconPicker },
  setup() {
    const emoji = ref(args.emoji);
    const imageUrl = ref(args.imageUrl);
    const picked = ref('なし');
    return {
      args, emoji, imageUrl, picked,
      change(value: string) { emoji.value = value; imageUrl.value = undefined; },
      select(file: File) { picked.value = `${file.name} / ${file.type}`; imageUrl.value = sample; },
      remove() { imageUrl.value = undefined; },
    };
  },
  template: `<div style="display: grid; gap: 12px; width: 320px">
    <IconPicker v-bind="args" :emoji="emoji" :image-url="imageUrl"
      :on-emoji-change="change" :on-image-select="select" :on-image-remove="remove" />
    <p>選んだファイル: <output>{{ picked }}</output></p>
  </div>`,
});

const meta = {
  title: 'Components/IconPicker',
  component: IconPicker,
  parameters: { layout: 'padded' },
  args: { label: 'プロジェクトのアイコン', emojis },
  render: args => ({ components: { IconPicker }, setup: () => ({ args }), template: '<div style="width: 320px"><IconPicker v-bind="args" /></div>' }),
} satisfies Meta<typeof IconPicker>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { args: { emoji: '📘' }, render: args => example(args) };
export const WithImage: Story = { args: { emoji: '📘', imageUrl: sample }, render: args => example(args) };
export const ImageError: Story = { args: { emoji: '📘', imageUrl: '/koyori-missing-icon.png' }, render: args => example(args) };
export const Disabled: Story = { args: { emoji: '📘', disabled: true } };

/* 折り返しが起きる数で、↑ ↓ の移動を確かめる。 */
export const ManyEmojis: Story = {
  args: { emoji: '🍎', emojis: ['🌱', '📘', '🛠️', '🎯', '🚀', '🧪', '🍎', '🍊', '🍋', '🍇', '🍓', '🍑', '🥝', '🍍'] },
  render: args => example(args),
};
