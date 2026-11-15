// No browser needed: node scripts/check-combobox-logic.cjs
const assert = require('node:assert/strict');
const { mkdtempSync, rmSync } = require('node:fs');
const { execFileSync } = require('node:child_process');
const { tmpdir } = require('node:os');
const { join, resolve } = require('node:path');
const compiled = mkdtempSync(join(tmpdir(), 'koyori-combobox-logic-'));
let combobox;
try {
  execFileSync(process.execPath, [require.resolve('typescript/bin/tsc'), '--ignoreConfig',
    '--module', 'commonjs', '--target', 'ES2022', '--skipLibCheck', '--outDir', compiled,
    resolve(__dirname, '../components/Combobox/combobox.ts')], { stdio: 'inherit' });
  combobox = require(join(compiled, 'combobox.js'));
} finally {
  rmSync(compiled, { recursive: true, force: true });
}
const { comboboxSections, comboboxEnabledValues, comboboxActiveValue, nextComboboxValue, comboboxLabelParts, isComposingKey } = combobox;

assert.equal(comboboxActiveValue(['', 'a'], null, false), null);
assert.equal(comboboxActiveValue(['', 'a'], '', true), '');
assert.equal(nextComboboxValue(['', 'a'], null, 'ArrowDown'), '');
assert.equal(nextComboboxValue(['', 'a'], '', 'ArrowDown'), 'a');

// comboboxSections
assert.deepEqual(comboboxSections(undefined), []);
assert.deepEqual(comboboxSections([]), []);
const flat = [{ value: 'a', label: 'A' }, { value: 'b', label: 'B', disabled: true }];
assert.deepEqual(comboboxSections(flat), [{ options: flat }], 'a flat list is wrapped in one section');
const sections = [{ heading: '条件', options: [flat[0]] }, { options: [flat[1], { value: 'c', label: 'C' }] }];
assert.equal(comboboxSections(sections), sections, 'sections pass through');

// comboboxEnabledValues
assert.deepEqual(comboboxEnabledValues(comboboxSections(sections)), ['a', 'c'], 'across sections, without disabled');
assert.deepEqual(comboboxEnabledValues([]), []);

// comboboxActiveValue
assert.equal(comboboxActiveValue(['a', 'c'], 'c', false), 'c');
assert.equal(comboboxActiveValue(['a', 'c'], 'c', true), 'c');
assert.equal(comboboxActiveValue(['a', 'c'], 'zzz', true), 'a');
assert.equal(comboboxActiveValue(['a', 'c'], '', true), 'a');
assert.equal(comboboxActiveValue(['a', 'c'], 'zzz', false), null);
assert.equal(comboboxActiveValue(['a', 'c'], null, false), null);
assert.equal(comboboxActiveValue([], 'a', true), null);
assert.equal(comboboxActiveValue([], null, false), null);

// nextComboboxValue
const en = ['a', 'b', 'c'];
assert.equal(nextComboboxValue(en, 'a', 'ArrowDown'), 'b');
assert.equal(nextComboboxValue(en, 'c', 'ArrowDown'), 'a', 'wraps past the end');
assert.equal(nextComboboxValue(en, '', 'ArrowDown'), 'a');
assert.equal(nextComboboxValue(en, '', 'ArrowUp'), 'c');
assert.equal(nextComboboxValue(en, 'a', 'ArrowUp'), 'c', 'wraps before the start');
assert.equal(nextComboboxValue(en, 'c', 'ArrowUp'), 'b');
assert.equal(nextComboboxValue([], 'a', 'ArrowDown'), null);
assert.equal(nextComboboxValue([], null, 'ArrowUp'), null);
assert.equal(nextComboboxValue(['a'], 'a', 'ArrowDown'), 'a');
assert.equal(nextComboboxValue(['a'], 'a', 'ArrowUp'), 'a');
assert.equal(nextComboboxValue(en, 'b', 'Home'), 'b', 'other keys keep the value');

