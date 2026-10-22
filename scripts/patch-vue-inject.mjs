import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Mitosis の Vue 生成器は useContext を既定値なしの inject(key) にするため、Field の外では Vue が
// `injection "Symbol()" not found` を警告する。Field の外では undefined を受け取る設計なので、既定値を明示する。
const dir = fileURLToPath(new URL('../packages/vue/src/generated/components', import.meta.url));
let patched = 0;
for (const file of readdirSync(dir, { recursive: true })) {
  if (!file.endsWith('.vue')) continue;
  const path = join(dir, file);
  const source = readFileSync(path, 'utf8');
  const next = source.replaceAll('inject(FieldContext.key)', 'inject(FieldContext.key, undefined)');
  if (next !== source) { writeFileSync(path, next); patched++; }
}
if (!patched) throw new Error('inject(FieldContext.key) が見つかりません。Mitosis の Vue 出力が変わっていないか確認してください。');
