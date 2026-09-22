// Run after pnpm build-storybook. See README for the external Playwright setup.
const assert = require('node:assert/strict');
const { spawn, execFileSync } = require('node:child_process');
const { mkdtempSync, rmSync, readFileSync, readdirSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join, resolve } = require('node:path');

const root = resolve(__dirname, '..');
const compiled = mkdtempSync(join(tmpdir(), 'koyori-icon-picker-'));
let iconPicker;
try {
  execFileSync(process.execPath, [require.resolve('typescript/bin/tsc'), '--ignoreConfig',
    '--module', 'commonjs', '--target', 'ES2022', '--skipLibCheck', '--outDir', compiled,
    resolve(root, 'components/IconPicker/icon-picker.ts')], { stdio: 'inherit' });
  iconPicker = require(join(compiled, 'icon-picker.js'));
} finally {
  rmSync(compiled, { recursive: true, force: true });
}
const { uniqueEmojis, nextIndex } = iconPicker;

assert.deepEqual(uniqueEmojis(['🌱', '📘', '🌱']), ['🌱', '📘'], '重複は最初の位置を残して除く');
assert.deepEqual(uniqueEmojis([]), []);
assert.deepEqual(uniqueEmojis(undefined), [], '未指定は空の一覧');

// 6 件 / 3 列の並び: 0 1 2 / 3 4 5
assert.equal(nextIndex(0, 'ArrowRight', 3, 6), 1);
assert.equal(nextIndex(2, 'ArrowRight', 3, 6), 3, '行をまたいで次へ進む');
assert.equal(nextIndex(0, 'ArrowLeft', 3, 6), 0, '先頭で止まる');
assert.equal(nextIndex(5, 'ArrowRight', 3, 6), 5, '末尾で止まる');
assert.equal(nextIndex(1, 'ArrowDown', 3, 6), 4, '1 行ぶん下へ');
assert.equal(nextIndex(4, 'ArrowUp', 3, 6), 1, '1 行ぶん上へ');
assert.equal(nextIndex(1, 'ArrowUp', 3, 6), 1, '上の行が無ければ止まる');
assert.equal(nextIndex(4, 'ArrowDown', 3, 6), 4, '下の行が無ければ止まる');
assert.equal(nextIndex(4, 'Home', 3, 6), 0);
assert.equal(nextIndex(1, 'End', 3, 6), 5);
assert.equal(nextIndex(1, 'Enter', 3, 6), 1, '扱わないキーは動かさない');
assert.equal(nextIndex(2, 'ArrowDown', 1, 6), 3, '1 列なら 1 つ下');
assert.equal(nextIndex(2, 'ArrowDown', 0, 6), 3, '列数が取れなくても 1 つ下へ');
assert.equal(nextIndex(9, 'ArrowLeft', 3, 6), 4, '範囲外の現在地は末尾に寄せる');
assert.equal(nextIndex(-3, 'ArrowRight', 3, 6), 1, '負の現在地は先頭に寄せる');
assert.equal(nextIndex(0, 'ArrowRight', 3, 0), -1, '候補が無ければ移動しない');

const read = (path) => readFileSync(resolve(root, path), 'utf8');
for (const [name, path] of [['Vue', 'packages/vue/src/generated/components/IconPicker/IconPicker.vue'], ['React', 'packages/react/src/generated/components/IconPicker/IconPicker.tsx']]) {
  const source = read(path);
  assert.match(source, /aria-pressed/, `${name} 版は選択中の候補を伝える`);
  assert.match(source, /role="group"/, `${name} 版はまとまりとして読み上げる`);
  assert.match(source, /role="img"/, `${name} 版はプレビューを画像として読み上げる`);
  assert.match(source, /type="file"/, `${name} 版に画像の入力欄がある`);
  assert.match(source, /nextIndex/, `${name} 版も同じ移動の計算を通す`);
}
console.log('IconPicker の候補の整理とキー移動、生成物を確認しました。');

