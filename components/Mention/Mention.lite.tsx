import { Show, useStore } from '@builder.io/mitosis';
import { avatarInitials } from '../Avatar/avatar';
import { mentionClassNames } from './mention';
import type { MentionAvatar, MentionStatus } from './mention';

export interface MentionProps {
  /** 見える字。`@` も含めてそのまま出す（例: `@taro`、`@（退会した利用者）`）。 */
  label: string;
  /** 既定 member。 */
  status?: MentionStatus;
  /** 本人へのメンション。status が member のときだけ効く。 */
  self?: boolean;
  /** 渡すと頭にアバターを出す。定型の句の札では省く。 */
  avatar?: MentionAvatar | null;
  /** 渡すと a 要素（リンク）にする。 */
  href?: string;
}

export default function Mention(props: MentionProps) {
  /* prop と同じ名の getter は作らない（Vue ではどちらもテンプレートの名前になる）。 */
  const state = useStore({
    get className() {
      return mentionClassNames(props.status, props.self).join(' ');
    },
    get initials() {
      return props.avatar ? avatarInitials(props.avatar.name) : '';
    },
  });

  /* 固定 class の CSS（mention.css）で描く。role・aria-* は付けず、読み上げは見える字（label）だけにする。
     アバターは装飾なので aria-hidden。画像の失敗時の切り替えは、HTML と同じ構造を保つため入れない。 */
  return (
    <>
      <Show when={props.href}>
        <a class={state.className} href={props.href}>
          <Show when={props.avatar}>
            <span class="koyori-mention-avatar" data-initials={state.initials} aria-hidden="true">
              <Show when={props.avatar?.src}><img src={props.avatar?.src ?? undefined} alt="" /></Show>
            </span>
          </Show>
          <span class="koyori-mention-label">{props.label}</span>
        </a>
      </Show>
      <Show when={!props.href}>
        <span class={state.className}>
          <Show when={props.avatar}>
            <span class="koyori-mention-avatar" data-initials={state.initials} aria-hidden="true">
              <Show when={props.avatar?.src}><img src={props.avatar?.src ?? undefined} alt="" /></Show>
            </span>
          </Show>
          <span class="koyori-mention-label">{props.label}</span>
        </span>
      </Show>
    </>
  );
}
