import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// Mitosis の Slot は name と子しか Vue に出さず、v-for の行の項目をスロットへ渡せない。
// Picker の行のアイコンは、React 用の {item.icon} を Vue では item-icon スロットに置き換える。
const path = fileURLToPath(new URL('../packages/vue/src/generated/components/Picker/Picker.vue', import.meta.url));
const source = readFileSync(path, 'utf8');
const pattern = /\{\{\s*item\.icon\s*\}\}/g;
const count = source.match(pattern)?.length ?? 0;
if (count !== 1) throw new Error(`Picker.vue の {{ item.icon }} が ${count} 箇所です（1 箇所のはず）。Mitosis の Vue 出力が変わっていないか確認してください。`);
writeFileSync(path, source.replace(pattern, '<slot name="item-icon" :item="item" />'));
