import { Dropdown, type DropdownProps } from './index';

const labeled: DropdownProps = { label: '操作', items: [] };
const iconOnly: DropdownProps = { ariaLabel: 'タスクの操作', items: [] };
// @ts-expect-error A menu button must have an accessible name.
const unnamed: DropdownProps = { items: [] };

<Dropdown {...labeled} />;
<Dropdown {...iconOnly} />;
// @ts-expect-error Enforce the contract at the JSX call site too.
<Dropdown items={[]} />;
