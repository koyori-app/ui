// Run after build-storybook. See CONTRIBUTING.md for the external Playwright setup.
// ICON_RAIL_TEST_FRAMEWORK=vue|react で片方だけ、ICON_RAIL_TEST_PORT でポートを変えられる。
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { resolve } = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = resolve(__dirname, '..');
const port = process.env.ICON_RAIL_TEST_PORT || '16342';
const base = `http://127.0.0.1:${port}`;
const frameworks = process.env.ICON_RAIL_TEST_FRAMEWORK ? [process.env.ICON_RAIL_TEST_FRAMEWORK] : ['react', 'vue'];
const server = spawn('python3', ['-u', '-m', 'http.server', port, '--bind', '127.0.0.1', '--directory', root], { stdio: 'ignore' });
const sleep = ms => new Promise(done => setTimeout(done, ms));
let browser;

const open = async (framework, name, contextOptions = {}) => {
  const context = await browser.newContext({ viewport: { width: 800, height: 600 }, ...contextOptions });
  // ブラウザーのメニューが出るかは、contextmenu の既定の動作が止められたかで見る。
  await context.addInitScript(() => {
    window.__contextmenu = [];
    window.addEventListener('contextmenu', event => window.__contextmenu.push(event.defaultPrevented));
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (['error', 'warning'].includes(message.type())) errors.push(message.text()); });
  await page.goto(`${base}/packages/${framework}/storybook-static/iframe.html?id=components-iconrail--${name}&viewMode=story`);
  await page.locator('nav[aria-label="テナント"]').waitFor();
  await sleep(200);
  const item = label => page.getByRole('button', { name: label, exact: true });
  const s = {
    page, item,
    log: async () => { await sleep(60); return ((await page.getByTestId('log').textContent()) ?? '').trim(); },
    tile: label => item(label).locator('[data-kind]'),
    radius: label => s.tile(label).evaluate(element => getComputedStyle(element).borderTopLeftRadius),
    bar: async label => {
      const bar = item(label).locator('span').first();
      return bar.evaluate(element => element.getBoundingClientRect().height);
    },
    away: () => page.mouse.move(790, 590),
    prevented: () => page.evaluate(() => window.__contextmenu.splice(0)),
    async finish() { assert.deepEqual(errors, [], 'console errors / warnings / page errors'); await context.close(); },
  };
  return s;
};

