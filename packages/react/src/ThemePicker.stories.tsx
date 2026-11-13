import type { Decorator, Meta, StoryObj } from '@storybook/react-vite';
import { Button, ThemePicker, setTheme, type Theme } from './index';

/* 保持した選択を story ごとに決める。アプリでは <head> の themeScript がこの役をする。 */
const stored = (theme: Theme): Decorator => (Story) => { setTheme(theme); return <Story />; };

const meta = {
  title: 'Components/ThemePicker',
  component: ThemePicker,
  /* 3 つの story が setTheme を奪い合うため、Docs ページには並べない。 */
  tags: ['!autodocs'],
  parameters: { layout: 'fullscreen' },
  args: { label: 'テーマ' },
  render: args => (
    <div style={{ minHeight: '100vh', padding: 24, boxSizing: 'border-box', background: 'var(--koyori-color-surface)', color: 'var(--koyori-color-text)', font: 'var(--koyori-font-size-sm)/var(--koyori-line-height-sm) var(--koyori-font-family)' }}>
      <ThemePicker {...args} />
      <div style={{ marginTop: 16, padding: 16, border: '1px solid var(--koyori-color-border)', borderRadius: 'var(--koyori-radius-lg)', background: 'var(--koyori-color-surface-raised)' }}>
        <p style={{ margin: '0 0 12px' }}>選んだ配色は、このページの面と部品にすぐ反映されます。</p>
        <Button label="保存" /> <Button label="キャンセル" variant="secondary" />
      </div>
    </div>
  ),
} satisfies Meta<typeof ThemePicker>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { decorators: [stored('system')] };
export const Light: Story = { decorators: [stored('light')] };
export const Dark: Story = { decorators: [stored('dark')] };
