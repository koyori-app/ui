import { Show, useStore } from '@builder.io/mitosis';
import { mentionClassNames } from './mention';
import type { MentionStatus } from './mention';

export interface MentionProps {
  /** 見える字。`@` も含めてそのまま出す（例: `@taro`、`@（退会した利用者）`）。 */
  label: string;
  /** 既定 member。 */
  status?: MentionStatus;
  /** 本人へのメンション。status が member のときだけ効く。 */
  self?: boolean;
  /** 渡すと a 要素（リンク）にする。 */
  href?: string;
}

export default function Mention(props: MentionProps) {
  /* prop と同じ名の getter は作らない（Vue ではどちらもテンプレートの名前になる）。 */
  const state = useStore({
    get className() {
      return mentionClassNames(props.status, props.self).join(' ');
    },
  });

  /* 固定 class の CSS（mention.css）で描く。role・aria-* は付けず、読み上げは見える字（label）だけにする。
     根を 1 つにするため、a と span は v-if / v-else の連鎖にする（fragment だと Vue が class・data-* などの非 props 属性を落とす）。 */
  return (
    <Show
      when={props.href}
      else={
        <span class={state.className}>
          <span class="koyori-mention-label">{props.label}</span>
        </span>
      }
    >
      <a class={state.className} href={props.href}>
        <span class="koyori-mention-label">{props.label}</span>
      </a>
    </Show>
  );
}
