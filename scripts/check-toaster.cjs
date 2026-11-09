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
const { toast, subscribeToasts, setToastLimit, pauseToasts, resumeToasts, toastRole, toastPrefix, connectToaster, announceToasts, emptyAnnouncement } = store;

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

  // 一時停止: 残り時間で再開する（全 duration で再開する実装なら 350ms 時点で残ってしまう）
  toast.success('p', { duration: 400 });
  await sleep(100);
  pauseToasts();
  await sleep(500);
  assert.deepEqual(messages(), ['p'], '停止中は消えない');
  resumeToasts();
  await sleep(100);
  assert.deepEqual(messages(), ['p'], '再開直後は残り時間が残っている');
  await sleep(250);
  assert.deepEqual(messages(), [], '再開後、残り時間（約 300ms）で消える');
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
  // 捨てられたもののタイマーが解放される（dismiss は該当 item が無いと何もしないため、clearTimeout の呼び出しで確かめる）
  const cleared = [];
  const realClear = globalThis.clearTimeout;
  globalThis.clearTimeout = (handle) => { cleared.push(handle); return realClear(handle); };
  const released = (item, handle, why) => {
    assert.notEqual(handle, undefined, `${why}: 動いている間はタイマーを持つ`);
    assert.ok(cleared.includes(handle), `${why}: タイマーを clearTimeout で解放する`);
    assert.equal(item.timer, undefined, `${why}: timer を残さない`);
    assert.equal(item.startedAt, null, `${why}: 動いていない状態に戻す`);
  };
  setToastLimit(1);
  toast.success('old', { duration: 30 });
  const old = latest[0];
  const oldTimer = old.timer;
  toast.success('new', { duration: 0 });
  released(old, oldTimer, '上限超過で捨てたもの');
  assert.deepEqual(messages(), ['new']);
  reset();
  setToastLimit(2);
  toast.success('k1', { duration: 5000 });
  toast.success('k2', { duration: 5000 });
  const kept = latest[0];
  const keptTimer = kept.timer;
  setToastLimit(1);
  released(kept, keptTimer, '上限を下げて捨てたもの');
  reset();

  // 手動で閉じる
  const first = toast.success('m', { duration: 0 });
  toast.success('n', { duration: 0 });
  toast.dismiss(first);
  assert.deepEqual(messages(), ['n'], '指定した 1 件だけ消える');
  toast.dismiss();
  assert.deepEqual(messages(), [], '引数なしで全部消える');
  toast.error('t', { duration: 5000 });
  const closing = latest[0];
  const closingTimer = closing.timer;
  toast.dismiss();
  released(closing, closingTimer, 'dismiss で閉じたもの');
  const one = toast.error('u', { duration: 5000 });
  const single = latest[0];
  const singleTimer = single.timer;
  toast.dismiss(one);
  released(single, singleTimer, 'dismiss(id) で閉じたもの');
  globalThis.clearTimeout = realClear;
  let after = 0;
  const once = subscribeToasts(() => { after += 1; });
  once();
  after = 0;
  toast.success('s', { duration: 0 });
  assert.equal(after, 0, '購読解除後は呼ばれない');
  reset();

  assert.equal(connectToaster(null, () => {}), undefined, 'ref が無ければ何もしない');

  // 読み上げ領域: 通知が出たときに入り、その通知が消えたら空になる。残った通知は読み直さない
  const items = (...specs) => specs.map(([id, variant, message]) => ({ id, variant, message }));
  let announced = announceToasts(emptyAnnouncement(), []);
  assert.deepEqual([announced.status, announced.alert], ['', ''], '通知が無ければ空');
  announced = announceToasts(announced, items([1, 'success', '保存しました。']));
  assert.deepEqual([announced.status, announced.alert], ['完了 保存しました。', ''], '成功は status');
  announced = announceToasts(announced, items([1, 'success', '保存しました。'], [2, 'error', '失敗しました。']));
  assert.deepEqual([announced.status, announced.alert], ['完了 保存しました。', 'エラー 失敗しました。'], 'エラーは alert、status はそのまま');
  announced = announceToasts(announced, items([1, 'success', '保存しました。'], [2, 'error', '失敗しました。'], [3, 'info', '案内です。']));
  assert.equal(announced.status, 'お知らせ 案内です。', '新しい通知で status が入れ替わる');
  announced = announceToasts(announced, items([1, 'success', '保存しました。'], [2, 'error', '失敗しました。']));
  assert.deepEqual([announced.status, announced.alert], ['', 'エラー 失敗しました。'], '消えた通知の分だけ空になり、残りの通知で読み直さない');
  announced = announceToasts(announced, []);
  assert.deepEqual([announced.status, announced.alert], ['', ''], '全部消えたら両方空');

  // 一時停止はホバーとフォーカスの実状態で決める（本物の DOM は後半のブラウザー検証で確かめる）
  const realObserver = globalThis.MutationObserver;
  let mutated;
  globalThis.MutationObserver = class { constructor(callback) { mutated = callback; } observe() {} disconnect() {} };
  const fake = { hover: false, focus: false, handlers: {},
    matches(selector) { return selector === ':hover' ? this.hover : selector === ':focus-within' ? this.focus : false; },
    addEventListener(type, handler) { this.handlers[type] = handler; },
    removeEventListener(type) { delete this.handlers[type]; },
    fire(type) { this.handlers[type]?.(); } };
  const dispose = connectToaster(fake, () => {});
  const present = (message) => messages().includes(message);
  toast.success('h', { duration: 80 });
  fake.hover = true; fake.focus = true; fake.fire('mouseenter');
  await sleep(150);
  assert.ok(present('h'), 'ホバー中は消えない');
  fake.hover = false; fake.fire('mouseleave');
  await sleep(150);
  assert.ok(present('h'), 'マウスが離れてもフォーカスが中にあれば止めたまま');
  fake.focus = false; fake.fire('focusout');
  await sleep(150);
  assert.ok(!present('h'), 'ホバーもフォーカスも無ければ再開して消える');
  fake.focus = true; fake.fire('focusin');
  toast.success('f', { duration: 80 });
  await sleep(150);
  assert.ok(present('f'), 'フォーカス中は消えない');
  fake.focus = false; mutated();
  await sleep(150);
  assert.ok(!present('f'), 'focusout が出なくても、フォーカスのある要素が消えて領域が更新されれば再開する');
  dispose();
  globalThis.MutationObserver = realObserver;
  reset();
  unsubscribe();

  // 生成物
  const read = (path) => readFileSync(resolve(root, path), 'utf8');
  for (const [name, path] of [['Vue', 'packages/vue/src/generated/components/Toaster/Toaster.vue'], ['React', 'packages/react/src/generated/components/Toaster/Toaster.tsx']]) {
    const source = read(path);
    assert.match(source, /announceToasts/, `${name} 版は読み上げ領域の中身をストアの判定で決める`);
    assert.match(source, /role="status"/, `${name} 版は status の読み上げ領域を常設する`);
    assert.match(source, /role="alert"/, `${name} 版は alert の読み上げ領域を常設する`);
    assert.equal(source.match(/role=/g).length, 2, `${name} 版の見えるトーストには role を付けない`);
    assert.match(source, /aria-atomic="true"/, `${name} 版は接頭辞と本文をまとめて読ませる`);
    assert.doesNotMatch(source, /aria-live/, `${name} 版は role の暗黙値に任せる`);
    assert.match(source, /event/, `${name} 版は action.onClick にイベントを渡す`);
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
    assert.match(css, /var\(--toast-color,\s*var\(--toast-variant-color\)\)/, `${framework}: 囲む要素の --toast-color で文字と枠線を上書きできる`);
    assert.match(css, /var\(--toast-background,\s*var\(--toast-variant-background\)\)/, `${framework}: 囲む要素の --toast-background で背景を上書きできる`);
    assert.doesNotMatch(css, /--toast-color:|--toast-background:/, `${framework}: 種類ごとの定義が上書き用の変数を潰さない`);
    assert.match(css, /clip-path:\s*inset\(50%\)/, `${framework}: 読み上げ領域は見た目だけ隠す`);
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
  const playwright = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
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
    browser = await playwright[process.env.TOASTER_TEST_BROWSER || 'chromium'].launch({ headless: true });

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
      const toasts = page.locator('section[aria-label="通知"] > div[data-variant]');
      const live = (role) => page.locator(`section[aria-label="通知"] > [role="${role}"]`);

      await story('success');
      await toasts.first().waitFor();
      assert.equal(await live('status').count(), 1, 'status の読み上げ領域は 1 つ');
      assert.equal(await live('status').textContent(), '完了 保存しました。', '接頭辞と本文を status の領域に入れる');
      assert.equal(await live('alert').textContent(), '', '成功は alert に入れない');
      assert.equal(await toasts.locator('[role]').count(), 0, '見えるトーストには role を付けない（二重に読ませない）');
      assert.equal(await toasts.first().getByRole('button', { name: '閉じる: 保存しました。', exact: true }).count(), 1, '閉じるボタンの名前に本文が付く');
      // 囲む要素で公開変数を指定すると、トーストの枠線の色が変わる
      await page.evaluate(() => document.querySelector('#storybook-root').style.setProperty('--toast-color', 'rgb(1, 2, 3)'));
      assert.equal(await toasts.first().evaluate((el) => getComputedStyle(el).borderTopColor), 'rgb(1, 2, 3)', '--toast-color で上書きできる');
      await page.evaluate(() => document.querySelector('#storybook-root').style.removeProperty('--toast-color'));
      await a11y();

      await story('error');
      await toasts.first().waitFor();
      assert.equal(await live('alert').textContent(), 'エラー 保存できませんでした。時間をおいて試してください。', 'エラーは alert の領域に入れる');
      assert.equal(await live('status').textContent(), '', 'エラーは status に入れない');
      await a11y();

      await story('info');
      await toasts.first().waitFor();
      assert.equal(await live('status').textContent(), 'お知らせ 3 月 1 日からメールの形式が変わります。');
      await a11y();

      await story('with-link');
      const link = page.getByRole('link', { name: 'タスクを開く', exact: true });
      await link.waitFor();
      assert.ok(await link.getAttribute('href'), 'リンクは href を持つ');
      await a11y();
      const before = page.url();
      await link.click({ noWaitAfter: true });
      await toasts.first().waitFor({ state: 'detached' });
      assert.equal(page.url(), before, 'リンクでも onClick を呼び、preventDefault で遷移を止められる');
      assert.equal(await live('status').textContent(), '', '消えたら読み上げ領域も空になる');

      await story('with-action');
      const undo = page.getByRole('button', { name: '元に戻す', exact: true });
      await undo.waitFor();
      await a11y();
      await undo.click();
      assert.equal(await toasts.count(), 0, '操作ボタンで消える');

      await story('stacked');
      await toasts.nth(2).waitFor();
      assert.equal(await toasts.count(), 3, '4 件出しても 3 件残る');
      const bodies = await toasts.allInnerTexts();
      assert.ok(!bodies.some((text) => text.includes('1 件目')), '最初の 1 件は消えている');
      assert.deepEqual(bodies.map((text) => text.replace(/^[^\d]*/, '').slice(0, 3)), ['2 件', '3 件', '4 件'], '古い順に並ぶ');
      const names = await toasts.getByRole('button').evaluateAll((buttons) => buttons.map((button) => button.getAttribute('aria-label')));
      assert.equal(new Set(names).size, 3, '積まれた閉じるボタンの名前は互いに違う');
      await a11y();

      await story('playground');
      assert.deepEqual([await live('status').count(), await live('alert').count()], [1, 1], '通知が出る前から読み上げ領域がある');
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
      const inside = () => page.evaluate(() => document.activeElement?.closest('section[aria-label="通知"]') !== null);
      await fire.click();
      await toasts.first().waitFor();
      await page.keyboard.press('Tab');
      assert.ok(await inside(), 'Tab でトースト内へ入る');
      await page.mouse.move(2, 2);
      await sleep(600);
      assert.equal(await toasts.count(), 1, 'フォーカス中は消えない');
      await page.evaluate(() => document.activeElement?.blur());
      await sleep(600);
      assert.equal(await toasts.count(), 0, 'フォーカスを外すと消える');
      // ホバーとフォーカスの両方があるとき、マウスだけ外しても止めたまま
      await fire.click();
      await toasts.first().waitFor();
      await page.keyboard.press('Tab');
      await toasts.first().hover();
      await page.mouse.move(2, 2);
      await sleep(600);
      assert.equal(await toasts.count(), 1, 'マウスだけ外してもフォーカスが中にあれば消えない');
      await page.evaluate(() => document.activeElement?.blur());
      await sleep(600);
      assert.equal(await toasts.count(), 0, 'フォーカスも外れたら消える');
      // フォーカスのあるトーストを閉じたあと、残りのトーストが止まったままにならない
      await fire.click();
      await fire.click();
      await toasts.nth(1).waitFor();
      await page.keyboard.press('Tab');
      assert.ok(await inside(), 'Tab でトースト内へ入る');
      await page.keyboard.press('Enter');
      await page.mouse.move(2, 2);
      await sleep(700);
      assert.equal(await toasts.count(), 0, 'フォーカスのあるトーストを閉じても、残りは自動で消える');
      await fire.click();
      await toasts.first().waitFor();
      await toasts.first().getByRole('button', { name: '閉じる: 保存しました。' }).click();
      assert.equal(await toasts.count(), 0, '閉じるで即消える');

      await story('narrow', { width: 320, height: 568 });
      await toasts.first().waitFor();
      const box = await toasts.first().evaluate((el) => ({ right: el.getBoundingClientRect().right, inner: window.innerWidth, body: el.firstElementChild.getBoundingClientRect().width }));
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
