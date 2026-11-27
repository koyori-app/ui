/* 候補の整理・検索・キー移動の計算と、絵文字データの読み込みはここに置き、ブラウザーなしで検証する。 */
import type { EmojiGroupData } from './emoji-data';

export interface EmojiEntry {
  emoji: string;
  /** 読み上げ名。データに無い絵文字は絵文字そのもの。 */
  name: string;
  /** 名前とタグを正規化して改行でつないだもの。 */
  search: string;
}

export interface EmojiSection {
  label: string;
  entries: EmojiEntry[];
  /** 最初のセルの通し番号。 */
  start: number;
}

export interface EmojiCatalog {
  sections: EmojiSection[];
  byKey: Map<string, EmojiEntry>;
}

/* 同じ絵文字が二重に並ばないようにする。順番は最初に出てきた位置を保つ。 */
export function uniqueEmojis(list: string[] | undefined) {
  return list ? [...new Set(list)] : [];
}

/* 異体字セレクタ（U+FE0F）の有無で別の絵文字として扱わない。 */
export function emojiKey(emoji: string | undefined) {
  return (emoji ?? '').replace(/️/g, '');
}

/* 全角・半角、大文字・小文字、ひらがな・カタカナの違いを無視して比べる。 */
export function normalizeEmojiQuery(text: string) {
  return text
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[ぁ-ゖ]/g, (char) => String.fromCharCode(char.charCodeAt(0) + 0x60))
    .trim();
}

function entry(emoji: string, name: string, tags: string): EmojiEntry {
  return { emoji, name, search: normalizeEmojiQuery(`${name}\n${tags.split(' ').join('\n')}`) };
}

function withStarts(sections: { label: string; entries: EmojiEntry[] }[]): EmojiSection[] {
  let start = 0;
  return sections.map((section) => {
    const result = { ...section, start };
    start += section.entries.length;
    return result;
  });
}

export function buildEmojiCatalog(data: EmojiGroupData[]): EmojiCatalog {
  const byKey = new Map<string, EmojiEntry>();
  const sections = withStarts(data.map(([label, rows]) => ({
    label,
    entries: rows.map(([emoji, name, tags]) => {
      const item = entry(emoji, name, tags);
      byKey.set(emojiKey(emoji), item);
      return item;
    }),
  })));
  return { sections, byKey };
}

/* 読み込みは 1 つだけ持つ。成功した結果は残し、失敗は持ち越さず次の呼び出しで読み直す。 */
export function createEmojiLoader(importer: () => Promise<EmojiGroupData[]>) {
  let pending: Promise<EmojiCatalog> | null = null;
  let loaded: EmojiCatalog | null = null;
  return {
    load() {
      if (loaded) return Promise.resolve(loaded);
      pending ??= importer().then(
        (data) => {
          loaded = buildEmojiCatalog(data);
          return loaded;
        },
        (error: unknown) => {
          pending = null;
          throw error;
        },
      );
      return pending;
    },
    current() {
      return loaded;
    },
  };
}

const loader = createEmojiLoader(() => import('./emoji-data').then((module) => module.EMOJI_DATA));

export function loadEmojiCatalog() {
  return loader.load();
}

/* 読み込み済みならカタログ、まだなら null。 */
export function emojiCatalog() {
  return loader.current();
}

export function emojiName(emoji: string) {
  return loader.current()?.byKey.get(emojiKey(emoji))?.name ?? emoji;
}

/* おすすめの候補。データに無い絵文字（人・旗など）も出し、名前は絵文字そのものにする。 */
export function recommendedEntries(emojis: string[] | undefined): EmojiEntry[] {
  const seen = new Set<string>();
  const result: EmojiEntry[] = [];
  for (const emoji of uniqueEmojis(emojis)) {
    const key = emojiKey(emoji);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    const known = loader.current()?.byKey.get(key);
    result.push(known ? { ...known, emoji } : entry(emoji, emoji, ''));
  }
  return result;
}

/* 正規化した語を名前かタグに含むものを、並びのまま返す。同じ絵文字は最初の 1 つだけ。 */
export function searchEmojis(sections: { entries: EmojiEntry[] }[], query: string): EmojiEntry[] {
  const needle = normalizeEmojiQuery(query);
  if (!needle) return [];
  const seen = new Set<string>();
  const result: EmojiEntry[] = [];
  for (const section of sections) {
    for (const item of section.entries) {
      const key = emojiKey(item.emoji);
      if (seen.has(key) || !item.search.includes(needle)) continue;
      seen.add(key);
      result.push(item);
    }
  }
  return result;
}