async function checkDefault(framework) {
  const s = await open(framework, 'default');
  const { page, item } = s;
  // 選択中の項目だけ aria-current="true"。角丸 12px・バー 32px。ほかは丸でバー無し。
  assert.deepEqual(await page.locator('[aria-current]').evaluateAll(elements => elements.map(element => [element.getAttribute('aria-label'), element.getAttribute('aria-current')])),
    [['Acme', 'true']], `${framework}: aria-current は選択中の 1 つだけ`);
  assert.equal(await s.radius('Acme'), '12px', `${framework}: 選択中は角丸 12px`);
  assert.equal(await s.bar('Acme'), 32, `${framework}: 選択中のバーは 32px`);
  assert.equal(await s.radius('お茶会'), '50%', `${framework}: 通常は丸`);
  assert.equal(await s.bar('お茶会'), 0, `${framework}: 通常はバー無し`);
  const bar = await item('Acme').locator('span').first().boundingBox();
  const rail = await page.locator('nav').boundingBox();
  assert.equal(bar.x, rail.x, `${framework}: バーはレールの左端`);
  assert.equal(bar.width, 4);

  // 中身: 画像 → 絵文字 → 先頭の 1 書記素。両方あれば画像、画像が読めなければ絵文字。
  const kinds = {};
  for (const label of ['Acme', '𠮷野商店', 'お茶会', '画像と絵文字', '読めない画像']) {
    kinds[label] = [await s.tile(label).getAttribute('data-kind'), (await s.tile(label).textContent()).trim()];
  }
  assert.deepEqual(kinds, {
    Acme: ['image', ''], '𠮷野商店': ['initial', '𠮷'], 'お茶会': ['emoji', '🍵'], '画像と絵文字': ['image', ''], '読めない画像': ['emoji', '🌿'],
  }, `${framework}: タイルの中身`);
  assert.equal(await s.tile('Acme').getAttribute('aria-hidden'), 'true', `${framework}: タイルは読み上げから外す`);
  assert.equal(await s.tile('Acme').locator('img').getAttribute('alt'), '');

  // ホバーで形が変わってバー 20px、右にツールチップ。中身は label。
  await item('お茶会').hover();
  await sleep(450);
  assert.equal(await s.radius('お茶会'), '12px', `${framework}: ホバーで角丸 12px`);
  assert.equal(await s.bar('お茶会'), 20, `${framework}: ホバーでバー 20px`);
  const tooltip = page.locator('[role="tooltip"]:visible');
  assert.equal(await tooltip.count(), 1, `${framework}: ホバーでツールチップ`);
  assert.equal((await tooltip.textContent()).trim(), 'お茶会');
  assert(((await tooltip.boundingBox()).x) >= rail.x + rail.width, `${framework}: ツールチップはレールの右`);
  // 選択中にホバーしてもバーは 32px のまま。
  await item('Acme').hover();
  await sleep(300);
  assert.equal(await s.bar('Acme'), 32, `${framework}: 選択中はホバーしてもバー 32px`);
  await s.away();
  await sleep(400);
  assert.equal(await s.bar('お茶会'), 0);

  // フォーカスでもバー 20px とツールチップ。Tab で順に回る。
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await sleep(300);
  assert.equal(await page.evaluate(() => document.activeElement.getAttribute('aria-label')), '𠮷野商店', `${framework}: Tab で順に回る`);
  assert.equal(await s.bar('𠮷野商店'), 20, `${framework}: フォーカスでバー 20px`);
  assert.equal(await s.radius('𠮷野商店'), '12px');
  assert.equal((await page.locator('[role="tooltip"]:visible').textContent()).trim(), '𠮷野商店', `${framework}: フォーカスでツールチップ`);

  // 押すと onClick。選択は利用側が動かす。
  await item('𠮷野商店').click();
  assert.equal(await s.log(), 'click:yoshino');
  assert.equal(await item('𠮷野商店').getAttribute('aria-current'), 'true');
  assert.equal(await item('Acme').getAttribute('aria-current'), null);

  // action は選択の印もバーも持たない。disabled は押せない。
  const add = item('テナントを追加');
  assert.equal(await add.getAttribute('aria-current'), null);
  assert.equal(await add.locator('[data-kind]').count(), 0, `${framework}: action はタイルを出さない`);
  assert.equal(await add.locator('svg').count(), 1, `${framework}: action は icon を出す`);
  const dashed = await add.locator('span').first().evaluate(element => getComputedStyle(element).borderTopStyle);
  assert.equal(dashed, 'dashed', `${framework}: action は点線の丸`);
  await add.click();
  assert.equal(await s.log(), 'click:yoshino click:add');
  const invite = item('招待（無効）');
  assert.equal(await invite.isDisabled(), true);
  await invite.click({ force: true });
  assert.equal(await s.log(), 'click:yoshino click:add', `${framework}: disabled は onClick を呼ばない`);

  // onMenu の無い項目は contextmenu を止めない。
  await item('お茶会').click({ button: 'right' });
  assert.deepEqual(await s.prevented(), [false], `${framework}: onMenu が無ければブラウザーのメニューを止めない`);
  await s.finish();
}

