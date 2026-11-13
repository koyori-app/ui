import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { Button, ThemePicker, setTheme, type Theme } from './index';

/* 保持した選択を story ごとに決める。アプリでは <head> の themeScript がこの役をする。 */
const stored = (theme: Theme) => () => { setTheme(theme); return { template: '<story />' }; };

const meta = {
  title: 'Components/ThemePicker',
  component: ThemePicker,
  /* 3 つの story が setTheme を奪い合うため、Docs ページには並べない。 */
  tags: ['!autodocs'],
  parameters: { layout: 'fullscreen' },
  args: { label: 'テーマ' },
  render: args => ({
    components: { Button, ThemePicker },
    setup: () => ({ args }),
    template: `<div style="min-height: 100vh; padding: 24px; box-sizing: border-box; background: var(--koyori-color-surface); color: var(--koyori-color-text); font: var(--koyori-font-size-sm)/var(--koyori-line-height-sm) var(--koyori-font-family)">
      <ThemePicker v-bind="args" />
      <div style="margin-top: 16px; padding: 16px; border: 1px solid var(--koyori-color-border); border-radius: var(--koyori-radius-lg); background: var(--koyori-color-surface-raised)">
        <p style="margin: 0 0 12px">選んだ配色は、このページの面と部品にすぐ反映されます。</p>
        <Button label="保存" /> <Button label="キャンセル" variant="secondary" />
      </div>
    </div>`,
  }),
} satisfies Meta<typeof ThemePicker>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { decorators: [stored('system')] };
export const Light: Story = { decorators: [stored('light')] };
export const Dark: Story = { decorators: [stored('dark')] };
