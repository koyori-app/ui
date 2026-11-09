// No browser needed: node scripts/check-toaster.cjs（pnpm build のあとに実行する）
// Storybook をビルド済みなら、続けてブラウザーでの検証も行う。
const assert = require('node:assert/strict');
const { mkdtempSync, rmSync, readFileSync, readdirSync, existsSync } = require('node:fs');
const { execFileSync, spawn } = require('node:child_process');
const { setTimeout: sleep } = require('node:timers/promises');
const { tmpdir } = require('node:os');
const { join, resolve } = require('node:path');

const root = resolve(__dirname, '..');
const compiled = mkdtempSync(join(tmpdir(), 'koyori-toaster-'));
let store;
try {
  execFileSync(process.execPath, [require.resolve('typescript/bin/tsc'), '--ignoreConfig',
    '--module', 'commonjs', '--target', 'ES2022', '--skipLibCheck', '--outDir', compiled,
    resolve(root, 'components/Toaster/toast.ts')], { stdio: 'inherit' });
  store = require(join(compiled, 'toast.js'));
} finally {
  rmSync(compiled, { recursive: true, force: true });
}
const { toast, subscribeToasts, setToastLimit, pauseToasts, resumeToasts, toastRole, toastPrefix, connectToaster } = store;

assert.equal(toastRole('success'), 'status');
assert.equal(toastRole('info'), 'status');
assert.equal(toastRole('error'), 'alert', 'エラーだけ割り込んで読ませる');
assert.equal(toastPrefix('success'), '完了');
assert.equal(toastPrefix('error'), 'エラー');
assert.equal(toastPrefix('info'), 'お知らせ');

let latest = [];
const unsubscribe = subscribeToasts((next) => { latest = next; });
assert.deepEqual(latest, [], '登録時に現在の配列を渡す');
const reset = () => { resumeToasts(); toast.dismiss(); setToastLimit(3); };
const messages = () => latest.map((item) => item.message);

