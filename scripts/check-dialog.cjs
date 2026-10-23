// No browser needed: node scripts/check-dialog.cjs（pnpm build のあとに実行する）
// Storybook をビルド済みなら、続けてブラウザーでの検証も行う。DIALOG_TEST_FRAMEWORK=vue などで片方だけを検証できる。
const assert = require('node:assert/strict');
const { mkdtempSync, rmSync, readFileSync, existsSync } = require('node:fs');
const { execFileSync, spawn } = require('node:child_process');
const { tmpdir } = require('node:os');
const { join, resolve } = require('node:path');

const root = resolve(__dirname, '..');
const frameworks = ['vue', 'react'].filter((name) => !process.env.DIALOG_TEST_FRAMEWORK || name === process.env.DIALOG_TEST_FRAMEWORK);
assert(frameworks.length, 'DIALOG_TEST_FRAMEWORK は vue か react');
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

const drawerVue = read('packages/vue/src/generated/components/Drawer/Drawer.vue');
const drawerReact = read('packages/react/src/generated/components/Drawer/Drawer.tsx');

const vue = read('packages/vue/src/generated/components/Dialog/Dialog.vue');
assert.match(vue, /syncDialog/, 'Vue 版が開閉の同期を呼ぶ');
assert.match(vue, /@cancel/, 'Vue 版が Escape を cancel で受ける');
assert.doesNotMatch(vue, /<dialog[^>]*:open=/s, 'open 属性をバインドしない（非モーダルになるため）');
assert.match(vue, /<slot name="actions"/, 'actions スロットがある');

