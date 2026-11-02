export const AVATAR_DEFAULT_SIZE = 32;

/** 円の直径と、イニシャル・+N の文字サイズを揃える。 */
export function avatarSizeStyle(size?: number) {
  const px = size ?? AVATAR_DEFAULT_SIZE;
  return { width: `${px}px`, height: `${px}px`, fontSize: `${Math.round(px / 2.5)}px` };
}

/** 絵文字の修飾や結合で 1 文字が複数のコードポイントになっても分割しない。 */
function firstGrapheme(word: string) {
  if (typeof Intl.Segmenter !== 'function') return [...word][0] ?? '';
  const { value } = new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(word)[Symbol.iterator]().next();
  return value?.segment ?? '';
}

/** 空白で区切られた語の先頭を2つまで使う。区切りのない名前は先頭の1文字。 */
export function avatarInitials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  return words.slice(0, 2).map(firstGrapheme).join('');
}
