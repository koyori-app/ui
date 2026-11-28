import { onMount, onUnMount, onUpdate, Show, Slot, useRef } from '@builder.io/mitosis';
import IconTile from '../IconTile/IconTile.lite';
import Tooltip from '../Tooltip/Tooltip.lite';
import { connectIconRailItem } from './icon-rail-item';
import styles from './icon-rail-item.module.css';

export interface IconRailItemProps {
  /** ツールチップの id。一意で変わらない値。 */
  id: string;
  /** ボタンの読み上げ名とツールチップ。src・emoji が無いときの頭文字にも使う。 */
  label: string;
  src?: string;
  emoji?: string;
  /** 今いる項目。aria-current="true" を付ける。variant="action" では無視する。 */
  selected?: boolean;
  /** 'action' は点線の丸で、中身は icon。追加などの操作に使う。既定は 'item'。 */
  variant?: 'item' | 'action';
  /** variant="action" の中身。React: 描画済みのノード。Vue: icon スロット。 */
  icon?: any;
  disabled?: boolean;
  onClick?: () => void;
  /** 右クリック・Shift+F10・メニューキー・タッチの長押しで呼ぶ。position はメニューを出す位置。 */
  onMenu?: (position: { x: number; y: number }) => void;
  /** この項目から開いたメニューが開いている間 true。その間ツールチップを出さない。 */
  menuOpen?: boolean;
}

export default function IconRailItem(props: IconRailItemProps) {
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  let connection = useRef<ReturnType<typeof connectIconRailItem> | null>(null);
  onMount(() => {
    connection = connectIconRailItem(buttonRef, { onClick: props.onClick, onMenu: props.onMenu });
  });
  // 依存なし。React は毎描画、Vue は onUpdated で、最新の onClick・onMenu を渡し直す。
  onUpdate(() => {
    connection?.configure({ onClick: props.onClick, onMenu: props.onMenu });
  });
  onUnMount(() => { connection?.destroy(); });

  return (
    <div class={styles.item}>
      <Tooltip id={props.id} content={props.label} placement="right" disabled={props.menuOpen}>
        <button ref={buttonRef!} type="button" class={styles.button} aria-label={props.label}
          aria-current={props.selected && props.variant !== 'action' ? 'true' : undefined}
          disabled={props.disabled} data-variant={props.variant ?? 'item'} data-menu={props.onMenu ? 'true' : undefined}
        >
          <Show when={props.variant !== 'action'}>
            <span class={styles.bar} aria-hidden="true" />
            <span class={styles.tile}>
              <IconTile name={props.label} src={props.src} emoji={props.emoji} size={40} />
            </span>
          </Show>
          <Show when={props.variant === 'action'}>
            <span class={styles.action} aria-hidden="true"><Slot name="icon" /></span>
          </Show>
        </button>
      </Tooltip>
    </div>
  );
}