const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const port = process.env.ICON_PICKER_TEST_PORT || '16328';
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
    const axe = readdirSync(resolve(root, 'node_modules/.pnpm')).find((name) => name.startsWith('axe-core@'));
    assert(axe, 'Storybook が入れた axe-core を使う');
    const axeSource = readFileSync(resolve(root, `node_modules/.pnpm/${axe}/node_modules/axe-core/axe.min.js`), 'utf8');
    browser = await chromium.launch({ headless: true });

    for (const framework of ['react', 'vue']) {
      const page = await browser.newPage({ viewport: { width: 800, height: 700 } });
      const errors = [];
      page.on('pageerror', (error) => errors.push(error.message));
      page.on('console', (message) => {
        // 読み込み失敗の Story はわざと 404 を起こす。その 1 件だけは数えない。
        if (message.type() !== 'error' || message.location()?.url?.includes('koyori-missing-icon')) return;
        errors.push(message.text());
      });
      const group = page.getByRole('group', { name: 'プロジェクトのアイコン' });
      const options = page.getByRole('group', { name: '絵文字の候補' }).getByRole('button');
      const story = async (name) => {
        await page.goto(`${base}/packages/${framework}/storybook-static/iframe.html?id=components-iconpicker--${name}&viewMode=story`);
        await group.waitFor();
      };
      const a11y = async () => {
        // Keep our instance separate from the addon, which may replace window.axe.
        await page.addScriptTag({ content: `${axeSource}\nwindow.iconPickerAxe = window.axe;` });
        const violations = await page.evaluate(async () => (await window.iconPickerAxe.run(document.querySelector('#storybook-root'))).violations.map((v) => ({ id: v.id, targets: v.nodes.map((n) => n.target) })));
        assert.deepEqual(violations, []);
      };
      const pressed = () => options.evaluateAll((buttons) => buttons.filter((button) => button.getAttribute('aria-pressed') === 'true').map((button) => button.getAttribute('aria-label')));
      const focusedLabel = () => page.evaluate(() => document.activeElement?.getAttribute('aria-label'));

      await story('default');
      assert.equal(await options.count(), 6);
      assert.deepEqual(await pressed(), ['📘'], '選択中はひとつだけ');
      assert.equal(await page.getByRole('img').getAttribute('aria-label'), '絵文字 📘');
      await options.nth(4).click();
      assert.deepEqual(await pressed(), ['🚀'], '選び直しても選択はひとつ');
      assert.equal(await page.getByRole('img').getAttribute('aria-label'), '絵文字 🚀');
      await a11y();

      // roving tabindex。一覧に入るのは現在の候補。
      assert.deepEqual(await options.evaluateAll((buttons) => buttons.map((button) => button.tabIndex)), [-1, -1, -1, -1, 0, -1]);
      await options.nth(4).focus();
      await page.keyboard.press('ArrowRight');
      assert.equal(await focusedLabel(), '🧪');
      await page.keyboard.press('ArrowRight');
      assert.equal(await focusedLabel(), '🧪', '末尾では止まる');
      await page.keyboard.press('Home');
      assert.equal(await focusedLabel(), '🌱');
      await page.keyboard.press('ArrowLeft');
      assert.equal(await focusedLabel(), '🌱', '先頭では止まる');
      await page.keyboard.press('End');
      assert.equal(await focusedLabel(), '🧪');

      // ↑ ↓ は列数ぶん動く。列数は折り返しの結果から求める。
      await story('many-emojis');
      const columns = await page.getByRole('group', { name: '絵文字の候補' }).evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(' ').length);
      assert(columns > 1 && columns < 14, '折り返しが起きる幅で確かめる');
      const labels = await options.evaluateAll((buttons) => buttons.map((button) => button.getAttribute('aria-label')));
      await options.first().focus();
      await page.keyboard.press('ArrowDown');
      assert.equal(await focusedLabel(), labels[columns], '1 行ぶん下へ移る');
      await page.keyboard.press('ArrowUp');
      assert.equal(await focusedLabel(), labels[0], '1 行ぶん上へ戻る');
      await page.keyboard.press('ArrowUp');
      assert.equal(await focusedLabel(), labels[0], '上の行が無ければ止まる');
      await a11y();

      // 画像は絵文字より優先し、削除ボタンは画像があるときだけ出す。
      await story('with-image');
      assert.equal(await page.getByRole('img').getAttribute('aria-label'), '画像のアイコン');
      assert.deepEqual(await pressed(), [], '画像のときはどの候補も押されていない');
      const remove = page.getByRole('button', { name: '画像を削除', exact: true });
      assert.equal(await remove.count(), 1);
      await a11y();
      await remove.click();
      assert.equal(await page.getByRole('img').getAttribute('aria-label'), '絵文字 📘', '削除すると絵文字に戻る');
      assert.equal(await remove.count(), 0, '画像が無ければ削除ボタンは出さない');

      // ファイルはボタンから選ぶ。入力欄は Tab にも読み上げにも出さない。
      await story('default');
      const file = page.locator('input[type="file"]');
      assert.equal(await file.getAttribute('accept'), 'image/*');
      assert.equal(await file.getAttribute('aria-hidden'), 'true');
      assert.equal(await file.evaluate((el) => el.tabIndex), -1);
      await file.setInputFiles({ name: 'icon.png', mimeType: 'image/png', buffer: Buffer.from('89504e470d0a1a0a', 'hex') });
      await page.waitForFunction(() => document.querySelector('output')?.textContent === 'icon.png / image/png');
      assert.equal(await file.inputValue(), '', '同じファイルをもう一度選べるよう値を戻す');
      assert.equal(await page.getByRole('img').getAttribute('aria-label'), '画像のアイコン');

      // 壊れた URL では status で知らせ、絵文字に戻す。
      await story('image-error');
      await page.waitForFunction(() => !!document.querySelector('[role="group"] [role="status"]')?.textContent);
      assert.equal(await group.getByRole('status').innerText(), '画像を読み込めませんでした');
      assert.equal(await page.getByRole('img').getAttribute('aria-label'), '絵文字 📘');
      await a11y();

      await story('disabled');
      assert.deepEqual(await options.evaluateAll((buttons) => buttons.map((button) => button.disabled)), [true, true, true, true, true, true]);
      assert(await page.getByRole('button', { name: '画像を選ぶ', exact: true }).isDisabled());
      await a11y();

      assert.deepEqual(errors, []);
      await page.close();
      console.log(`${framework}: IconPicker の選択、roving tabindex と矢印・Home/End、画像の優先と削除、ファイル選択、読み込み失敗、無効、axe を確認しました。`);
    }
  } finally {
    await browser?.close();
    server.kill();
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
