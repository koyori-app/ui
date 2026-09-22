import { For, Show, onUpdate, useRef, useStore } from '@builder.io/mitosis';
import Button from '../Button/Button.lite';
import { enterHighlight, highlightItem, leaveHighlight } from '../shared/highlight';
import highlights from '../shared/highlight.module.css';
import { nextIndex, uniqueEmojis } from './icon-picker';
import styles from './icon-picker.module.css';

export interface IconPickerProps {
  /** 読み上げ名。例: 'プロジェクトのアイコン' */
  label: string;
  /** 現在の画像 URL。指定時は絵文字より優先して表示。 */
  imageUrl?: string;
  /** 現在の絵文字。 */
  emoji?: string;
  /** 候補。重複は除く。 */
  emojis: string[];
  /** input[type=file] の accept。既定 'image/*'。検証は利用側。 */
  accept?: string;
  disabled?: boolean;
  uploadLabel?: string;
  removeLabel?: string;
  imageErrorMessage?: string;
  onEmojiChange?: (emoji: string) => void;
  onImageSelect?: (file: File) => void;
  onImageRemove?: () => void;
}

export default function IconPicker(props: IconPickerProps) {
  const gridRef = useRef<HTMLDivElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const state = useStore({
    failed: false,
    activeIndex: -1,
    /* getter 同士を参照すると Vue の生成物で ref のまま渡るため、どれも props から計算する。 */
    get items() {
      return uniqueEmojis(props.emojis);
    },
    get showImage() {
      return !!props.imageUrl && !state.failed;
    },
    get previewLabel() {
      if (props.imageUrl && !state.failed) return '画像のアイコン';
      return props.emoji ? `絵文字 ${props.emoji}` : 'アイコン未設定';
    },
    /* roving tabindex。現在の候補、無ければ先頭だけが Tab で届く。 */
    current() {
      if (state.activeIndex >= 0) return state.activeIndex;
      const index = uniqueEmojis(props.emojis).indexOf(props.emoji ?? '');
      return props.imageUrl || index < 0 ? 0 : index;
    },
    navigate(event: { key: string; preventDefault(): void }) {
      if (!gridRef || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return;
      const buttons = Array.from(gridRef.querySelectorAll('button'));
      /* 列数は折り返しの結果なので、押された時点の実際の列を数える。 */
      const columns = getComputedStyle(gridRef).gridTemplateColumns.split(' ').length;
      const from = buttons.indexOf(document.activeElement as HTMLButtonElement);
      const next = nextIndex(from < 0 ? state.current() : from, event.key, columns, buttons.length);
      if (next < 0) return;
      event.preventDefault();
      state.activeIndex = next;
      buttons[next]?.focus();
    },
    select(event: { target: EventTarget | null }) {
      const input = event.target as HTMLInputElement;
      const file = input.files?.[0];
      if (file) props.onImageSelect?.(file);
      /* 同じファイルをもう一度選べるようにする。 */
      input.value = '';
    },
  });

  /* 画像が差し替わったら、前の画像の読み込み失敗を持ち越さない。 */
  onUpdate(() => {
    state.failed = false;
  }, [props.imageUrl]);

  return (
    <div class={styles.root} role="group" aria-label={props.label}>
      <div class={styles.preview} role="img" aria-label={state.previewLabel}>
        <Show when={state.showImage}>
          <img class={styles.image} src={props.imageUrl} alt="" loading="lazy" decoding="async"
            onError={() => {
              state.failed = true;
            }}
          />
        </Show>
        <Show when={!state.showImage}>
          <Show when={props.emoji} else={<span class={styles.placeholder} aria-hidden="true">未設定</span>}>
            <span aria-hidden="true">{props.emoji}</span>
          </Show>
        </Show>
      </div>
      <Show when={state.failed}>
        <span role="status" class={styles.error}>{props.imageErrorMessage ?? '画像を読み込めませんでした'}</span>
      </Show>
      <div ref={gridRef!} class={styles.grid} role="group" aria-label="絵文字の候補"
        onKeyDown={(event) => state.navigate(event)}
        onMouseEnter={(event) => enterHighlight(gridRef, event)}
        onMouseLeave={() => leaveHighlight(gridRef)}
      >
        <span class={highlights.highlight} data-hover-highlight="" aria-hidden="true" />
        <For each={state.items}>
          {(item, index) => (
            <button key={item} type="button" class={styles.emoji} aria-label={item} disabled={props.disabled}
              aria-pressed={!props.imageUrl && props.emoji === item}
              tabIndex={index === state.current() ? 0 : -1}
              onMouseEnter={(event) => highlightItem(gridRef, event.currentTarget)}
              onFocus={(event) => highlightItem(gridRef, event.currentTarget)}
              onClick={() => props.onEmojiChange?.(item)}
            >
              <span aria-hidden="true">{item}</span>
            </button>
          )}
        </For>
      </div>
      <div class={styles.actions}>
        <input ref={fileRef!} type="file" class={styles.file} accept={props.accept ?? 'image/*'}
          tabIndex={-1} aria-hidden="true"
          onChange={(event) => state.select(event)}
        />
        <Button variant="secondary" label={props.uploadLabel ?? '画像を選ぶ'} disabled={props.disabled}
          onClick={() => fileRef?.click()} />
        <Show when={props.imageUrl && props.onImageRemove}>
          <Button variant="danger" label={props.removeLabel ?? '画像を削除'} disabled={props.disabled}
            onClick={() => props.onImageRemove?.()} />
        </Show>
      </div>
    </div>
  );
}
