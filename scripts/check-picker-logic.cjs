// No browser needed: node scripts/check-picker-logic.cjs
const assert = require('node:assert/strict');
const { mkdtempSync, rmSync } = require('node:fs');
const { execFileSync } = require('node:child_process');
const { tmpdir } = require('node:os');
const { join, resolve } = require('node:path');
const compiled = mkdtempSync(join(tmpdir(), 'koyori-picker-logic-'));
let picker;
try {
  execFileSync(process.execPath, [require.resolve('typescript/bin/tsc'), '--ignoreConfig',
    '--module', 'commonjs', '--target', 'ES2022', '--skipLibCheck', '--outDir', compiled,
    resolve(__dirname, '../components/Picker/picker.ts')], { stdio: 'inherit' });
  picker = require(join(compiled, 'Picker/picker.js'));
} finally {
  rmSync(compiled, { recursive: true, force: true });
}
const { pickerValues, pickerOptions } = picker;

const items = [
  { value: 'a', label: 'Frontend' },
  { value: 'b', label: 'Backend', disabled: true },
  { value: 'c', label: 'Front desk' },
];
assert.deepEqual(pickerValues(items, ['missing', 'c', 'a'], false), ['a']);
assert.deepEqual(pickerValues(items, ['missing', 'c', 'a'], true), ['a', 'c']);
assert.deepEqual(pickerOptions([], [], ''), []);
const rows = pickerOptions(items, ['a', 'c'], ' ＦＲＯＮＴ ');
assert.deepEqual(rows.map(row => [row.sourceIndex, row.selected, row.above, row.below]), [
  [0, true, false, true], [2, true, true, false],
]);
items[0].label = 'Design';
assert.deepEqual(pickerOptions(items, ['a'], 'front').map(row => row.value), ['c'], 'in-place label changes are not cached');
assert.equal(pickerOptions(items, ['b'], '')[1].disabled, true);
const withImages = [{ value: 'a', label: '山田 太郎', src: 'photo.svg' }, { value: 'b', label: '佐藤 花子' }];
assert.deepEqual(pickerOptions(withImages, [], '').map(row => row.src), ['photo.svg', undefined], 'rows keep the item image');

function readsFor(size) {
  let reads = 0;
  const items = Array.from({ length: size }, (_, i) => ({ get value() { reads++; return String(i); }, label: `Team ${i}` }));
  const selected = Array.from({ length: size }, (_, i) => String(i));
  const rows = pickerOptions(items, pickerValues(items, selected, true), '');
  assert.equal(rows.length, size);
  assert(rows.at(-1).selected);
  return reads;
}
assert(readsFor(2002) <= readsFor(1001) * 2 + 2, 'selection and row derivation scale linearly');
console.log('Picker normalization, selection, filtered neighbours, mutations and 1,001+ options passed.');
