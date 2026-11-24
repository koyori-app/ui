import { Dropdown, type DropdownItem, type DropdownProps } from './index';

const labeled: DropdownProps = { label: '操作', items: [] };
const iconOnly: DropdownProps = { ariaLabel: 'タスクの操作', items: [] };
// @ts-expect-error A menu button must have an accessible name.
const unnamed: DropdownProps = { items: [] };
const withIcon: DropdownItem = { value: 'doing', label: '進行中', kind: 'radio', checked: true, icon: <svg /> };

<Dropdown {...labeled} />;
<Dropdown {...iconOnly} />;
// @ts-expect-error Enforce the contract at the JSX call site too.
<Dropdown items={[]} />;
<Dropdown label="ステータス" items={[withIcon]} />;
