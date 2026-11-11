import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// Mitosis の Slot は name と子しか Vue に出さず、v-for の行の項目をスロットへ渡せない。
// Picker の行のアイコンは、React 用の {item.icon} を Vue では item-icon スロットに置き換える。
// icon が真値でもスロットを渡していない Picker では、幅 0 の span と gap の分のずれが残らないよう、
// 表示条件にもスロットの有無を加える。
const path = fileURLToPath(new URL('../packages/vue/src/generated/components/Picker/Picker.vue', import.meta.url));
let source = readFileSync(path, 'utf8');
const replacements = [
  [/\{\{\s*item\.icon\s*\}\}/g, '<slot name="item-icon" :item="item" />'],
  [/v-if="!avatars && item\.icon"/g, `v-if="!avatars && item.icon && $slots['item-icon']"`],
];
for (const [pattern, replacement] of replacements) {
  const count = source.match(pattern)?.length ?? 0;
  if (count !== 1) throw new Error(`Picker.vue の ${pattern} が ${count} 箇所です（1 箇所のはず）。Mitosis の Vue 出力が変わっていないか確認してください。`);
  source = source.replace(pattern, replacement);
}
writeFileSync(path, source);