// comboboxLabelParts
assert.deepEqual(comboboxLabelParts('bug', undefined), [{ text: 'bug', strong: false }]);
assert.deepEqual(comboboxLabelParts('bug', []), [{ text: 'bug', strong: false }]);
assert.deepEqual(comboboxLabelParts('bug', [[0, 1]]), [{ text: 'b', strong: true }, { text: 'ug', strong: false }]);
assert.deepEqual(comboboxLabelParts('abcdef', [[1, 3], [2, 4]]), [
  { text: 'a', strong: false }, { text: 'bcd', strong: true }, { text: 'ef', strong: false },
], 'overlapping ranges merge');
assert.deepEqual(comboboxLabelParts('abcdef', [[1, 3], [3, 5]]), [
  { text: 'a', strong: false }, { text: 'bcde', strong: true }, { text: 'f', strong: false },
], 'adjacent ranges merge');
assert.deepEqual(comboboxLabelParts('abcdef', [[3, 5], [1, 3]]), comboboxLabelParts('abcdef', [[1, 3], [3, 5]]), 'order does not matter');
assert.deepEqual(comboboxLabelParts('abc', [[2, 2], [3, 1], [-5, -1]]), [{ text: 'abc', strong: false }], 'empty, reversed and negative ranges are dropped');
assert.deepEqual(comboboxLabelParts('abc', [[1, 99]]), [{ text: 'a', strong: false }, { text: 'bc', strong: true }], 'clipped to label.length');
assert.deepEqual(comboboxLabelParts('abc', [[10, 20]]), [{ text: 'abc', strong: false }], 'wholly outside is dropped');
assert.deepEqual(comboboxLabelParts('abcd', [[0.9, 2.9]]), [{ text: 'ab', strong: true }, { text: 'cd', strong: false }], 'fractions are truncated');
assert.deepEqual(comboboxLabelParts('', undefined), [{ text: '', strong: false }]);
assert.deepEqual(comboboxLabelParts('', [[0, 3]]), [{ text: '', strong: false }]);
const emoji = 'a😀b';
assert.equal(comboboxLabelParts(emoji, [[1, 3]]).map(part => part.text).join(''), emoji, 'surrogate pairs round-trip');

let seed = 20260715;
const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 2 ** 32; };
const alphabet = ['a', 'b', 'z', 'あ', 'い', '😀', '日'];
for (let i = 0; i < 2000; i++) {
  const label = Array.from({ length: Math.floor(random() * 9) }, () => alphabet[Math.floor(random() * alphabet.length)]).join('');
  const ranges = Array.from({ length: Math.floor(random() * 4) }, () => {
    const span = label.length + 4;
    const start = Math.floor(random() * span * 1.5) - 2;
    const end = start + Math.floor(random() * span) - 1;
    return random() < 0.1 ? [start + 0.5, end + 0.5] : [start, end];
  });
  const parts = comboboxLabelParts(label, ranges);
  const where = `label=${JSON.stringify(label)} ranges=${JSON.stringify(ranges)}`;
  assert.equal(parts.map(part => part.text).join(''), label, `texts rebuild the label: ${where}`);
  assert.equal(parts.filter(part => part.text === '').length, label === '' ? 1 : 0, `empty parts only for an empty label: ${where}`);
  for (let k = 1; k < parts.length; k++) assert(!(parts[k].strong && parts[k - 1].strong), `no two strong parts in a row: ${where}`);
  const clipped = ranges
    .map(([start, end]) => [Math.max(0, Math.min(label.length, Math.trunc(start))), Math.max(0, Math.min(label.length, Math.trunc(end)))])
    .filter(([start, end]) => start < end);
  let at = 0;
  for (const part of parts) {
    for (let k = 0; k < part.text.length; k++, at++) {
      assert.equal(part.strong, clipped.some(([start, end]) => at >= start && at < end), `position ${at} strong flag: ${where}`);
    }
  }
}

// isComposingKey
assert.equal(isComposingKey({ isComposing: true }), true);
assert.equal(isComposingKey({ nativeEvent: { isComposing: true } }), true);
assert.equal(isComposingKey({ keyCode: 229 }), true);
assert.equal(isComposingKey({}), false);
assert.equal(isComposingKey({ isComposing: false, keyCode: 13, nativeEvent: { isComposing: false } }), false);

console.log('Combobox sections, active value, arrow movement, label highlight parts (2,000 random cases) and IME key detection passed.');
