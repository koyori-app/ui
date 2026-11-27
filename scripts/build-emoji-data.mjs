// emojibase-data の日本語のデータから、IconPicker が遅延読み込みする絵文字の一覧を作る。
// `pnpm emoji-data` で components/IconPicker/emoji-data.ts を書き直す。
// `--check` を付けると書かずに比べ、違えば終了コード 1 で終わる（CI 用）。
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const data = require('emojibase-data/ja/data.json');
const version = require('emojibase-data/package.json').version;
const target = new URL('../components/IconPicker/emoji-data.ts', import.meta.url);

/* 人と体（1）・コンポーネント（2）・旗（9）は除く。肌の色や国の選び分けは扱わない。 */
const MAX_VERSION = 15;
const GROUPS = [
  [7, '物と道具'],
  [5, '乗り物と場所'],
  [6, '活動'],
  [3, '動物と自然'],
  [4, '食べ物と飲み物'],
  [8, '記号'],
  [0, '顔と気持ち'],
];

const kept = data
  .filter((entry) => entry.group !== undefined && entry.version <= MAX_VERSION && GROUPS.some(([group]) => group === entry.group))
  .sort((a, b) => a.order - b.order);

const sections = GROUPS.map(([group, label]) => [
  label,
  kept.filter((entry) => entry.group === group).map((entry) => [entry.emoji, entry.label, (entry.tags ?? []).join(' ')]),
]);

const lines = [
  `// 生成物。手で編集しない。\`pnpm emoji-data\` で作り直す（scripts/build-emoji-data.mjs）。`,
  `// 出どころ: emojibase-data ${version} の ja/data.json（MIT。元は Unicode CLDR）。THIRD_PARTY_NOTICES.md を参照。`,
  '',
  '/** [見出し, [絵文字, 名前, 空白区切りのタグ][]] */',
  'export type EmojiGroupData = [label: string, entries: [emoji: string, name: string, tags: string][]];',
  '',
  'export const EMOJI_DATA: EmojiGroupData[] = [',
  ...sections.flatMap(([label, entries]) => [
    `  [${JSON.stringify(label)}, [`,
    ...entries.map((entry) => `    ${JSON.stringify(entry)},`),
    '  ]],',
  ]),
  '];',
  '',
];
const output = lines.join('\n');

if (process.argv.includes('--check')) {
  let current = '';
  try {
    current = readFileSync(target, 'utf8');
  } catch {}
  if (current !== output) {
    console.error('components/IconPicker/emoji-data.ts が emojibase-data から作った結果と違います。`pnpm emoji-data` で作り直してください。');
    process.exit(1);
  }
  console.log(`emoji-data.ts は最新です（${kept.length} 個）。`);
} else {
  writeFileSync(target, output);
  console.log(`emoji-data.ts を書きました（${kept.length} 個）。`);
}
