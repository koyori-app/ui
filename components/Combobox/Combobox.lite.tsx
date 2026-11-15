import { enterHighlight, hideHighlight, highlightItem } from '../shared/highlight';
import highlights from '../shared/highlight.module.css';
import { For, Show, Slot, useContext, useRef, useStore, onMount, onUnMount, onUpdate } from '@builder.io/mitosis';
import XIcon from '../XIcon/XIcon.lite';
import { listenToMenu, positionMenu } from '../shared/menu';
import FieldContext from '../Field/field.context.lite';
import { getFieldContext } from '../Field/field';
import { comboboxActiveValue, comboboxEnabledValues, comboboxLabelParts, comboboxSections, isComposingKey, nextComboboxValue } from './combobox';
import type { ComboboxOption, ComboboxSection, ComboboxTag } from './combobox';
import controls from '../shared/control.module.css';
import labels from '../shared/label.module.css';
import menu from '../shared/menu.module.css';
import fields from '../Field/field.module.css';
import styles from './combobox.module.css';

export interface ComboboxProps {
  /** Field の中では Field の id を使う。 */
  id?: string;
  /** Field の外で使うときは必須。 */
  ariaLabel?: string;
  name?: string;
  /** 入力中の文字。利用側が持つ。 */
  value?: string;
  placeholder?: string;
  disabled?: boolean;
  /** 入力のたびに呼ぶ。caret は入力後のキャレット位置。 */
  onValueChange?: (value: string, caret: number) => void;
  /** 文字を変えずにキャレットが動いたとき（矢印・クリック・フォーカス）。 */
  onCaretChange?: (caret: number) => void;
  /** 入力欄の前に並べる札。 */
  tags?: ComboboxTag[];
  /** 札の × と、欄の先頭での Backspace。index は tags の位置。 */
  onTagRemove?: (index: number) => void;
  /** 平らな一覧か、節の一覧。混ぜない。空なら一覧を出さない。 */
  options?: ComboboxOption[] | ComboboxSection[];
  /** listbox の読み上げ名。既定 '候補'。 */
  listLabel?: string;
  /** true なら、候補が出たとき先頭を選んだ状態にする。既定 false。 */
  autoHighlight?: boolean;
  /** 候補を Enter かクリックで選んだとき。 */
  onSelect?: (value: string) => void;
  /** 候補を選んでいない状態の Enter。 */
  onCommit?: (value: string) => void;
  /** 一覧が開いた・閉じたとき（候補が空になって閉じたときも）。 */
  onOpenChange?: (open: boolean) => void;
  /** 初期表示で一覧を開く（フォーカスは移さない）。Storybook・VRT 用。 */
  defaultOpen?: boolean;
  /** React: 描画済みの要素。Vue: prefix スロット。 */
  prefix?: any;
  /** React: 描画済みの要素。Vue: suffix スロット。 */
  suffix?: any;
  /** 一覧の下端の案内。React: 描画済みの要素。Vue: footer スロット。操作できる要素は置かない。 */
  footer?: any;
}

