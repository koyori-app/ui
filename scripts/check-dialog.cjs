// No browser needed: node scripts/check-dialog.cjs（pnpm build のあとに実行する）
const assert = require('node:assert/strict');
const { mkdtempSync, rmSync, readFileSync } = require('node:fs');
const { execFileSync } = require('node:child_process');
const { tmpdir } = require('node:os');
const { join, resolve } = require('node:path');

const root = resolve(__dirname, '..');
const compiled = mkdtempSync(join(tmpdir(), 'koyori-dialog-'));
let dialog;
try {
  execFileSync(process.execPath, [require.resolve('typescript/bin/tsc'), '--ignoreConfig',
    '--module', 'commonjs', '--target', 'ES2022', '--skipLibCheck', '--outDir', compiled,
    resolve(root, 'components/Dialog/dialog.ts')], { stdio: 'inherit' });
  dialog = require(join(compiled, 'dialog.js'));
} finally {
  rmSync(compiled, { recursive: true, force: true });
}
const { syncDialog } = dialog;

// サーバー描画では ref が null のまま呼ばれる。
syncDialog(null, true);

function fake(open) {
  return { open, calls: [], showModal() { this.calls.push('showModal'); this.open = true; }, close() { this.calls.push('close'); this.open = false; } };
}
const opening = fake(false);
syncDialog(opening, true);
syncDialog(opening, true);
assert.deepEqual(opening.calls, ['showModal'], '開いた状態で再同期しても showModal を繰り返さない');
const closing = fake(true);
syncDialog(closing, false);
syncDialog(closing, false);
assert.deepEqual(closing.calls, ['close'], '閉じた状態で再同期しても close を繰り返さない');

const read = (path) => readFileSync(resolve(root, path), 'utf8');

const vue = read('packages/vue/src/generated/components/Dialog/Dialog.vue');
assert.match(vue, /syncDialog/, 'Vue 版が開閉の同期を呼ぶ');
assert.match(vue, /addEventListener\(\s*["']close["']/, 'Vue 版が close イベントを受ける');
assert.doesNotMatch(vue, /<dialog[^>]*:open=/s, 'open 属性をバインドしない（非モーダルになるため）');
assert.match(vue, /<slot name="actions"/, 'actions スロットがある');

const react = read('packages/react/src/generated/components/Dialog/Dialog.tsx');
assert.match(react, /addEventListener\(\s*["']close["']/, 'React 版が close イベントを受ける');
assert.match(react, /onPointerDown=\{/, 'React 版が背景クリックを受ける');
assert.doesNotMatch(react, /<dialog[^>]*\sopen=/s, 'open 属性をバインドしない');

const confirmVue = read('packages/vue/src/generated/components/ConfirmDialog/ConfirmDialog.vue');
assert.doesNotMatch(confirmVue, /:actions=/, 'Vue 版が actions を壊れた属性として渡していない');

for (const framework of ['vue', 'react']) {
  const css = read(`packages/${framework}/dist/style.css`);
  assert.match(css, /dialog:modal/, `${framework}: 背景のスクロールを止める規則がある`);
  assert.match(css, /@starting-style/, `${framework}: 開くときのアニメーションがある`);
  assert.match(css, /--koyori-dialog-width/, `${framework}: ダイアログ幅のトークンがある`);
}

console.log('Dialog の開閉同期、生成物の構造、配布 CSS の規則を確認しました。');
