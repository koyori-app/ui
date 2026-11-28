import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// Mitosis の Slot は name と子しか Vue に出さず、v-for の行の項目をスロットへ渡せない。
// UserPanel の項目のアイコンは、React 用の {item.icon} を Vue では item-icon スロットに置き換える。
// スロットを渡していない UserPanel は、アイコンの箱を出さないため、hasIcons の判定にスロットの有無を加える。
// 項目は href の有無で <a> と <button> の 2 通りに描くので、どちらも 2 箇所ずつある。
const path = fileURLToPath(new URL('../packages/vue/src/generated/components/UserPanel/UserPanel.vue', import.meta.url));
let source = readFileSync(path, 'utf8');
const replacements = [
  [/\{\{\s*item\.icon\s*\}\}/g, '<slot v-if="item.icon" name="item-icon" :item="item" />'],
  [/v-if="hasIcons"/g, `v-if="hasIcons && !!$slots['item-icon']"`],
];
for (const [pattern, replacement] of replacements) {
  const count = source.match(pattern)?.length ?? 0;
  if (count !== 2) throw new Error(`UserPanel.vue の ${pattern} が ${count} 箇所です（2 箇所のはず）。Mitosis の Vue 出力が変わっていないか確認してください。`);
  source = source.replace(pattern, replacement);
}
writeFileSync(path, source);