export default function Combobox(props: ComboboxProps) {
  const fieldContext = useContext(FieldContext);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const anchorRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  let cleanupRef = useRef<(() => void) | null>(null);
  let openedRef = useRef<boolean | null>(null);
  let caretRef = useRef<number | null>(null);
  let composingRef = useRef<boolean | null>(null);
  let quietFocusRef = useRef<boolean | null>(null);
  let pointerRef = useRef<string | null>(null);
  let byPointerRef = useRef<boolean | null>(null);
  let revealedRequestRef = useRef<number | null>(null);
  let revealedValueRef = useRef<string | null>(null);
  const state = useStore({
    uid: '',
    revealRequest: 0,
    expanded: props.defaultOpen || false,
    activeValue: comboboxActiveValue([], null, false),
    get context() { return getFieldContext(fieldContext); },
    enabledValues() {
      return comboboxEnabledValues(comboboxSections(props.options));
    },
    activeOption() {
      return comboboxActiveValue(state.enabledValues(), state.activeValue, !!props.autoHighlight);
    },
    isOpen() {
      return state.expanded && !props.disabled && comboboxSections(props.options).some((section) => section.options.length > 0);
    },
    get view() {
      const current = state.activeOption();
      const open = state.isOpen();
      let activeId: string | undefined;
      const sections = comboboxSections(props.options).map((section, sectionIndex) => ({
        heading: section.heading,
        headingId: section.heading && state.uid ? `${state.uid}-heading-${sectionIndex}` : undefined,
        options: section.options.map((option, index) => {
          const optionId = state.uid ? `${state.uid}-option-${sectionIndex}-${index}` : undefined;
          const isActive = !option.disabled && option.value === current;
          if (isActive) activeId = optionId;
          return { ...option, id: optionId, active: isActive, parts: comboboxLabelParts(option.label, option.highlight) };
        }),
      }));
      const tags = (props.tags ?? []).map((tag) => ({ ...tag, removeLabel: tag.removeLabel || `${tag.prefix ?? ''}${tag.label}を外す` }));
      return { sections, tags, open, grouped: sections.length > 1 || !!sections[0]?.heading, activeId: open ? activeId : undefined };
    },
    position() {
      positionMenu(anchorRef, rootRef, panelRef, listRef);
      if (anchorRef && rootRef && panelRef) {
        panelRef.style.setProperty('--combobox-top-offset', `${anchorRef.getBoundingClientRect().top - rootRef.getBoundingClientRect().top}px`);
      }
      state.alignActive();
    },
    alignActive() {
      const target = listRef?.querySelector<HTMLElement>('[data-active="true"]');
      if (!target) { hideHighlight(listRef); return; }
      highlightItem(listRef, target, !byPointerRef);
    },
    caretPosition() {
      return inputRef?.selectionStart ?? inputRef?.value.length ?? 0;
    },
    reportCaret() {
      const at = state.caretPosition();
      if (at === caretRef) return;
      caretRef = at;
      props.onCaretChange?.(at);
    },
    /* React は onChange のない制御入力を警告し、Vue の change は確定時にしか届かない。両方を受けて input だけ扱う。 */
    change(event: { type: string; target: EventTarget | null }) {
      if (event.type !== 'input' || props.disabled) return;
      const input = event.target as HTMLInputElement;
      const at = state.caretPosition();
      caretRef = at;
      byPointerRef = false;
      state.revealRequest = state.revealRequest + 1;
      state.activeValue = null;
      state.expanded = true;
      props.onValueChange?.(input.value, at);
    },
    select(value: string, unavailable?: boolean) {
      if (unavailable || props.disabled) return;
      byPointerRef = false;
      state.activeValue = null;
      props.onSelect?.(value);
    },
    removeTag(index: number, refocus: boolean) {
      if (props.disabled) return;
      props.onTagRemove?.(index);
      if (refocus && document.activeElement !== inputRef) {
        quietFocusRef = true;
        inputRef?.focus();
      }
    },
    focus() {
      if (quietFocusRef) quietFocusRef = false;
      else state.expanded = true;
      state.reportCaret();
    },
    blur() {
      state.expanded = false;
      state.activeValue = null;
      composingRef = false;
    },
    press(event: { target: EventTarget | null; preventDefault(): void }) {
      if (props.disabled) return;
      const target = event.target as Element;
      if (panelRef?.contains(target)) { event.preventDefault(); return; }
      if (target.closest('button, a, input')) return;
      event.preventDefault();
      state.expanded = true;
      inputRef?.focus();
    },
    hover(option: { value: string; disabled?: boolean }, event: { screenX: number; screenY: number }) {
      const point = `${event.screenX},${event.screenY}`;
      if (point === pointerRef) return;
      pointerRef = point;
      if (option.disabled || state.activeValue === option.value) return;
      byPointerRef = true;
      state.activeValue = option.value;
    },
    leave() {
      if (!byPointerRef) return;
      byPointerRef = false;
      state.activeValue = null;
    },
    keydown(event: { key: string; keyCode?: number; altKey?: boolean; repeat?: boolean; isComposing?: boolean; nativeEvent?: { isComposing?: boolean }; preventDefault(): void; stopPropagation(): void }) {
      if (composingRef || isComposingKey(event)) return;
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        const values = state.enabledValues();
        if (!values.length) return;
        event.preventDefault();
        byPointerRef = false;
        state.revealRequest = state.revealRequest + 1;
        const wasOpen = state.isOpen();
        state.expanded = true;
        if (event.altKey) return;
        state.activeValue = nextComboboxValue(values, wasOpen ? state.activeOption() : null, event.key);
      } else if (event.key === 'Enter') {
        if (event.repeat) { event.preventDefault(); return; }
        const current = state.activeOption();
        if (state.isOpen() && current !== null) {
          event.preventDefault();
          state.select(current);
        } else props.onCommit?.(inputRef?.value ?? '');
      } else if (event.key === 'Escape') {
        if (!state.isOpen()) return;
        event.preventDefault();
        event.stopPropagation();
        state.expanded = false;
        state.activeValue = null;
      } else if (event.key === 'Backspace') {
        const count = props.tags?.length ?? 0;
        if (!count || event.repeat || inputRef?.selectionStart !== 0 || inputRef?.selectionEnd !== 0) return;
        event.preventDefault();
        state.removeTag(count - 1, false);
      }
    },
  });

  onMount(() => {
    state.uid = `koyori-combobox-${Math.random().toString(36).slice(2)}`;
    const stopMenu = listenToMenu(rootRef, () => { state.expanded = false; }, state.position);
    // DOM の並べ替え・見出し・折り返し・幅の変更でも測り直す。属性は帯自身の更新を拾うので監視しない。
    const resizeObserver = new ResizeObserver(() => state.position());
    if (rootRef) resizeObserver.observe(rootRef);
    if (listRef) resizeObserver.observe(listRef);
    const structureObserver = new MutationObserver(() => state.position());
    if (listRef) structureObserver.observe(listRef, { childList: true, subtree: true, characterData: true });
    cleanupRef = () => { stopMenu(); resizeObserver.disconnect(); structureObserver.disconnect(); };
    if (state.expanded) requestAnimationFrame(() => state.position());
  });
  onUpdate(() => {
    /* Vue では依存付き onUpdate が setup 中にも走るが、SSR には requestAnimationFrame が無い。 */
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(() => state.position());
  }, [state.isOpen(), state.activeOption(), comboboxSections(props.options).reduce((count, section) => count + section.options.length, 0), state.expanded, state.activeValue, props.options, props.tags, props.value, props.disabled, props.autoHighlight]);
  onUpdate(() => {
    if (props.disabled) {
      state.expanded = false;
      state.activeValue = null;
      byPointerRef = false;
    }
  }, [props.disabled]);
  onUpdate(() => {
    const open = state.isOpen();
    if (!!openedRef === open) return;
    openedRef = open;
    props.onOpenChange?.(open);
  }, [state.isOpen(), comboboxSections(props.options).reduce((count, section) => count + section.options.length, 0), state.expanded, props.options, props.disabled]);
  onUpdate(() => {
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(() => {
      const nextValue = state.isOpen() ? state.activeOption() : null;
      // 入力・矢印は同じ値でも表示し直す。ポインターやレイアウトの変更だけでは送らない。
      if (nextValue !== revealedValueRef || state.revealRequest !== revealedRequestRef) {
        revealedRequestRef = state.revealRequest;
        revealedValueRef = nextValue;
        if (nextValue !== null && !byPointerRef) listRef?.querySelector<HTMLElement>('[data-active="true"]')?.scrollIntoView({ block: 'nearest' });
      }
      state.alignActive();
    });
  }, [state.isOpen(), state.activeOption(), state.revealRequest]);
  onUnMount(() => cleanupRef?.());

  return (
    <div ref={rootRef!} class={`${fields.group} ${styles.root}`} onMouseDown={(event) => state.press(event)}>
      <span class={fields.affix} data-affix="prefix"><Slot name="prefix" /></span>
      <div class={styles.body}>
        <For each={state.view.tags}>
          {(tag, index) => (
            <span key={`${index}-${tag.label}`} class={`${labels.root} ${labels.tag} ${styles.tag}`} data-size="sm">
              <span class={labels.content}>
                <Show when={tag.prefix}><span class={styles.tagPrefix}>{tag.prefix}</span></Show>
                <span class={labels.label}>{tag.label}</span>
              </span>
              <button class={`${controls.button} ${labels.remove}`} data-variant="ghost" type="button" disabled={props.disabled}
                aria-label={tag.removeLabel} onClick={() => state.removeTag(index, true)}>
                <span class={`${controls.surface} ${labels.removeSurface}`}><XIcon size={14} /></span>
              </button>
            </span>
          )}
        </For>
        <div ref={anchorRef!} class={styles.anchor}>
          <input ref={inputRef!} class={`${fields.control} ${styles.input}`} type="text" role="combobox"
            id={state.context?.id ?? props.id} name={props.name} value={props.value ?? ''} placeholder={props.placeholder}
            disabled={props.disabled} required={state.context?.required} autoComplete="off" spellcheck={false}
            aria-label={props.ariaLabel} aria-describedby={state.context?.describedBy} aria-invalid={state.context?.invalid || undefined}
            aria-autocomplete="list" aria-expanded={state.view.open ? 'true' : 'false'}
            aria-controls={state.uid ? `${state.uid}-list` : undefined} aria-activedescendant={state.view.activeId}
            onInput={(event) => state.change(event)} onChange={(event) => state.change(event)}
            onKeyDown={(event) => state.keydown(event)} onKeyUp={() => state.reportCaret()}
            onClick={() => { state.expanded = true; state.reportCaret(); }}
            onFocus={() => state.focus()} onBlur={() => state.blur()}
            onCompositionStart={() => { composingRef = true; }} onCompositionEnd={() => { composingRef = false; }}
          />
          <div ref={panelRef!} class={`${menu.panel} ${styles.panel}`} hidden={!state.view.open}>
            <div ref={listRef!} id={state.uid ? `${state.uid}-list` : undefined} class={menu.list}
              role="listbox" aria-label={props.listLabel ?? '候補'}
              onMouseEnter={(event) => { if (!state.view.activeId) enterHighlight(listRef, event); }}
              onMouseLeave={() => state.leave()}
            >
              <span class={highlights.highlight} data-hover-highlight="" aria-hidden="true" />
              <For each={state.view.sections}>
                {(section, sectionIndex) => (
                  <div key={sectionIndex} class={`${menu.group} ${styles.group}`} role={state.view.grouped ? 'group' : 'presentation'}
                    aria-labelledby={section.headingId}
                  >
                    <Show when={section.heading}>
                      <div id={section.headingId} class={menu.heading} role="presentation">{section.heading}</div>
                    </Show>
                    <For each={section.options}>
                      {(option) => (
                        <div key={option.value} id={option.id} class={`${menu.item} ${styles.option}`} role="option"
                          aria-selected={option.active ? 'true' : 'false'} aria-disabled={option.disabled || undefined}
                          data-active={option.active}
                          onPointerMove={(event) => state.hover(option, event)}
                          onClick={() => state.select(option.value, option.disabled)}
                        >
                          <Show when={option.color}>
                            <span class={styles.dot} style={{ backgroundColor: option.color ?? 'currentColor' }} aria-hidden="true" />
                          </Show>
                          <span class={styles.text}>
                            <span>
                              <For each={option.parts}>
                                {(part, partIndex) => (
                                  <span key={partIndex} class={part.strong ? styles.strong : undefined}>{part.text}</span>
                                )}
                              </For>
                            </span>
                            <Show when={option.description}>
                              <span class={styles.description}>{option.description}</span>
                            </Show>
                          </span>
                          <Show when={option.meta}>
                            <span class={styles.meta}>{option.meta}</span>
                          </Show>
                        </div>
                      )}
                    </For>
                  </div>
                )}
              </For>
            </div>
            <div class={styles.footer}><Slot name="footer" /></div>
          </div>
        </div>
      </div>
      <span class={fields.affix} data-affix="suffix"><Slot name="suffix" /></span>
    </div>
  );
}
