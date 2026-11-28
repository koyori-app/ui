import { For, Show, onMount, onUnMount, onUpdate, useRef, useStore } from '@builder.io/mitosis';
import Button from '../Button/Button.lite';
import Input from '../Input/Input.lite';
import { listenToSidebar } from '../Sidebar/sidebar';
import { tabId, tabPanelId } from '../Tabs/tabs';
import { listenToMenu, positionMenu, resetMenu } from '../shared/menu';
import highlights from '../shared/highlight.module.css';
import menu from '../shared/menu.module.css';
import {
  emojiCatalog,
  emojiKey,
  emojiName,
  loadEmojiCatalog,
  nextCell,
  pickerSections,
  sectionsCurrentCell,
} from './icon-picker';
import styles from './icon-picker.module.css';

export interface IconPickerProps {
  /** 読み上げ名。トリガーとパネルに付く。例: 'プロジェクトのアイコン' */
  label: string;
  /** 現在の画像 URL。指定時は絵文字より優先して表示。 */
  imageUrl?: string;
  /** 現在の絵文字。 */
  emoji?: string;
  /** 「おすすめ」に出す候補。重複は除く。省くか空なら見出しごと出さない。
   * 選べる絵文字はこれに限らず、部品が持つ 1,238 個から検索して選べる。 */
  emojis?: string[];
  /** input[type=file] の accept。既定 'image/*'。検証は利用側。 */
  accept?: string;
  /** トリガーが無効になり、開かない。開いている間に true になったら閉じる。 */
  disabled?: boolean;
  /** 画像が無いときのボタン。既定「画像を選ぶ」。 */
  uploadLabel?: string;
  /** 画像があるときのボタン。既定「画像を変更」。 */
  changeLabel?: string;
  /** 既定「画像を外す」。 */
  removeLabel?: string;
  /** 既定「なしにする」。 */
  clearLabel?: string;
  /** 画像タブのヒント。accept を変えるときは合わせて渡す。 */
  imageHint?: string;
  imageErrorMessage?: string;
  /** 選ぶとパネルが閉じる。カテゴリから選ぶと U+FE0F 付きの絵文字が来ることがある。 */
  onEmojiChange?: (emoji: string) => void;
  /** 無ければ「画像」のタブを出さない。 */
  onImageSelect?: (file: File) => void;
  /** imageUrl とこれがあるとき「画像を外す」を出す。 */
  onImageRemove?: () => void;
  /** あれば「なしにする」を出す。絵文字と画像の両方を外すのは利用側。 */
  onClear?: () => void;
}

