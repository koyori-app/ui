import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// Mitosis の Slot は name と子しか Vue に出さず、v-for の行の項目をスロットへ渡せない。
// Dropdown の項目のアイコンは、React 用の {item.icon} を Vue では item-icon スロットに置き換える。
// スロットを渡していない Dropdown は、アイコンの無いメニューと同じ見た目（箱なし、ラジオは先頭の点）にするため、
// hasIcons を使う表示条件の全部にスロットの有無を加える。
const path = fileURLToPath(new URL('../packages/vue/src/generated/components/Dropdown/Dropdown.vue', import.meta.url));
let source = readFileSync(path, 'utf8');
const withSlot = `(hasIcons && !!$slots['item-icon'])`;
const replacements = [
  [/\{\{\s*item\.icon\s*\}\}/g, '<slot v-if="item.icon" name="item-icon" :item="item" />'],
  [/v-if="item\.kind === 'radio' && !hasIcons"/g, `v-if="item.kind === 'radio' && !${withSlot}"`],
  [/v-if="hasIcons"/g, `v-if="${withSlot}"`],
  [/v-if="item\.kind === 'radio' && hasIcons"/g, `v-if="item.kind === 'radio' && ${withSlot}"`],
];
for (const [pattern, replacement] of replacements) {
  const count = source.match(pattern)?.length ?? 0;
  if (count !== 1) throw new Error(`Dropdown.vue の ${pattern} が ${count} 箇所です（1 箇所のはず）。Mitosis の Vue 出力が変わっていないか確認してください。`);
  source = source.replace(pattern, replacement);
}
writeFileSync(path, source);