(async () => {
  // 追加と購読
  reset();
  const id = toast.success('a');
  assert.equal(typeof id, 'number');
  assert.equal(latest.length, 1);
  assert.equal(latest[0].variant, 'success');
  assert.equal(latest[0].message, 'a');
  assert.equal(latest[0].duration, 5000, '既定は 5 秒');
  toast.info('b', { action: { label: '元に戻す', onClick() {} } });
  assert.equal(latest[1].duration, 8000, '操作付きは 8 秒');
  toast.error('c', { duration: 1234 });
  assert.equal(latest[2].duration, 1234, '指定した duration はそのまま');
  reset();

  // 自動消去
  toast.success('x', { duration: 30 });
  assert.equal(latest.length, 1);
  await sleep(80);
  assert.equal(latest.length, 0, 'duration 経過後に消える');
  toast.success('y', { duration: 0 });
  await sleep(80);
  assert.deepEqual(messages(), ['y'], 'duration 0 は残る');
  reset();

  // 一時停止: 残り時間で再開する
  toast.success('p', { duration: 80 });
  await sleep(30);
  pauseToasts();
  await sleep(150);
  assert.deepEqual(messages(), ['p'], '停止中は消えない');
  resumeToasts();
  await sleep(30);
  assert.deepEqual(messages(), ['p'], '再開直後は残り時間が残っている');
  await sleep(90);
  assert.deepEqual(messages(), [], '再開後、残り時間で消える');
  reset();
  pauseToasts();
  toast.success('q', { duration: 30 });
  await sleep(80);
  assert.deepEqual(messages(), ['q'], '停止中に出したものは再開まで消えない');
  resumeToasts();
  await sleep(80);
  assert.deepEqual(messages(), [], '再開で動き出す');
  reset();

  // 上限
  setToastLimit(2);
  toast.success('1', { duration: 0 });
  toast.success('2', { duration: 0 });
  assert.deepEqual(messages(), ['1', '2'], '上限ちょうどでは消えない');
  toast.success('3', { duration: 0 });
  assert.deepEqual(messages(), ['2', '3'], '超えたら古いものから消える');
  setToastLimit(1);
  assert.deepEqual(messages(), ['3'], '上限を下げると超過分が消える');
  for (const bad of [0, Number.NaN, -3]) {
    setToastLimit(bad);
    toast.success('z', { duration: 0 });
    assert.equal(latest.length, 1, `上限 ${bad} は 1 として扱う`);
  }
  reset();
  // 捨てられたもののタイマーが残らない
  setToastLimit(1);
  toast.success('old', { duration: 30 });
  toast.success('new', { duration: 0 });
  let calls = 0;
  const count = subscribeToasts(() => { calls += 1; });
  calls = 0;
  await sleep(80);
  assert.equal(calls, 0, '捨てたトーストのタイマーは再通知しない');
  assert.deepEqual(messages(), ['new']);
  count();
  reset();

  // 手動で閉じる
  const first = toast.success('m', { duration: 0 });
  toast.success('n', { duration: 0 });
  toast.dismiss(first);
  assert.deepEqual(messages(), ['n'], '指定した 1 件だけ消える');
  toast.dismiss();
  assert.deepEqual(messages(), [], '引数なしで全部消える');
  toast.error('t', { duration: 30 });
  toast.dismiss();
  calls = 0;
  const watch = subscribeToasts(() => { calls += 1; });
  calls = 0;
  await sleep(80);
  assert.equal(calls, 0, '消した後にタイマーが再通知しない');
  watch();
  let after = 0;
  const once = subscribeToasts(() => { after += 1; });
  once();
  after = 0;
  toast.success('s', { duration: 0 });
  assert.equal(after, 0, '購読解除後は呼ばれない');
  reset();

  assert.equal(connectToaster(null, () => {}), undefined, 'ref が無ければ何もしない');
  unsubscribe();

  // 生成物
  const read = (path) => readFileSync(resolve(root, path), 'utf8');
  for (const [name, path] of [['Vue', 'packages/vue/src/generated/components/Toaster/Toaster.vue'], ['React', 'packages/react/src/generated/components/Toaster/Toaster.tsx']]) {
    const source = read(path);
    assert.match(source, /toastRole/, `${name} 版は role を同じ判定に通す`);
    assert.match(source, /aria-atomic="true"/, `${name} 版は接頭辞と本文をまとめて読ませる`);
    assert.doesNotMatch(source, /aria-live/, `${name} 版は role の暗黙値に任せる`);
    assert.match(source, /<section[^>]*aria-label/, `${name} 版は領域に名前を付ける`);
    assert.match(source, /data-variant/, `${name} 版は種類を属性で出す`);
    assert.match(source, /data-variant="tertiary"/, `${name} 版の操作ボタンは tertiary`);
    assert.match(source, /data-icon-only/, `${name} 版の閉じるボタンはアイコンだけ`);
    assert.doesNotMatch(source, /addEventListener/, `${name} 版は監視を toast.ts に任せる`);
  }

  const tokens = read('components/tokens.css');
  const token = (name) => {
    const found = tokens.match(new RegExp(`--koyori-color-${name}:\\s*(#[0-9a-f]{6})`, 'i'));
    assert(found, `--koyori-color-${name} が tokens.css にある`);
    return found[1];
  };
  const channel = (value) => (value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  const luminance = (hex) => {
    const [r, g, b] = [1, 3, 5].map((index) => channel(parseInt(hex.slice(index, index + 2), 16) / 255));
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const contrast = (a, b) => {
    const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
    return (light + 0.05) / (dark + 0.05);
  };
  for (const variant of ['success', 'danger', 'info']) {
    const background = token(`${variant}-subtle`);
    assert(contrast(token(variant), background) >= 4.5, `${variant}: 接頭辞が背景に対して 4.5:1 以上`);
    assert(contrast(token('text'), background) >= 4.5, `${variant}: 本文が背景に対して 4.5:1 以上`);
  }
  assert.match(tokens, /--koyori-toast-width:/);

  for (const framework of ['vue', 'react']) {
    const css = read(`packages/${framework}/dist/style.css`);
    assert.match(css, /--koyori-toast-width/, `${framework}: 幅をトークンで変えられる`);
    assert.match(css, /--toast-color:/, `${framework}: 文字と枠線を上書きできる`);
    assert.match(css, /--toast-background:/, `${framework}: 背景を上書きできる`);
    assert.match(css, /@starting-style/, `${framework}: 入場の動き`);
    assert.match(css, /prefers-reduced-motion/, `${framework}: 動きを減らす設定`);
    assert.match(css, /pointer-events:\s*none/, `${framework}: 領域は背後の操作を妨げない`);
    assert.match(css, /pointer-events:\s*auto/, `${framework}: トーストは操作できる`);
    assert.ok(/forced-colors[^{]*\{[^@]*?canvastext/i.test(css), `${framework}: 強制配色で枠線を残す`);
    assert.doesNotMatch(css.match(/[^}]*toast-width[^}]*\}/g)?.join('') ?? '', /100vw/, `${framework}: 幅は 100vw に頼らない`);
  }

  console.log('Toaster のストア（追加・自動消去・停止・上限・手動で閉じる）、role、生成物、配布 CSS を確認しました。');
  await browserChecks();
})().catch((error) => { console.error(error); process.exitCode = 1; });

async function browserChecks() {
  if (!['vue', 'react'].every((framework) => existsSync(resolve(root, `packages/${framework}/storybook-static/iframe.html`)))) {
    console.log('storybook-static がないため、ブラウザー検証は省きました（pnpm build-storybook のあとに再実行してください）。');
    return;
  }
  const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
  const port = process.env.TOASTER_TEST_PORT || '16324';
  const base = `http://127.0.0.1:${port}`;
  const server = spawn('python3', ['-u', '-m', 'http.server', port, '--bind', '127.0.0.1', '--directory', root], { stdio: ['ignore', 'pipe', 'pipe'] });
  let browser;
  try {
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
      const story = async (name, viewport) => {
        if (viewport) await page.setViewportSize(viewport);
        await page.goto(`${base}/packages/${framework}/storybook-static/iframe.html?id=components-toaster--${name}&viewMode=story`);
        await page.locator('#storybook-root section[aria-label]').waitFor({ state: 'attached' });
      };
      const a11y = async () => {
        // 入場の動き（半透明）の最中は色のコントラストが正しく測れない。
        await page.evaluate(() => Promise.all(document.getAnimations().map((animation) => animation.finished.catch(() => {}))));
        await page.addScriptTag({ content: `${axeSource}\nwindow.toasterAxe = window.axe;` });
        const violations = await page.evaluate(async () => (await window.toasterAxe.run(document.querySelector('#storybook-root'))).violations.map((v) => ({ id: v.id, targets: v.nodes.map((n) => n.target) })));
        assert.deepEqual(violations, []);
      };
      const toasts = page.locator('section[aria-label="通知"] > div');

      await story('success');
      const status = page.getByRole('status');
      await status.waitFor();
      assert.equal(await status.count(), 1, 'success は status');
      assert.match(await status.innerText(), /^完了保存しました。/, '接頭辞と本文をまとめて読ませる');
      assert.equal(await status.getByRole('button').count(), 0, 'ボタンはライブ領域の外にある');
      await a11y();

      await story('error');
      await page.getByRole('alert').waitFor();
      assert.equal(await page.getByRole('alert').count(), 1, 'error は alert');
      await a11y();

      await story('info');
      await page.getByRole('status').waitFor();
      await a11y();

      await story('with-link');
      const link = page.getByRole('link', { name: 'タスクを開く', exact: true });
      await link.waitFor();
      assert.ok(await link.getAttribute('href'), 'リンクは href を持つ');
      await a11y();
      await link.click({ noWaitAfter: true });
      await toasts.first().waitFor({ state: 'detached' });

      await story('with-action');
      const undo = page.getByRole('button', { name: '元に戻す', exact: true });
      await undo.waitFor();
      await a11y();
      await undo.click();
      assert.equal(await toasts.count(), 0, '操作ボタンで消える');

      await story('stacked');
      await toasts.nth(2).waitFor();
      assert.equal(await toasts.count(), 3, '4 件出しても 3 件残る');
      const bodies = await toasts.locator('[role]').allInnerTexts();
      assert.ok(!bodies.some((text) => text.includes('1 件目')), '最初の 1 件は消えている');
      assert.deepEqual(bodies.map((text) => text.replace(/^[^\d]*/, '').slice(0, 3)), ['2 件', '3 件', '4 件'], '古い順に並ぶ');
      await a11y();

      await story('playground');
      const fire = page.getByRole('button', { name: '短く出す', exact: true });
      await fire.focus();
      await fire.click();
      await toasts.first().waitFor();
      assert.ok(await fire.evaluate((el) => el === document.activeElement), 'トースト表示でフォーカスは動かない');
      await toasts.first().hover();
      await sleep(600);
      assert.equal(await toasts.count(), 1, 'ホバー中は消えない');
      await page.mouse.move(2, 2);
      await sleep(600);
      assert.equal(await toasts.count(), 0, '外すと消える');
      await fire.click();
      await toasts.first().waitFor();
      await page.keyboard.press('Tab');
      assert.ok(await page.evaluate(() => document.activeElement?.closest('section[aria-label="通知"]') !== null), 'Tab でトースト内へ入る');
      await page.mouse.move(2, 2);
      await sleep(600);
      assert.equal(await toasts.count(), 1, 'フォーカス中は消えない');
      await page.evaluate(() => document.activeElement?.blur());
      await sleep(600);
      assert.equal(await toasts.count(), 0, 'フォーカスを外すと消える');
      await fire.click();
      await toasts.first().waitFor();
      await toasts.first().getByRole('button', { name: '閉じる' }).click();
      assert.equal(await toasts.count(), 0, '閉じるで即消える');

      await story('narrow', { width: 320, height: 568 });
      await toasts.first().waitFor();
      const box = await toasts.first().evaluate((el) => ({ right: el.getBoundingClientRect().right, inner: window.innerWidth, body: el.querySelector('[role]').getBoundingClientRect().width }));
      assert.ok(box.right <= box.inner, '狭くても画面から出ない');
      assert.ok(box.body > 100, `本文が潰れない（${box.body}）`);
      await a11y();

      await story('dark-background', { width: 800, height: 700 });
      await toasts.nth(2).waitFor();
      await a11y();

      assert.deepEqual(errors, []);
      await page.close();
      console.log(`${framework}: Toaster の role、フォーカス、ホバー・フォーカス中の停止、上限、狭い幅、axe を確認しました。`);
    }
  } finally {
    await browser?.close();
    server.kill();
  }
}
