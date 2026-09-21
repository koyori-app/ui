import { For, Show } from '@builder.io/mitosis';
import styles from './breadcrumb.module.css';

export interface BreadcrumbItem {
  label: string;
  /** Omit to render plain text instead of a link. */
  href?: string;
}

export interface BreadcrumbProps {
  /** Accessible name of the landmark. Defaults to パンくずリスト. */
  label?: string;
  /** Ordered from the top level. The last item is the current page. */
  items: BreadcrumbItem[];
}

export default function Breadcrumb(props: BreadcrumbProps) {
  return (
    /* 0 件のときは名前だけのランドマークを残さない。 */
    <Show when={props.items.length > 0}>
      <nav class={styles.root} aria-label={props.label ?? 'パンくずリスト'}>
        {/* list-style: none で list の意味論を落とす読み上げ環境があるため role を明示する。 */}
        <ol class={styles.list} role="list">
          <For each={props.items}>
            {(item, index) => (
              <li key={index} class={styles.item}>
                <Show when={item.href}>
                  <a class={styles.link} href={item.href}
                    aria-current={index === props.items.length - 1 ? 'page' : undefined}
                  >{item.label}</a>
                </Show>
                <Show when={!item.href}>
                  <span class={styles.text}
                    aria-current={index === props.items.length - 1 ? 'page' : undefined}
                  >{item.label}</span>
                </Show>
              </li>
            )}
          </For>
        </ol>
      </nav>
    </Show>
  );
}
