// Run after build-storybook. See CONTRIBUTING.md for the external Playwright setup.
// USER_PANEL_TEST_FRAMEWORK=vue|react で片方だけ、USER_PANEL_TEST_PORT でポートを変えられる。
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { resolve } = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = resolve(__dirname, '..');
const port = process.env.USER_PANEL_TEST_PORT || '16343';
const base = `http://127.0.0.1:${port}`;
const frameworks = process.env.USER_PANEL_TEST_FRAMEWORK ? [process.env.USER_PANEL_TEST_FRAMEWORK] : ['react', 'vue'];
const server = spawn('python3', ['-u', '-m', 'http.server', port, '--bind', '127.0.0.1', '--directory', root], { stdio: 'ignore' });
const sleep = ms => new Promise(done => setTimeout(done, ms));
let browser;

const open = async (framework, name) => {
  const context = await browser.newContext({ viewport: { width: 800, height: 600 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (['error', 'warning'].includes(message.type())) errors.push(message.text()); });
  await page.goto(`${base}/packages/${framework}/storybook-static/iframe.html?id=components-userpanel--${name}&viewMode=story`);
  const card = page.locator('[role="dialog"][aria-label="hanako のプロフィール"]');
  await card.waitFor({ state: 'attached', timeout: 15000 });
  await sleep(250);
  const trigger = page.locator('button[aria-haspopup="dialog"]');
  const s = {
    page, card, trigger,
    log: async () => { await sleep(60); return ((await page.getByTestId('log').textContent()) ?? '').trim(); },
    active: () => page.evaluate(() => {
      const element = document.activeElement;
      return element?.getAttribute('aria-haspopup') === 'dialog' ? 'trigger' : `${element?.tagName}:${element?.textContent?.trim()}`;
    }),
    // カードの中心に、ほかの要素が重なっていないか（切られず前に出ているか）。
    onTop: () => card.evaluate(element => {
      const box = element.getBoundingClientRect();
      const points = [[box.left + 4, box.top + 4], [box.right - 4, box.top + 4], [box.left + 4, box.bottom - 4], [box.right - 4, box.bottom - 4], [(box.left + box.right) / 2, (box.top + box.bottom) / 2]];
      return points.every(([x, y]) => element.contains(document.elementFromPoint(x, y)))
        && box.top >= 0 && box.left >= 0 && box.bottom <= innerHeight && box.right <= innerWidth;
    }),
    async finish() { assert.deepEqual(errors, [], 'console errors / warnings / page errors'); await context.close(); },
  };
  return s;
};

async function checkDefault(framework) {
  const s = await open(framework, 'default');
  const { page, card, trigger } = s;
  assert.equal(await trigger.getAttribute('aria-expanded'), 'false');
  assert.equal(await card.isVisible(), false);
  assert.equal(await trigger.getAttribute('aria-controls'), await card.getAttribute('id'), `${framework}: aria-controls はカード`);
  assert.equal(await page.getByRole('button', { name: '設定', exact: true }).count(), 1, `${framework}: action を出す`);
  // 名前と副題は 1 行で切る。
  assert.equal(await trigger.locator('span', { hasText: 'hanako@example.com' }).last().evaluate(element => getComputedStyle(element).textOverflow), 'ellipsis');

  // 押すと開き、最初の項目へフォーカス。Esc で閉じて引き金に戻る。
  await trigger.click();
  await sleep(150);
  assert.equal(await trigger.getAttribute('aria-expanded'), 'true', `${framework}: 押すと aria-expanded="true"`);
  assert.equal(await card.isVisible(), true);
  assert.equal(await s.active(), 'A:プロフィール', `${framework}: 開くと最初の項目へフォーカス`);
  assert.equal(await card.locator('a[href="#profile"]').count(), 1, `${framework}: href の項目は <a>`);
  assert.equal(await card.locator('button', { hasText: 'ログアウト' }).count(), 1, `${framework}: href の無い項目は <button>`);
  assert.equal(await card.locator('[role="menu"], [role="menuitem"]').count(), 0, `${framework}: menu の役割は付けない`);
  assert.equal(await card.locator('[class*="_itemIcon_"]').count(), 0, `${framework}: icon の無い項目はアイコンの箱を出さない`);
  // 画面の下端のパネルでは、カードはパネルの上に出る。overflow: hidden の中でも切られない。
  const panel = await trigger.evaluate(element => element.parentElement.getBoundingClientRect().toJSON());
  const box = await card.boundingBox();
  assert(box.y + box.height <= panel.top, `${framework}: 下端ではカードがパネルの上`);
  assert(await s.onTop(), `${framework}: overflow: hidden の中でもカードが切られない`);
  assert.equal(box.width, 240, `${framework}: カードの幅は 240px`);
  // Tab で項目を回り、最後から外へ出たら閉じる。
  await page.keyboard.press('Tab');
  assert.equal(await s.active(), 'A:アカウントの設定');
  await page.keyboard.press('Escape');
  await sleep(100);
  assert.equal(await card.isVisible(), false, `${framework}: Esc で閉じる`);
  assert.equal(await trigger.getAttribute('aria-expanded'), 'false');
  assert.equal(await s.active(), 'trigger', `${framework}: Esc で引き金に戻る`);
  assert.equal(await s.log(), 'open close');

  // 引き金をもう一度押すと閉じる。
  await trigger.click();
  await sleep(150);
  await trigger.click();
  await sleep(100);
  assert.equal(await card.isVisible(), false, `${framework}: 引き金で閉じる`);

  // 外側の押下で閉じる。
  await trigger.click();
  await sleep(150);
  await page.getByRole('button', { name: '外のボタン' }).click();
  await sleep(100);
  assert.equal(await card.isVisible(), false, `${framework}: 外側の押下で閉じる`);

  // フォーカスが外へ出たら閉じる。
  await trigger.click();
  await sleep(150);
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  assert.equal(await s.active(), 'BUTTON:ログアウト');
  await page.keyboard.press('Tab');
  await sleep(100);
  assert.equal(await card.isVisible(), false, `${framework}: フォーカスが外へ出たら閉じる`);

  // 項目を押すと onSelect(value) で閉じ、引き金に戻る。
  await trigger.click();
  await sleep(150);
  const before = await s.log();
  await card.getByRole('button', { name: 'ログアウト' }).click();
  await sleep(100);
  assert.equal(await s.log(), `${before} select:logout close`, `${framework}: 項目で onSelect`);
  assert.equal(await card.isVisible(), false);
  assert.equal(await s.active(), 'trigger', `${framework}: 項目を選ぶと引き金に戻る`);
  // href の項目は既定の遷移を止めない。
  await trigger.click();
  await sleep(150);
  await card.getByRole('link', { name: 'プロフィール' }).click();
  await sleep(100);
  assert.match(await s.log(), /select:profile close$/);
  assert.equal(await page.evaluate(() => location.hash), '#profile', `${framework}: href の項目は遷移を止めない`);
  await s.finish();
}

async function checkPlacement(framework) {
  // 上端のパネルでは、上に入らないのでカードは下に出る。
  const top = await open(framework, 'top-edge');
  const panel = await top.trigger.evaluate(element => element.parentElement.getBoundingClientRect().toJSON());
  const box = await top.card.boundingBox();
  assert.equal(await top.card.isVisible(), true, `${framework}: defaultOpen で開いている`);
  assert(box.y >= panel.bottom, `${framework}: 上端ではカードがパネルの下`);
  assert(await top.onTop());
  await top.finish();

  // モーダルの Drawer（dialog）の中でも、カードが前に出る。
  const drawer = await open(framework, 'in-drawer');
  await drawer.trigger.click();
  await sleep(150);
  assert.equal(await drawer.card.isVisible(), true);
  assert(await drawer.onTop(), `${framework}: Drawer の中でもカードが前に出る`);
  // Esc はカードだけを閉じ、Drawer は開いたまま。
  await drawer.page.keyboard.press('Escape');
  await sleep(100);
  assert.equal(await drawer.card.isVisible(), false);
  assert.equal(await drawer.page.locator('dialog[open]').count(), 1, `${framework}: Esc は Drawer を閉じない`);
  await drawer.finish();

  // compact はアバターのボタンだけで、読み上げ名は name。action は出さない。
  const compact = await open(framework, 'compact');
  assert.equal(await compact.page.getByRole('button', { name: 'hanako', exact: true }).count(), 1, `${framework}: compact の読み上げ名は name`);
  assert.equal(await compact.page.getByRole('button', { name: '設定', exact: true }).count(), 0, `${framework}: compact は action を出さない`);
  assert.equal(await compact.trigger.locator('span', { hasText: 'hanako@example.com' }).count(), 0);
  await compact.finish();

  // アイコンつきの項目: どれかにあれば全部の項目に同じ幅の箱。無効な項目は選べない。
  const icons = await open(framework, 'with-icons');
  assert.equal(await icons.card.locator('[class*="_itemIcon_"]').count(), 4, `${framework}: アイコンの箱は全部の項目に出る`);
  assert.equal(await icons.card.locator('[class*="_itemIcon_"] svg').count(), 3, `${framework}: icon のある項目だけアイコン`);
  const x = await icons.card.locator('[class*="_itemLabel_"]').evaluateAll(elements => elements.map(element => Math.round(element.getBoundingClientRect().left)));
  assert.equal(new Set(x).size, 1, `${framework}: ラベルの位置がそろう ${x}`);
  assert.equal(await icons.card.locator('[data-destructive="true"]').evaluate(element => getComputedStyle(element).color),
    await icons.page.evaluate(() => { const probe = document.createElement('span'); probe.style.color = 'var(--koyori-color-danger)'; document.body.append(probe); const color = getComputedStyle(probe).color; probe.remove(); return color; }),
    `${framework}: destructive は危険の色`);
  const help = icons.card.getByRole('button', { name: 'ヘルプ（準備中）' });
  assert.equal(await help.getAttribute('aria-disabled'), 'true');
  await help.click({ force: true });
  await sleep(100);
  assert.equal(await icons.card.isVisible(), true, `${framework}: 無効な項目では閉じない`);
  assert.doesNotMatch(await icons.log(), /select:help/, `${framework}: 無効な項目は onSelect を呼ばない`);
  await icons.finish();
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
      await checkPlacement(framework);
      console.log(`${framework}: UserPanel の開閉・フォーカス・選択・位置・Drawer の中・compact・アイコンを確認しました。`);
    }
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  } finally {
    await browser?.close();
    server.kill();
  }
})();
