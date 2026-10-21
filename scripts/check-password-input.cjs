// No browser needed: node scripts/check-password-input.cjs（pnpm build のあとに実行する）
// Storybook をビルド済みなら、続けてブラウザーでの検証も行う。
const assert = require('node:assert/strict');
const { mkdtempSync, rmSync, readFileSync, readdirSync, existsSync } = require('node:fs');
const { execFileSync, spawn } = require('node:child_process');
const { tmpdir } = require('node:os');
const { join, resolve } = require('node:path');

const root = resolve(__dirname, '..');
const compiled = mkdtempSync(join(tmpdir(), 'koyori-password-input-'));
let password;
try {
  execFileSync(process.execPath, [require.resolve('typescript/bin/tsc'), '--ignoreConfig',
    '--module', 'commonjs', '--target', 'ES2022', '--skipLibCheck', '--lib', 'ES2022,DOM', '--outDir', compiled,
    resolve(root, 'components/PasswordInput/password-input.ts')], { stdio: 'inherit' });
  password = require(join(compiled, 'password-input.js'));
} finally {
  rmSync(compiled, { recursive: true, force: true });
}
const { PASSWORD_TOGGLE_DEFAULT_LABEL, passwordToggleLabel, captureSelection, restoreSelection } = password;

// 名前は固定。状態は aria-pressed で伝える。
assert.equal(PASSWORD_TOGGLE_DEFAULT_LABEL, 'パスワードを表示');
assert.equal(passwordToggleLabel(undefined), 'パスワードを表示', '未指定は既定');
assert.equal(passwordToggleLabel(''), 'パスワードを表示', '空文字は既定に戻す');
assert.equal(passwordToggleLabel('  '), 'パスワードを表示', '空白だけも既定に戻す');
assert.equal(passwordToggleLabel('PIN を表示'), 'PIN を表示', '明示した名前を使う');

// 控え: 選択が取れない要素や未描画では何もしない。
assert.equal(captureSelection(null), null, '要素がなければ控えない');
assert.equal(captureSelection({ selectionStart: null, selectionEnd: null, selectionDirection: null }), null, '選択を持たない要素は控えない');
assert.deepEqual(captureSelection({ selectionStart: 2, selectionEnd: 5, selectionDirection: 'backward' }), { start: 2, end: 5, direction: 'backward' });
assert.deepEqual(captureSelection({ selectionStart: 3, selectionEnd: 3, selectionDirection: null }), { start: 3, end: 3, direction: 'none' }, '向きが無ければ none');

// 復元: 値の長さに収めて setSelectionRange を呼ぶ。フォーカスは触らない。
const fake = (value) => {
  const calls = [];
  return { value, calls, setSelectionRange: (...args) => calls.push(args), focus: () => calls.push(['focus']) };
};
let target = fake('secret');
assert.equal(restoreSelection(target, { start: 1, end: 4, direction: 'forward' }), true);
assert.deepEqual(target.calls, [[1, 4, 'forward']], '控えた位置へ戻し、フォーカスは移さない');
target = fake('abc');
restoreSelection(target, { start: 5, end: 8, direction: 'none' });
assert.deepEqual(target.calls, [[3, 3, 'none']], '値が短くなっていたら末尾に収める');
target = fake('abcdef');
restoreSelection(target, { start: 4, end: 2, direction: 'none' });
assert.deepEqual(target.calls, [[4, 4, 'none']], '終わりが始まりより前にならない');
assert.equal(restoreSelection(null, { start: 0, end: 0, direction: 'none' }), false, '要素がなければ何もしない');
target = fake('abc');
assert.equal(restoreSelection(target, null), false, '控えがなければ何もしない');
assert.deepEqual(target.calls, []);

const read = (path) => readFileSync(resolve(root, path), 'utf8');

for (const [name, path] of [['Vue', 'packages/vue/src/generated/components/PasswordInput/PasswordInput.vue'], ['React', 'packages/react/src/generated/components/PasswordInput/PasswordInput.tsx']]) {
  const source = read(path);
  assert.match(source, /aria-pressed/, `${name} 版は表示状態を aria-pressed で伝える`);
  assert.match(source, /data-variant="ghost"/, `${name} 版の切り替えはアイコンだけの ghost`);
  assert.match(source, /data-icon-only="true"/, `${name} 版の切り替えは正方形`);
  assert.match(source, /'text' : 'password'|"text" : "password"/, `${name} 版は type を text と password で入れ替える`);
  assert.match(source, /EyeIcon/, `${name} 版は非表示のとき EyeIcon`);
  assert.match(source, /EyeOffIcon/, `${name} 版は表示中のとき EyeOffIcon`);
  assert.match(source, /data-affix="suffix"/, `${name} 版は Input と同じ末尾の枠に置く`);
  assert.match(source, /aria-describedby/, `${name} 版は Field の説明を受け取る`);
  assert.match(source, /aria-invalid/, `${name} 版は Field のエラーを受け取る`);
  assert.match(source, /captureSelection/, `${name} 版は切り替え前にカーソル位置を控える`);
  assert.match(source, /restoreSelection/, `${name} 版は描画後にカーソル位置を戻す`);
  assert.match(source, /passwordToggleLabel/, `${name} 版も名前を同じ補正に通す`);
  assert.doesNotMatch(source, /\.focus\(\)/, `${name} 版はフォーカスを動かさない`);
}

