import { Button, type ButtonProps } from './index';

const labeled: ButtonProps = { label: 'Save' };
const iconOnly: ButtonProps = { ariaLabel: 'More actions' };
// @ts-expect-error A button must have an accessible name.
const unnamed: ButtonProps = { variant: 'ghost' };

<Button {...labeled} />;
<Button {...iconOnly} />;
// @ts-expect-error Enforce the contract at the JSX call site too.
<Button variant="ghost" />;
