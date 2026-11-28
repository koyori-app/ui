import styles from './icon-rail-separator.module.css';

/** IconRail の項目の間の線。飾りなので読み上げから外す。 */
export default function IconRailSeparator() {
  return <span class={styles.separator} aria-hidden="true" />;
}