let lastView: { emojis: string[] | undefined; query: string; catalog: EmojiCatalog | null; sections: EmojiSection[] } | null = null;

/* パネルに並べる節。検索中は 1 節にまとめる。描くたびに何度も呼ばれるので、直前の結果を使い回す。 */
export function pickerSections(emojis: string[] | undefined, query: string, catalog: EmojiCatalog | null): EmojiSection[] {
  if (lastView && lastView.emojis === emojis && lastView.query === query && lastView.catalog === catalog) return lastView.sections;
  const recommended = recommendedEntries(emojis);
  const base = [
    ...(recommended.length ? [{ label: 'おすすめ', entries: recommended }] : []),
    ...(catalog?.sections ?? []),
  ];
  const found = query.trim() ? searchEmojis(base, query) : [];
  /* 0 件の節は描かない。見出しだけが残ると、空のまとまりを読み上げる。 */
  const sections = withStarts(query.trim() ? (found.length ? [{ label: '検索結果', entries: found }] : []) : base);
  lastView = { emojis, query, catalog, sections };
  return sections;
}

/* 節ごとに行を折り返した 2 次元の並びでの移動先（通し番号）。端では止める。セルが無ければ -1。 */
export function nextCell(sizes: number[], index: number, key: string, columns: number, toEdge = false) {
  const total = sizes.reduce((sum, size) => sum + Math.max(0, size), 0);
  if (total <= 0) return -1;
  const step = Number.isFinite(columns) && columns >= 1 ? Math.floor(columns) : 1;
  const current = Math.min(Math.max(index, 0), total - 1);
  const starts: number[] = [];
  let offset = 0;
  for (const size of sizes) {
    starts.push(offset);
    offset += Math.max(0, size);
  }
  let section = 0;
  while (current >= starts[section] + Math.max(0, sizes[section])) section++;
  const size = sizes[section];
  const start = starts[section];
  const position = current - start;
  const row = Math.floor(position / step);
  const column = position % step;
  const find = (from: number, direction: 1 | -1) => {
    for (let candidate = from; candidate >= 0 && candidate < sizes.length; candidate += direction) {
      if (sizes[candidate] > 0) return candidate;
    }
    return -1;
  };
  switch (key) {
    case 'ArrowLeft': return Math.max(current - 1, 0);
    case 'ArrowRight': return Math.min(current + 1, total - 1);
    case 'Home': return toEdge ? 0 : start + row * step;
    case 'End': return toEdge ? total - 1 : start + Math.min(row * step + step - 1, size - 1);
    case 'ArrowDown': {
      if ((row + 1) * step < size) return start + Math.min((row + 1) * step + column, size - 1);
      const next = find(section + 1, 1);
      return next < 0 ? current : starts[next] + Math.min(column, sizes[next] - 1);
    }
    case 'ArrowUp': {
      if (row > 0) return start + (row - 1) * step + column;
      const previous = find(section - 1, -1);
      if (previous < 0) return current;
      const lastRow = Math.floor((sizes[previous] - 1) / step);
      return starts[previous] + Math.min(lastRow * step + column, sizes[previous] - 1);
    }
    default: return index;
  }
}

/* roving tabindex の位置。移動後はその位置、まだなら選択中の絵文字が最初に出る位置（画像のときは先頭）。
   候補が減っても Tab で届くセルが残るよう、必ず範囲に収める。 */
export function currentCell(activeIndex: number, entries: { emoji: string }[], emoji: string | undefined, imageUrl: string | undefined) {
  const key = emojiKey(emoji);
  const index = activeIndex >= 0 ? activeIndex : imageUrl || !key ? -1 : entries.findIndex((item) => emojiKey(item.emoji) === key);
  return Math.min(Math.max(index, 0), entries.length - 1);
}

let lastCurrent: { sections: EmojiSection[]; activeIndex: number; emoji: string | undefined; imageUrl: string | undefined; index: number } | null = null;

/* 節に分かれた並びでの currentCell。セルごとに呼ばれるので、直前の結果を使い回す。 */
export function sectionsCurrentCell(sections: EmojiSection[], activeIndex: number, emoji: string | undefined, imageUrl: string | undefined) {
  if (lastCurrent && lastCurrent.sections === sections && lastCurrent.activeIndex === activeIndex
    && lastCurrent.emoji === emoji && lastCurrent.imageUrl === imageUrl) return lastCurrent.index;
  const index = currentCell(activeIndex, sections.flatMap((section) => section.entries), emoji, imageUrl);
  lastCurrent = { sections, activeIndex, emoji, imageUrl, index };
  return index;
}
