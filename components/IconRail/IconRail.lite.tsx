import styles from './icon-rail.module.css';

export interface IconRailProps {
  /** ランドマーク（nav）の読み上げ名。例: 「テナント」。 */
  label: string;
  /** IconRailItem と IconRailSeparator。Vue: default slot。 */
  children?: any;
}

/* 項目は独立した操作なので、矢印キーでの移動は足さず Tab で順に回る。 */
export default function IconRail(props: IconRailProps) {
  return (
    <nav class={styles.rail} aria-label={props.label}>
      {props.children}
    </nav>
  );
}