console.log('PasswordInput の名前・カーソル位置の控えと復元、生成物を確認しました。');

if (!['vue', 'react'].every((framework) => existsSync(resolve(root, `packages/${framework}/storybook-static/iframe.html`)))) {
  console.log('storybook-static がないため、ブラウザー検証は省きました（pnpm build-storybook のあとに再実行してください）。');
  return;
}

const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const port = process.env.PASSWORD_INPUT_TEST_PORT || '16328';
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
      page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
      const input = page.locator('#storybook-root input');
      const toggle = page.getByRole('button', { name: 'パスワードを表示', exact: true });
      const story = async (name) => {
        await page.goto(`${base}/packages/${framework}/storybook-static/iframe.html?id=components-passwordinput--${name}&viewMode=story`);
        await input.waitFor();
      };
      const a11y = async () => {
        // Keep our instance separate from the addon, which may replace window.axe.
        await page.addScriptTag({ content: `${axeSource}\nwindow.passwordAxe = window.axe;` });
        const violations = await page.evaluate(async () => (await window.passwordAxe.run(document.querySelector('#storybook-root'))).violations.map((v) => ({ id: v.id, targets: v.nodes.map((n) => n.target) })));
        assert.deepEqual(violations, []);
      };
      const active = () => page.evaluate(() => document.activeElement?.tagName.toLowerCase());

      await story('in-field');
      assert.equal(await page.getByLabel('パスワード', { exact: true }).getAttribute('type'), 'password', 'Field のラベルが入力欄に付く');
      assert.equal(await input.getAttribute('id'), 'password-in-field', 'Field の id を使う');
      assert.equal(await input.getAttribute('aria-describedby'), 'password-in-field-description', 'Field の説明を受け取る');
      assert.equal(await input.getAttribute('autocomplete'), 'current-password');
      // Tab の順は 入力欄 → 切り替えボタン。
      await page.keyboard.press('Tab');
      assert.equal(await active(), 'input', '最初の Tab は入力欄');
      await page.keyboard.type('abcdefgh');
      await page.keyboard.press('ArrowLeft');
      await page.keyboard.press('ArrowLeft');
      await page.keyboard.press('ArrowLeft');
      assert.deepEqual(await input.evaluate((el) => [el.selectionStart, el.selectionEnd]), [5, 5]);
      await page.keyboard.press('Tab');
      assert.equal(await active(), 'button', '次の Tab は切り替えボタン');
      assert.equal(await toggle.getAttribute('aria-pressed'), 'false');
      await page.keyboard.press('Enter');
      await page.waitForTimeout(100);
      assert.equal(await input.getAttribute('type'), 'text', '押すと表示する');
      assert.equal(await toggle.count(), 1, '名前は変えない');
      assert.equal(await toggle.getAttribute('aria-pressed'), 'true', '状態は aria-pressed で伝える');
      assert.equal(await active(), 'button', 'フォーカスはボタンに留まる');
      assert.equal(await input.inputValue(), 'abcdefgh', '値は消えない');
      assert.deepEqual(await input.evaluate((el) => [el.selectionStart, el.selectionEnd]), [5, 5], 'カーソル位置を戻す');
      await a11y();
      // 範囲選択もマウスでの切り替えで戻る。
      await input.evaluate((el) => { el.focus(); el.setSelectionRange(1, 4); });
      await toggle.click();
      await page.waitForTimeout(100);
      assert.equal(await input.getAttribute('type'), 'password', 'もう一度押すと隠す');
      assert.equal(await toggle.getAttribute('aria-pressed'), 'false');
      assert.deepEqual(await input.evaluate((el) => [el.selectionStart, el.selectionEnd]), [1, 4], '範囲選択も戻す');
      await a11y();

      await story('with-error');
      assert.equal(await input.getAttribute('aria-invalid'), 'true', 'Field のエラーを受け取る');
      assert.equal(await input.evaluate((el) => el.required), true, 'Field の必須を受け取る');
      assert.equal(await toggle.getAttribute('aria-invalid'), null, 'ボタンには付けない');
      await a11y();

      await story('controlled');
      const output = page.locator('#storybook-root output');
      await toggle.click();
      await page.waitForTimeout(100);
      assert.equal(await output.textContent(), '表示中', '親へ通知する');
      assert.equal(await input.getAttribute('type'), 'text');
      await page.getByRole('button', { name: '外側から切り替え' }).click();
      assert.equal(await input.getAttribute('type'), 'password', '親の値に従う');
      assert.equal(await toggle.getAttribute('aria-pressed'), 'false');
      await a11y();

      await story('disabled');
      assert.equal(await input.isDisabled(), true);
      assert.equal(await toggle.isDisabled(), true, '無効のときは切り替えもできない');
      await a11y();

      await story('standalone');
      assert.equal(await input.getAttribute('aria-label'), '共有リンクのパスワード', 'Field の外では ariaLabel で名前を付ける');
      await a11y();

      await story('new-password');
      assert.equal(await input.getAttribute('autocomplete'), 'new-password');
      await a11y();

      assert.deepEqual(errors, []);
      await page.close();
      console.log(`${framework}: PasswordInput の Tab の順、表示の切り替えとカーソル位置、名前と aria-pressed、Field 連携、axe を確認しました。`);
    }
  } finally {
    await browser?.close();
    server.kill();
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
