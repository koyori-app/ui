import { Show, useContext, useDefaultProps, useRef, useStore } from '@builder.io/mitosis';
import EyeIcon from '../EyeIcon/EyeIcon.lite';
import EyeOffIcon from '../EyeOffIcon/EyeOffIcon.lite';
import FieldContext from '../Field/field.context.lite';
import { getFieldContext } from '../Field/field';
import { captureSelection, passwordToggleLabel, restoreSelection } from './password-input';
import controls from '../shared/control.module.css';
import styles from '../Field/field.module.css';

export interface PasswordInputProps {
  /** Field の中では Field の id を使う。 */
  id?: string;
  /** Field の外で使うときは必須。 */
  ariaLabel?: string;
  name?: string;
  value?: string;
  placeholder?: string;
  /** 'current-password'（ログイン）か 'new-password'（登録・変更）を推奨。パスワード管理ツールが使い分ける。既定なし。 */
  autocomplete?: string;
  disabled?: boolean;
  readOnly?: boolean;
  /** 入力のたびに呼ばれる。値は利用側が持つ。 */
  onValueChange?: (value: string) => void;
  /** 表示中か。省略すると内部で状態を持つ（defaultVisible が初期値）。 */
  visible?: boolean;
  defaultVisible?: boolean;
  onVisibleChange?: (visible: boolean) => void;
  /** 切り替えボタンの読み上げ名。状態は aria-pressed で伝えるため名前は変えない。既定 'パスワードを表示'。 */
  toggleLabel?: string;
}

/* Input を合成せず、Input と同じ markup を Field の共通 CSS で直接組む。親 lite から子の suffix スロットへ
   JSX を渡す手段が無いため（ConfirmDialog が Button を挟まないのと同じ判断）。 */
export default function PasswordInput(props: PasswordInputProps) {
  // Vue otherwise casts an omitted Boolean prop to false.
  useDefaultProps({ visible: undefined });
  const field = useContext(FieldContext);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const state = useStore({
    storedVisible: props.defaultVisible ?? false,
    get context() {
      return getFieldContext(field);
    },
    get toggleLabel() {
      return passwordToggleLabel(props.toggleLabel);
    },
    isVisible() {
      return props.visible ?? state.storedVisible;
    },
    toggle() {
      const selection = captureSelection(inputRef);
      const next = !state.isVisible();
      /* 制御されているときは親の返事を待ち、内部状態は動かさない。 */
      if (props.visible === undefined) state.storedVisible = next;
      props.onVisibleChange?.(next);
      /* type を入れ替えるとカーソル位置が失われる。Vue・React とも描画が終わったあとに戻す。 */
      requestAnimationFrame(() => restoreSelection(inputRef, selection));
    },
    /* React は onChange のない制御入力を警告し、Vue の change は確定時にしか届かない。両方を受けて input だけ扱う。 */
    change(event: { type: string; target: EventTarget | null }) {
      if (event.type !== 'input' || props.disabled || props.readOnly) return;
      props.onValueChange?.((event.target as HTMLInputElement).value);
    },
  });

  /* 枠と背景は外側の group が描く。フォーカス枠は :has() で入力欄だけを見るので、ボタンでは二重にならない。 */
  return (
    <span class={styles.group}>
      <input
        ref={inputRef!}
        class={styles.control}
        type={state.isVisible() ? 'text' : 'password'}
        id={state.context?.id ?? props.id}
        name={props.name}
        value={props.value}
        placeholder={props.placeholder}
        autoComplete={props.autocomplete}
        disabled={props.disabled}
        readOnly={props.readOnly}
        required={state.context?.required}
        aria-label={props.ariaLabel}
        aria-describedby={state.context?.describedBy}
        aria-invalid={state.context?.invalid || undefined}
        onInput={(event) => state.change(event)}
        onChange={(event) => state.change(event)}
      />
      <span class={styles.affix} data-affix="suffix">
        <button type="button" class={controls.button} data-variant="ghost" data-icon-only="true"
          aria-label={state.toggleLabel}
          aria-pressed={state.isVisible() ? 'true' : 'false'}
          disabled={props.disabled}
          onClick={() => state.toggle()}
        >
          <span class={controls.surface}>
            <Show when={state.isVisible()}><EyeOffIcon /></Show>
            <Show when={!state.isVisible()}><EyeIcon /></Show>
          </span>
        </button>
      </span>
    </span>
  );
}
