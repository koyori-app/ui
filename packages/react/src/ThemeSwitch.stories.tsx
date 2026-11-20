import type { Decorator, Meta, StoryObj } from '@storybook/react-vite';
import { ThemePicker, ThemeSwitch, setTheme, type Theme } from './index';

/* 保持した選択を story ごとに決める。アプリでは <head> の themeScript がこの役をする。 */
const stored = (theme: Theme): Decorator => (Story) => { setTheme(theme); return <Story />; };

const meta = {
  title: 'Components/ThemeSwitch',
  component: ThemeSwitch,
  /* 3 つの story が setTheme を奪い合うため、Docs ページには並べない。 */
  tags: ['!autodocs'],
  parameters: { layout: 'fullscreen' },
  args: { label: 'ダークテーマ' },
  render: args => (
    <div style={{ minHeight: '100vh', boxSizing: 'border-box', background: 'var(--koyori-color-surface)', color: 'var(--koyori-color-text)', font: 'var(--koyori-font-size-sm)/var(--koyori-line-height-sm) var(--koyori-font-family)' }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 48, padding: '0 16px', borderBottom: '1px solid var(--koyori-color-border)' }}>
        <strong>koyori</strong>
        <ThemeSwitch {...args} />
      </header>
      <div style={{ padding: 24 }}>
        <p style={{ margin: '0 0 12px' }}>スイッチと下の ThemePicker は、同じ選択を表示します。</p>
        <ThemePicker label="テーマ" />
      </div>
    </div>
  ),
} satisfies Meta<typeof ThemeSwitch>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { decorators: [stored('system')] };
export const Light: Story = { decorators: [stored('light')] };
export const Dark: Story = { decorators: [stored('dark')] };
