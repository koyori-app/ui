/** いま入れる者・外れた者・退会した者・名の引けぬ者。本人は member に `self` を重ねる。 */
export type MentionStatus = 'member' | 'outside' | 'gone' | 'unknown';

export interface MentionAvatar {
  /** 頭文字（avatarInitials）に使う名。 */
  name: string;
  /** 画像の URL。null・空・省略なら頭文字だけ。URL の安全性は利用側で確かめる。 */
  src?: string | null;
}

/** 固定 class の全集合。サニタイザーの許可リストにそのまま使える。 */
export const MENTION_CLASS_NAMES = [
  'koyori-mention',
  'koyori-mention-member',
  'koyori-mention-outside',
  'koyori-mention-gone',
  'koyori-mention-unknown',
  'koyori-mention-self',
  'koyori-mention-avatar',
  'koyori-mention-label',
] as const;

const STATUSES: readonly string[] = ['member', 'outside', 'gone', 'unknown'];

/**
 * 札の要素に付ける class。省略は member。知らない値は unknown に倒す（入力の値をそのまま class にしない）。
 * self は member のときだけ付ける。
 */
export function mentionClassNames(status?: string | null, self?: boolean): string[] {
  const resolved = status === undefined || status === null ? 'member' : STATUSES.includes(status) ? status : 'unknown';
  const classNames = ['koyori-mention', `koyori-mention-${resolved}`];
  if (resolved === 'member' && self) classNames.push('koyori-mention-self');
  return classNames;
}
