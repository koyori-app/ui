/* 接頭辞と role の決定はここに置き、ブラウザーなしで検証する。 */

export type AlertVariant = 'danger' | 'warning' | 'info' | 'success';

const DEFAULT_PREFIXES: Record<AlertVariant, string> = {
  danger: 'エラー',
  warning: '注意',
  info: 'お知らせ',
  success: '完了',
};

/* 色だけに意味を頼らないため接頭辞は必須。空文字・空白だけなら既定に戻す。 */
export function alertPrefix(variant: AlertVariant | undefined, prefix: string | undefined) {
  return prefix && prefix.trim() ? prefix : DEFAULT_PREFIXES[variant ?? 'danger'];
}

/* 失敗と注意は割り込んで読ませ、案内と完了は進行中の読み上げを待つ。 */
export function alertRole(variant: AlertVariant | undefined) {
  return variant === 'info' || variant === 'success' ? 'status' : 'alert';
}