async function checkMenu(framework) {
  const s = await open(framework, 'with-menu');
  const { page, item } = s;
  const menu = page.getByRole('menu', { name: 'テナントの操作' });
  // 右クリック: onMenu を呼び、ブラウザーのメニューは出さない。メニューはポインターの位置の近くに出る（ContextMenu が画面の端と余白で寄せる）。
  const acme = await item('Acme').boundingBox();
  await page.mouse.click(acme.x + 30, acme.y + 20, { button: 'right' });
  await sleep(150);
  assert.equal(await s.log(), 'menu:acme', `${framework}: 右クリックで onMenu`);
  assert.deepEqual(await s.prevented(), [true], `${framework}: 右クリックでブラウザーのメニューを止める`);
  assert.equal(await menu.isVisible(), true);
  const box = await menu.boundingBox();
  assert(Math.abs(box.x - (acme.x + 30)) <= 12 && Math.abs(box.y - (acme.y + 20)) <= 12, `${framework}: メニューはポインターの位置 ${JSON.stringify(box)}`);
  // ポインターが項目に載ったままなのでツールチップも出ている。Tooltip は Esc を自分だけで受け止めるので、
  // 1 回目でツールチップ、2 回目でメニューが閉じる。
  await page.keyboard.press('Escape');
  await sleep(100);
  assert.equal(await page.locator('[role="tooltip"]:visible').count(), 0, `${framework}: 1 回目の Esc でツールチップが閉じる`);
  await page.keyboard.press('Escape');
  await sleep(100);
  assert.equal(await menu.isVisible(), false, `${framework}: 2 回目の Esc でメニューが閉じる`);
  await s.away();

  // キーボード（Shift+F10）
  await item('お茶会').focus();
  await page.keyboard.press('Shift+F10');
  await sleep(150);
  assert.equal(await s.log(), 'menu:acme menu:tea', `${framework}: Shift+F10 で onMenu`);
  assert.deepEqual(await s.prevented(), [true]);
  const tea = await item('お茶会').boundingBox();
  const keyboardBox = await menu.boundingBox();
  // Chromium はキーボードの contextmenu に要素の中の座標を付けるので、contextMenuPosition はそれを使う（0,0 のときだけ左下）。
  assert(keyboardBox.x >= tea.x && keyboardBox.x <= tea.x + tea.width && keyboardBox.y >= tea.y && keyboardBox.y <= tea.y + tea.height + 12, `${framework}: キーボードからは項目の位置に出る ${JSON.stringify(keyboardBox)}`);
  await page.keyboard.press('Escape');
  await sleep(100);

  // onMenu の無い項目は止めない。
  await item('メニューなし').click({ button: 'right' });
  assert.deepEqual(await s.prevented(), [false], `${framework}: onMenu の無い項目は止めない`);
  assert.equal(await s.log(), 'menu:acme menu:tea');

  // disabled の項目は onMenu があっても開かず、ブラウザーのメニューも止めない。
  // Chromium は無効なボタンへ右クリックを配らないことがあるので、contextmenu を直に送る。
  await item('無効なテナント').dispatchEvent('contextmenu', { bubbles: true, cancelable: true });
  assert.equal(await s.log(), 'menu:acme menu:tea', `${framework}: disabled の項目は onMenu を呼ばない`);
  assert.deepEqual(await s.prevented(), [false], `${framework}: disabled の項目は contextmenu を止めない`);
  await s.finish();

  // タッチ: 長押しで onMenu、続く click では onClick を呼ばない。短いタップは onClick。
  const t = await open(framework, 'with-menu', { hasTouch: true, isMobile: true });
  const cdp = await t.page.context().newCDPSession(t.page);
  const center = async label => {
    const b = await t.item(label).boundingBox();
    return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
  };
  const touch = (type, point) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: point ? [{ x: point.x, y: point.y }] : [] });
  const point = await center('Acme');
  await touch('touchStart', point);
  await sleep(700);
  await touch('touchEnd');
  await sleep(200);
  assert.equal(await t.log(), 'menu:acme', `${framework}: 長押しで onMenu を 1 回だけ呼び、続く click で onClick を呼ばない`);
  assert(await t.page.getByRole('menu', { name: 'テナントの操作' }).isVisible(), `${framework}: 長押しでメニューが出る`);
  assert((await t.prevented()).every(Boolean), `${framework}: 長押しの contextmenu は止める`);
  await t.page.keyboard.press('Escape');
  await sleep(100);
  // 10px を超えて動かすと取り消す。
  const tea2 = await center('お茶会');
  await touch('touchStart', tea2);
  await sleep(100);
  await touch('touchMove', { x: tea2.x, y: tea2.y + 15 });
  await sleep(600);
  await touch('touchEnd');
  await sleep(200);
  assert(!(await t.log()).includes('menu:tea'), `${framework}: 動かした長押しは取り消す`);
  await t.page.touchscreen.tap(tea2.x, tea2.y);
  assert.match(await t.log(), /click:tea$/, `${framework}: 短いタップは onClick`);
  await t.finish();
}

async function checkMany(framework) {
  const s = await open(framework, 'many');
  const metrics = await s.page.locator('nav').evaluate(element => ({
    scrollHeight: element.scrollHeight, clientHeight: element.clientHeight, scrollWidth: element.scrollWidth, clientWidth: element.clientWidth,
    width: element.getBoundingClientRect().width, overflowX: getComputedStyle(element).overflowX,
  }));
  assert(metrics.scrollHeight > metrics.clientHeight, `${framework}: 30 件で縦にスクロールする ${JSON.stringify(metrics)}`);
  assert(metrics.scrollWidth <= metrics.clientWidth, `${framework}: 横に溢れない ${JSON.stringify(metrics)}`);
  assert.equal(metrics.width, 64, `${framework}: 幅 64px`);
  assert.equal(metrics.overflowX, 'hidden');
  // 最後の項目まで Tab で届き、見える位置まで送られる。
  await s.item('テナント 30').focus();
  assert(await s.item('テナント 30').isVisible());
  assert(await s.page.locator('nav').evaluate(element => element.scrollTop > 0), `${framework}: フォーカスした項目まで送る`);
  await s.finish();
}

(async () => {
  try {
    for (let i = 0; i < 40; i++) {
      try { if ((await fetch(base)).ok) break; } catch {}
      await sleep(100);
    }
    browser = await chromium.launch({ headless: true });
    for (const framework of frameworks) {
      await checkDefault(framework);
      await checkMenu(framework);
      await checkMany(framework);
      console.log(`${framework}: IconRail の選択・ホバー・フォーカス・ツールチップ・中身・メニュー・長押し・スクロールを確認しました。`);
    }
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  } finally {
    await browser?.close();
    server.kill();
  }
})();