const react = read('packages/react/src/generated/components/Dialog/Dialog.tsx');
assert.match(react, /onCancel=\{/, 'React 版が Escape を cancel で受ける');
assert.match(react, /onPointerDown=\{/, 'React 版が背景クリックを受ける');
for (const [name, source] of [['Vue', vue], ['React', react]]) {
  assert.doesNotMatch(source, /addEventListener/, `${name} 版が古い props を掴むリスナーを持たない`);
}

/* React の onCancel は祖先へ伝わるため、入れ子のダイアログで親まで閉じないことを確かめる。 */
for (const [name, source] of [['Vue', vue], ['React', react], ['Vue 版 Drawer', drawerVue], ['React 版 Drawer', drawerReact]]) {
  assert.match(source, /function cancel[\s\S]*?target !== dialogRef/, `${name} が入れ子の Escape を親で受け取らない`);
  assert.match(source, /(@close|onClose)=/, `${name} がブラウザーの閉じた知らせを受ける`);
  assert.match(source, /function closed[\s\S]*?target !== dialogRef/, `${name} が入れ子の close を親で受け取らない`);
}
assert.doesNotMatch(react, /<dialog[^>]*\sopen=/s, 'open 属性をバインドしない');

assert.match(vue, /data-plain/, 'Vue 版が plain を属性で出す');
assert.match(react, /data-plain/, 'React 版が plain を属性で出す');

const confirmVue = read('packages/vue/src/generated/components/ConfirmDialog/ConfirmDialog.vue');
assert.doesNotMatch(confirmVue, /:actions=/, 'Vue 版が actions を壊れた属性として渡していない');

for (const framework of frameworks) {
  const css = read(`packages/${framework}/dist/style.css`);
  assert.match(css, /dialog:modal/, `${framework}: 背景のスクロールを止める規則がある`);
  assert.match(css, /@starting-style/, `${framework}: 開くときのアニメーションがある`);
  assert.match(css, /--koyori-dialog-width/, `${framework}: ダイアログ幅のトークンがある`);
  assert.match(css, /--koyori-dialog-height/, `${framework}: ダイアログ高さのトークンがある`);
  assert.match(css, /\[data-plain=/, `${framework}: plain の規則がある`);
}

for (const [name, source] of [['Vue', drawerVue], ['React', drawerReact]]) {
  assert.match(source, /syncDialog/, `${name} 版 Drawer が Dialog と同じ開閉の同期を呼ぶ`);
  assert.match(source, /data-placement/, `${name} 版 Drawer が placement を属性で出す`);
  assert.match(source, /aria-label/, `${name} 版 Drawer が名前を持つ`);
  assert.doesNotMatch(source, /<dialog[^>]*\s:?open=/s, `${name} 版 Drawer が open 属性をバインドしない`);
  assert.match(source, /modal\?: boolean/, `${name} 版 Drawer が modal を受け取る`);
  assert.match(source, /modal === false/, `${name} 版 Drawer が非モーダルの分岐を持つ`);
  assert.match(source, /modal: true/, `${name} 版 Drawer が modal 未指定をモーダルとして扱う`);
  assert.match(source, /(oncancel|onCancel|@cancel)/i, `${name} 版 Drawer が Escape を cancel で受ける`);
  assert.doesNotMatch(source, /addEventListener/, `${name} 版 Drawer が古い props を掴むリスナーを持たない`);
  assert.match(source, /open && (props\.)?modal !== false/, `${name} 版 Drawer が非モーダルでは dialog を開かない`);
  assert.equal(source.match(/<dialog/g).length, 1, `${name} 版 Drawer の dialog は 1 箇所だけ`);
}
assert.equal(drawerVue.match(/<slot\s*\/>/g).length, 2, 'Vue 版 Drawer はモーダルと非モーダルの両方で中身を描く');
for (const framework of frameworks) {
  const css = read(`packages/${framework}/dist/style.css`);
  for (const placement of ['top', 'bottom', 'left', 'right']) {
    assert.match(css, new RegExp(`\\[data-placement=['"]?${placement}['"]?\\]:not\\(\\[open\\]\\)`), `${framework}: Drawer が ${placement} へ閉じる位置を持つ`);
  }
  assert.match(css, /allow-discrete/, `${framework}: Drawer が閉じるときも遷移する`);
  assert.match(css, /--koyori-sidebar-radius/, `${framework}: Sidebar の角丸を親から外せる`);
  assert.match(css, /--koyori-drawer-width/, `${framework}: Drawer 幅のトークンがある`);
  assert.match(css, /:has\(\[data-sidebar-rail=['"]?true['"]?\]\)[^{]*\{[^}]*--koyori-drawer-width:\s*var\(--koyori-sidebar-rail-width\)/,
    `${framework}: 中の Sidebar がアイコンだけなら Drawer も細くなる`);
}

console.log('Dialog・Drawer の開閉同期、生成物の構造、配布 CSS の規則を確認しました。');

if (!frameworks.every((framework) => existsSync(resolve(root, `packages/${framework}/storybook-static/iframe.html`)))) {
  console.log('storybook-static がないため、ブラウザー検証は省きました（pnpm build-storybook のあとに再実行してください）。');
  return;
}

const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const port = process.env.DIALOG_TEST_PORT || '16331';
const base = `http://127.0.0.1:${port}`;
const server = spawn('python3', ['-u', '-m', 'http.server', port, '--bind', '127.0.0.1', '--directory', root], { stdio: ['ignore', 'pipe', 'pipe'] });
let browser;
(async () => {
  try {
    // 自分が立てたサーバーの起動だけを待つ。別のポートの取り違えを避ける。
    await new Promise((ready, fail) => {
      let errors = '';
      const timeout = setTimeout(() => fail(new Error(`Server ${port} did not start: ${errors}`)), 5000);
      server.stderr.on('data', (chunk) => { errors += chunk; });
      server.once('error', (error) => { clearTimeout(timeout); fail(error); });
      server.once('exit', (code) => { clearTimeout(timeout); fail(new Error(`Server ${port} exited (${code}): ${errors}`)); });
      server.stdout.on('data', (chunk) => { if (chunk.toString().includes('Serving HTTP')) { clearTimeout(timeout); ready(); } });
    });
    browser = await chromium.launch({ headless: true });

    for (const framework of frameworks) {
      const page = await browser.newPage({ viewport: { width: 800, height: 700 }, reducedMotion: 'reduce' });
      const errors = [];
      page.on('pageerror', (error) => errors.push(error.message));
      page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
      const story = (component, name) => page.goto(`${base}/packages/${framework}/storybook-static/iframe.html?id=components-${component}--${name}&viewMode=story`);
      const dialog = page.locator('dialog');
      const isOpen = () => dialog.evaluate((element) => element.open);

      // Tailwind の preflight のように利用側が margin を 0 にしても、中央に出る。
      await story('dialog', 'open');
      await page.addStyleTag({ content: 'dialog { margin: 0 }' });
      await page.waitForFunction(() => document.querySelector('dialog')?.open);
      const box = await dialog.boundingBox();
      assert(Math.abs(box.x + box.width / 2 - 400) <= 1 && Math.abs(box.y + box.height / 2 - 350) <= 1,
        `${framework}: dialog { margin: 0 } でも中央に出る（${JSON.stringify(box)}）`);

      // onClose で open を変えないなら、ブラウザーが止められずに閉じても開き直す。onClose は Escape ごとに 1 回。
      await story('dialog', 'keep-open');
      await page.getByRole('button', { name: 'ダイアログを開く' }).click();
      await page.waitForFunction(() => document.querySelector('dialog')?.open);
      await dialog.evaluate((element) => { window.dialogCloses = 0; element.addEventListener('close', () => { window.dialogCloses += 1; }); });
      await page.keyboard.press('Escape');
      await page.keyboard.press('Escape');
      await page.waitForFunction(() => window.dialogCloses > 0);
      await page.waitForTimeout(100);
      assert.equal(await isOpen(), true, `${framework}: Escape を 2 回押しても開いたまま`);
      assert.equal(await page.locator('output').textContent(), '閉じる要求: 2 回', `${framework}: onClose を cancel と close で二重に呼ばない`);
      await page.getByRole('button', { name: '閉じる' }).click();
      await page.waitForFunction(() => !document.querySelector('dialog')?.open);
      assert.equal(await page.locator('output').textContent(), '閉じる要求: 2 回', `${framework}: アプリが閉じたときは onClose を呼ばない`);

      // Drawer も同じ同期を使う。ブラウザーが閉じたらアプリへ知らせ、次に開くボタンで開き直せる。
      await story('drawer', 'left');
      const menu = page.getByRole('button', { name: 'メニューを開く' });
      await menu.click();
      await page.waitForFunction(() => document.querySelector('dialog')?.open);
      await dialog.evaluate((element) => element.close());
      await page.waitForTimeout(100);
      assert.equal(await isOpen(), false, `${framework}: アプリが閉じたなら Drawer は閉じたまま`);
      await menu.click();
      await page.waitForFunction(() => document.querySelector('dialog')?.open);

      assert.deepEqual(errors, [], `${framework}: ページエラーがない`);
      await page.close();
    }
    console.log(`Dialog の中央寄せ、ブラウザーが閉じたときの同期をブラウザー（${frameworks.join('・')}）で確認しました。`);
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  } finally {
    await browser?.close();
    server.kill();
  }
})();
