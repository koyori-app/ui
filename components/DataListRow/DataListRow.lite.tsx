import styles from './data-list-row.module.css';

export interface DataListRowProps {
  /** Visual selection. Supply a checkbox or button in a cell to change it. */
  selected?: boolean;
  /** Native td / th elements (use scope="row" for a row heading). */
  children?: any;
}

export default function DataListRow(props: DataListRowProps) {
  return <tr class={styles.row} data-list-row="" data-selected={props.selected || undefined}>{props.children}</tr>;
}
