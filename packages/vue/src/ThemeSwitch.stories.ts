import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { ThemePicker, ThemeSwitch, setTheme, type Theme } from './index';

/* 保持した選択を story ごとに決める。アプリでは <head> の themeScript がこの役をする。 */
const stored = (theme: Theme) => () => { setTheme(theme); return { template: '<story />' }; };

const meta = {
  title: 'Components/ThemeSwitch',
  component: ThemeSwitch,
  /* 3 つの story が setTheme を奪い合うため、Docs ページには並べない。 */
  tags: ['!autodocs'],
  parameters: { layout: 'fullscreen' },
  args: { label: 'ダークテーマ' },
  render: args => ({
    components: { ThemePicker, ThemeSwitch },
    setup: () => ({ args }),
    template: `<div style="min-height: 100vh; box-sizing: border-box; background: var(--koyori-color-surface); color: var(--koyori-color-text); font: var(--koyori-font-size-sm)/var(--koyori-line-height-sm) var(--koyori-font-family)">
      <header style="display: flex; align-items: center; justify-content: space-between; height: 48px; padding: 0 16px; border-bottom: 1px solid var(--koyori-color-border)">
        <strong>koyori</strong>
        <ThemeSwitch v-bind="args" />
      </header>
      <div style="padding: 24px">
        <p style="margin: 0 0 12px">スイッチと下の ThemePicker は、同じ選択を表示します。</p>
        <ThemePicker label="テーマ" />
      </div>
    </div>`,
  }),
} satisfies Meta<typeof ThemeSwitch>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { decorators: [stored('system')] };
export const Light: Story = { decorators: [stored('light')] };
export const Dark: Story = { decorators: [stored('dark')] };