export default function IconPicker(props: IconPickerProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const tabsRef = useRef<HTMLDivElement | null>(null);
  const searchRef = useRef<HTMLDivElement | null>(null);
  const gridRef = useRef<HTMLDivElement | null>(null);
  const actionsRef = useRef<HTMLDivElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  let cleanupRef = useRef<(() => void) | null>(null);
  /* 読み込みの世代。閉じる・unmount で進め、古い読み込みの完了が状態を書かないようにする。 */
  let generationRef = useRef<number | null>(null);
  /* カタログ（1,238 個）は store に入れない。Vue の深い reactive に載せないため、描くときに emojiCatalog() を読む。
     getter 同士を参照すると Vue の生成物で ref のまま渡るため、どれも props と state から計算する。 */
  const state = useStore({
    id: '',
    open: false,
    tab: 'emoji',
    query: '',
    activeIndex: -1,
    failed: false,
    dataState: 'idle',
    sections() {
      return pickerSections(props.emojis, state.query, state.dataState === 'ready' ? emojiCatalog() : null);
    },
    /* roving tabindex。移動後はその位置、まだなら選択中の絵文字が最初に出る位置。 */
    current() {
      return sectionsCurrentCell(
        pickerSections(props.emojis, state.query, state.dataState === 'ready' ? emojiCatalog() : null),
        state.activeIndex, props.emoji, props.imageUrl,
      );
    },
    resultCount() {
      return pickerSections(props.emojis, state.query, state.dataState === 'ready' ? emojiCatalog() : null)
        .reduce((sum, section) => sum + section.entries.length, 0);
    },
    failedText() {
      return state.failed ? props.imageErrorMessage ?? '画像を読み込めませんでした' : '';
    },
    countText() {
      if (!state.query.trim() || state.dataState !== 'ready') return '';
      const count = pickerSections(props.emojis, state.query, state.dataState === 'ready' ? emojiCatalog() : null)
        .reduce((sum, section) => sum + section.entries.length, 0);
      return `検索結果 ${count} 件`;
    },
    showImage() {
      return !!props.imageUrl && !state.failed;
    },
    triggerName() {
      if (props.imageUrl && !state.failed) return '画像';
      return props.emoji ? emojiName(props.emoji) : '未設定';
    },
    /* 世代だけで判定する。React の生成物では閉じた後の state.open が古い値のまま読まれるため。 */
    load() {
      generationRef = (generationRef ?? 0) + 1;
      const generation = generationRef;
      if (emojiCatalog()) {
        state.dataState = 'ready';
        return;
      }
      state.dataState = 'loading';
      loadEmojiCatalog().then(
        () => {
          if (generation === generationRef) state.dataState = 'ready';
        },
        () => {
          if (generation === generationRef) state.dataState = 'error';
        },
      );
    },
    retry() {
      /* ボタンは読み込み中に消えるので、先にフォーカスを検索欄へ移して、パネルの外へ落とさない。 */
      searchRef?.querySelector<HTMLInputElement>('input')?.focus();
      state.load();
    },
    show() {
      if (props.disabled) return;
      state.tab = props.onImageSelect && props.imageUrl && !state.failed ? 'image' : 'emoji';
      state.open = true;
      state.load();
    },
    detach() {
      cleanupRef?.();
      cleanupRef = null;
    },
    close(restoreFocus: boolean) {
      state.detach();
      state.open = false;
      state.query = '';
      state.activeIndex = -1;
      generationRef = (generationRef ?? 0) + 1;
      resetMenu(panelRef, bodyRef);
      if (restoreFocus) triggerRef?.focus({ preventScroll: true });
    },
    pick(emoji: string) {
      if (props.disabled) return;
      /* 閉じてフォーカスを戻してから知らせる。利用側が保存で部品を消しても壊れない。 */
      state.close(true);
      props.onEmojiChange?.(emoji);
    },
    clear() {
      if (props.disabled) return;
      state.close(true);
      props.onClear?.();
    },
    removeImage() {
      /* 押したボタンは消えるので、先に「画像を選ぶ」へフォーカスを移す。 */
      actionsRef?.querySelector<HTMLButtonElement>('button')?.focus();
      props.onImageRemove?.();
    },
    select(event: { target: EventTarget | null }) {
      const input = event.target as HTMLInputElement;
      const file = input.files?.[0];
      if (file) props.onImageSelect?.(file);
      /* 同じファイルをもう一度選べるようにする。 */
      input.value = '';
    },
    search(value: string) {
      state.query = value;
      state.activeIndex = -1;
    },
    position() {
      positionMenu(rootRef, triggerRef, panelRef, bodyRef);
    },
    key(event: { key: string; keyCode?: number; isComposing?: boolean; nativeEvent?: { isComposing?: boolean }; preventDefault(): void; stopPropagation(): void }) {
      if (state.open && event.key === 'Escape' && !event.isComposing && !event.nativeEvent?.isComposing && event.keyCode !== 229) {
        event.preventDefault();
        event.stopPropagation();
        state.close(true);
      }
    },
    /* タブは ← → Home End でフォーカスだけ移し、Enter・Space・クリックで切り替える（Tabs と同じ）。 */
    tabKey(event: { key: string; target: EventTarget | null; isComposing?: boolean; nativeEvent?: { isComposing?: boolean }; keyCode?: number; altKey?: boolean; ctrlKey?: boolean; metaKey?: boolean; preventDefault(): void }) {
      if (event.isComposing || event.nativeEvent?.isComposing || event.keyCode === 229 || event.altKey || event.ctrlKey || event.metaKey) return;
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      const tabs = Array.from(tabsRef?.querySelectorAll<HTMLButtonElement>('[role="tab"]') ?? []);
      const current = tabs.indexOf(event.target as HTMLButtonElement);
      if (current < 0) return;
      event.preventDefault();
      const rtl = tabsRef && getComputedStyle(tabsRef).direction === 'rtl';
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1
        : (current + ((event.key === 'ArrowRight') !== !!rtl ? 1 : -1) + tabs.length) % tabs.length;
      tabs[next]?.focus();
    },
    searchKey(event: { key: string; keyCode?: number; isComposing?: boolean; nativeEvent?: { isComposing?: boolean }; preventDefault(): void }) {
      if (event.isComposing || event.nativeEvent?.isComposing || event.keyCode === 229) return;
      if (event.key === 'ArrowDown') {
        const cell = gridRef?.querySelector<HTMLButtonElement>('[data-cell][tabindex="0"]');
        if (!cell) return;
        event.preventDefault();
        cell.focus();
        cell.scrollIntoView({ block: 'nearest' });
      } else if (event.key === 'Enter' && state.query.trim()) {
        const first = pickerSections(props.emojis, state.query, state.dataState === 'ready' ? emojiCatalog() : null)[0]?.entries[0];
        if (!first) return;
        event.preventDefault();
        state.pick(first.emoji);
      }
    },
    navigate(event: { key: string; ctrlKey?: boolean; metaKey?: boolean; preventDefault(): void }) {
      if (!gridRef || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return;
      const cells = Array.from(gridRef.querySelectorAll<HTMLButtonElement>('[data-cell]'));
      const from = cells.indexOf(document.activeElement as HTMLButtonElement);
      if (from < 0) return;
      const grid = gridRef.querySelector<HTMLElement>('[data-grid]');
      /* 列数は折り返しの結果なので、押された時点の実際の列を数える。 */
      const columns = grid ? getComputedStyle(grid).gridTemplateColumns.split(' ').length : 1;
      const sizes = pickerSections(props.emojis, state.query, state.dataState === 'ready' ? emojiCatalog() : null)
        .map((section) => section.entries.length);
      const next = nextCell(sizes, from, event.key, columns, !!(event.ctrlKey || event.metaKey));
      event.preventDefault();
      if (next < 0 || next === from) return;
      state.activeIndex = next;
      cells[next]?.focus();
      cells[next]?.scrollIntoView({ block: 'nearest' });
    },
    sync() {
      if (!rootRef || !panelRef) return;
      state.detach();
      if (!state.open || props.disabled) {
        state.close(false);
        return;
      }
      const menuCleanup = listenToMenu(rootRef, () => state.close(false), state.position, panelRef);
      let gridCleanup: (() => void) | null = null;
      let tabsCleanup: (() => void) | null = null;
      let frame = 0;
      cleanupRef = () => {
        cancelAnimationFrame(frame);
        menuCleanup();
        gridCleanup?.();
        tabsCleanup?.();
      };
      frame = requestAnimationFrame(() => {
        if (!panelRef || panelRef.hidden) return;
        /* ホバーとフォーカスのハイライトは共通の仕組みに任せる。外へ出たときに消すのも含む。 */
        gridCleanup = listenToSidebar(gridRef);
        tabsCleanup = listenToSidebar(tabsRef);
        state.position();
        /* タッチではソフトキーボードを出さないよう、パネル自身へ移す。 */
        const target = matchMedia('(pointer: coarse)').matches ? panelRef
          : state.tab === 'image' ? actionsRef?.querySelector<HTMLElement>('button')
          : searchRef?.querySelector<HTMLElement>('input');
        target?.focus({ preventScroll: true });
      });
    },
  });

  onMount(() => {
    state.id = `koyori-icon-picker-${Math.random().toString(36).slice(2)}`;
  });
  onUpdate(() => { state.sync(); }, [state.open, props.disabled]);
  onUpdate(() => {
    if (!panelRef || panelRef.hidden) return;
    requestAnimationFrame(() => state.position());
  }, [state.tab, state.dataState, state.query, props.imageUrl]);
  /* 画像が差し替わったら、前の画像の読み込み失敗を持ち越さない。 */
  onUpdate(() => {
    state.failed = false;
  }, [props.imageUrl]);
  onUnMount(() => {
    state.detach();
    generationRef = (generationRef ?? 0) + 1;
  });

  return (
    <div ref={rootRef!} class={`${menu.root} ${styles.root}`} data-menu-top-layer="" onKeyDown={(event) => state.key(event)}>
      <button ref={triggerRef!} type="button" class={styles.trigger} disabled={props.disabled}
        aria-label={`${props.label}: ${state.triggerName()}`}
        aria-haspopup="dialog" aria-expanded={state.open && !props.disabled} aria-controls={state.id || undefined}
        onClick={() => { if (state.open) state.close(false); else state.show(); }}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' && !state.open) { event.preventDefault(); state.show(); }
        }}>
        <Show when={state.showImage()}>
          <img class={styles.image} src={props.imageUrl} alt="" decoding="async"
            onError={() => {
              state.failed = true;
            }}
          />
        </Show>
        <Show when={!state.showImage()}>
          <Show when={props.emoji} else={<span class={styles.plus} aria-hidden="true">＋</span>}>
            <span class={styles.glyph} aria-hidden="true">{props.emoji}</span>
          </Show>
        </Show>
      </button>
      <Show when={props.onImageSelect}>
        {/* ボタンから開くため、入力欄自体は Tab にも読み上げにも出さない。閉じても残し、選択中に閉じた後の change も受ける。 */}
        <input ref={fileRef!} type="file" class={styles.file} accept={props.accept ?? 'image/*'}
          tabIndex={-1} aria-hidden="true"
          onChange={(event) => state.select(event)}
        />
      </Show>
      <span class={styles.visuallyHidden} role="status">{state.failedText()}</span>
      <div ref={panelRef!} id={state.id || undefined} class={`${menu.panel} ${styles.panel}`}
        role="dialog" aria-label={props.label} tabIndex={-1} hidden={!state.open || props.disabled}>
        <div ref={bodyRef!} class={`${menu.list} ${styles.body}`}>
          <Show when={state.open && !props.disabled}>
            <Show when={props.onImageSelect || props.onClear}>
              <div class={styles.bar}>
                <Show when={props.onImageSelect}>
                  <div ref={tabsRef!} class={styles.tabs} role="tablist" aria-label="アイコンの種類" data-hover-group=""
                    onKeyDown={(event) => state.tabKey(event)}>
                    <span class={highlights.highlight} data-hover-highlight="" aria-hidden="true" />
                    <button type="button" role="tab" class={styles.tab} data-hover-item=""
                      id={tabId(state.id, 'emoji')} aria-controls={tabPanelId(state.id, 'emoji')}
                      aria-selected={state.tab === 'emoji'} tabIndex={state.tab === 'emoji' ? 0 : -1}
                      onClick={() => { state.tab = 'emoji'; }}>
                      絵文字
                    </button>
                    <button type="button" role="tab" class={styles.tab} data-hover-item=""
                      id={tabId(state.id, 'image')} aria-controls={tabPanelId(state.id, 'image')}
                      aria-selected={state.tab === 'image'} tabIndex={state.tab === 'image' ? 0 : -1}
                      onClick={() => { state.tab = 'image'; }}>
                      画像
                    </button>
                  </div>
                </Show>
                <Show when={props.onClear}>
                  <button type="button" class={styles.clear} disabled={!props.emoji && !props.imageUrl}
                    onClick={() => state.clear()}>
                    {props.clearLabel ?? 'なしにする'}
                  </button>
                </Show>
              </div>
            </Show>
            <div class={styles.emojiPanel} hidden={state.tab !== 'emoji'}
              id={props.onImageSelect ? tabPanelId(state.id, 'emoji') : undefined}
              role={props.onImageSelect ? 'tabpanel' : undefined}
              aria-labelledby={props.onImageSelect ? tabId(state.id, 'emoji') : undefined}>
              <div ref={searchRef!} class={styles.search} onKeyDown={(event) => state.searchKey(event)}>
                <Input type="search" ariaLabel="絵文字を検索" placeholder="絵文字を検索"
                  value={state.query} onValueChange={(value) => state.search(value)} />
              </div>
              <div ref={gridRef!} class={styles.scroll} data-hover-group="" onKeyDown={(event) => state.navigate(event)}>
                <span class={highlights.highlight} data-hover-highlight="" aria-hidden="true" />
                <For each={state.sections()}>
                  {(section, sectionIndex) => (
                    <div key={section.label} class={styles.section} role="group" aria-labelledby={`${state.id}-section-${sectionIndex}`}>
                      <div class={styles.heading} id={`${state.id}-section-${sectionIndex}`}>{section.label}</div>
                      <div class={styles.grid} data-grid="">
                        <For each={section.entries}>
                          {(item, index) => (
                            <button key={item.emoji} type="button" class={styles.cell} data-cell="" data-hover-item=""
                              aria-label={item.name} disabled={props.disabled}
                              aria-pressed={!props.imageUrl && !!props.emoji && emojiKey(props.emoji) === emojiKey(item.emoji)}
                              tabIndex={section.start + index === state.current() ? 0 : -1}
                              onClick={() => state.pick(item.emoji)}>
                              <span aria-hidden="true">{item.emoji}</span>
                            </button>
                          )}
                        </For>
                      </div>
                    </div>
                  )}
                </For>
                {/* 検索中も出す。カタログが無い間の検索はおすすめだけを探すので、0 件と断定しない。 */}
                <Show when={state.dataState === 'loading'}>
                  <div class={styles.status} role="status">読み込み中</div>
                </Show>
                <Show when={state.dataState === 'error'}>
                  <div class={styles.status} role="alert">
                    <span>絵文字を読み込めませんでした</span>
                    <Button variant="secondary" label="もう一度読み込む" onClick={() => state.retry()} />
                  </div>
                </Show>
                <Show when={state.dataState === 'ready' && state.query.trim() && state.resultCount() === 0}>
                  <p class={styles.status}>見つかりませんでした</p>
                </Show>
              </div>
              <span class={styles.visuallyHidden} aria-live="polite">{state.countText()}</span>
            </div>
            <Show when={props.onImageSelect}>
              <div class={styles.imagePanel} hidden={state.tab !== 'image'} role="tabpanel"
                id={tabPanelId(state.id, 'image')} aria-labelledby={tabId(state.id, 'image')}>
                <Show when={props.imageUrl}>
                  <Show when={!state.failed} else={<span class={styles.error}>{props.imageErrorMessage ?? '画像を読み込めませんでした'}</span>}>
                    <img class={styles.current} src={props.imageUrl} alt="" decoding="async"
                      onError={() => {
                        state.failed = true;
                      }}
                    />
                  </Show>
                </Show>
                <p class={styles.hint}>{props.imageHint ?? 'PNG か JPEG で、正方形に切り抜いて表示します'}</p>
                <div ref={actionsRef!} class={styles.actions}>
                  <Button variant="secondary" disabled={props.disabled}
                    label={props.imageUrl ? props.changeLabel ?? '画像を変更' : props.uploadLabel ?? '画像を選ぶ'}
                    onClick={() => fileRef?.click()} />
                  <Show when={props.imageUrl && props.onImageRemove}>
                    <Button variant="ghost" label={props.removeLabel ?? '画像を外す'} disabled={props.disabled}
                      onClick={() => state.removeImage()} />
                  </Show>
                </div>
              </div>
            </Show>
          </Show>
        </div>
      </div>
    </div>
  );
}
