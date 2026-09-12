import styles from './button-group.module.css';

export interface ButtonGroupProps {
  label: string;
  children?: any;
}

export default function ButtonGroup(props: ButtonGroupProps) {
  return (
    <div class={styles.group} role="group" aria-label={props.label}>
      {props.children}
    </div>
  );
}
