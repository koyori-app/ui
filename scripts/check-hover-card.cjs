// Run after build-storybook. See README for the external Playwright setup.
// HOVER_CARD_TEST_FRAMEWORK=vue|react で片方だけ、HOVER_CARD_TEST_PORT でポートを変えられる。
// 開閉の遅れは page.clock で進める（実時間の待ちを使わない）。story の読み込み後に時計を止める。
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { resolve } = require('node:path');
const { readFileSync, readdirSync } = require('node:fs');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = resolve(__dirname, '..');
const port = process.env.HOVER_CARD_TEST_PORT || '16341';
const base = `http://127.0.0.1:${port}`;
const frameworks = process.env.HOVER_CARD_TEST_FRAMEWORK ? [process.env.HOVER_CARD_TEST_FRAMEWORK] : ['react', 'vue'];
const server = spawn('python3', ['-u', '-m', 'http.server', port, '--bind', '127.0.0.1', '--directory', root], { stdio: ['ignore', 'pipe', 'ignore'] });
const sleep = ms => new Promise(done => setTimeout(done, ms));
let browser;
let axeSource;

// 1 つの story を開き、ページのエラーを集める。時計は story の読み込み後に止める。
const open = async (framework, name, { clock = true, ...contextOptions } = {}) => {
  const context = await browser.newContext({ viewport: { width: 800, height: 600 }, ...contextOptions });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (['error', 'warning'].includes(message.type())) errors.push(message.text()); });
  await page.goto(`${base}/packages/${framework}/storybook-static/iframe.html?id=components-hovercard--${name}&viewMode=story`);
  const card = page.locator('[role="dialog"]');
  await card.first().waitFor({ state: 'attached', timeout: 15000 });
  // container が state・ref 経由で入るまで（外の起点）と、defaultOpen の初回描画を待つ。
  await sleep(300);
  if (clock) {
    await page.clock.install();
    await page.clock.pauseAt(new Date(Date.now() + 1000));
  }
  const s = {
    page, card, errors,
    link: user => page.locator(`a[data-user="${user}"]`),
    button: name => page.getByRole('button', { name, exact: true }),
    tick: ms => page.clock.runFor(ms),
    // 1 フレーム進める。利用側（React）の再描画が終わるのを実時間で少し待つ。
    frame: async () => { await page.clock.runFor(16); await sleep(60); },
    // 描画の完了を待って読む。
    log: async () => { await sleep(60); return ((await page.getByTestId('log').textContent()) ?? '').trim(); },
    shown: () => card.isVisible(),
    center: async locator => {
      const box = await locator.boundingBox();
      assert(box, 'element has a box');
      return { x: box.x + box.width / 2, y: box.y + box.height / 2, box };
    },
    hover: async locator => { const { x, y } = await s.center(locator); await page.mouse.move(x, y); },
    away: () => page.mouse.move(799, 599),
    active: () => page.evaluate(() => document.activeElement?.tagName === 'A' ? `A:${document.activeElement.textContent}` : document.activeElement?.tagName === 'BUTTON' ? `BUTTON:${document.activeElement.textContent}` : document.activeElement?.tagName),
    async finish() { assert.deepEqual(errors, [], 'console errors / warnings / page errors'); await context.close(); },
  };
  return s;
};

const near = (actual, expected, message, tolerance = 1.5) => assert(Math.abs(actual - expected) <= tolerance, `${message}: ${actual} vs ${expected}`);
const insideViewport = async (s, locator) => {
  const box = await locator.boundingBox();
  assert(box && box.x >= 0 && box.y >= 0 && box.x + box.width <= 801 && box.y + box.height <= 601, `card within viewport: ${JSON.stringify(box)}`);
  return box;
};
// 強制配色では UA が色をシステム色に置き換えるため、axe の色の規則（作者指定の色を読む）は外す。
const accessibility = async (s, { colors = true } = {}) => {
  await s.page.clock.resume().catch(() => {});
  await s.page.addScriptTag({ content: axeSource + '\nwindow.hoverCardAxe = window.axe;' });
  assert.deepEqual(await s.page.evaluate(async contrast => (await hoverCardAxe.run(document.querySelector('#storybook-root'), { rules: { 'color-contrast': { enabled: contrast } } })).violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.failureSummary) })), colors), []);
};

// 子の起点（default）と外の起点（external-triggers）で同じ振る舞いになること。
const behaviour = async (framework, name, label) => {
  const s = await open(framework, name);
  const { card } = s;
  const trigger = s.link('hanako');
  const previous = s.button('前へ');
  // 起点の次にフォーカスできるもの。外の起点では隣の札になる。
  const after = name === 'default' ? 'BUTTON:次へ' : 'A:@yupix';
  assert.equal(await card.getAttribute('aria-label'), label, `${name}: the dialog is named by label`);
  assert.equal(await card.evaluate(el => el.hidden), true, `${name}: closed on load`);

  // 1. 開く遅れ。ホバーでフォーカスは移らない。
  await s.hover(trigger);
  await s.tick(399);
  assert.equal(await s.shown(), false, `${name}: still closed at 399ms`);
  await s.tick(1);
  await s.frame();
  assert.equal(await s.shown(), true, `${name}: open at 400ms`);
  assert(await card.evaluate(el => el.matches(':popover-open')), `${name}: card is in the top layer`);
  assert.equal(await s.log(), 'open:hanako');
  assert.equal(await trigger.getAttribute('aria-details'), await card.getAttribute('id'), `${name}: the open trigger points at the card`);
  assert.equal(await s.active(), 'BODY', `${name}: hover never takes focus`);
  assert.equal(await card.getAttribute('data-side'), 'bottom');
  // 8. 位置（下）
  const t = await trigger.boundingBox();
  const c = await insideViewport(s, card);
  near(c.y, t.y + t.height + 8, `${name}: card sits 8px below the trigger`);
  near(c.x, t.x, `${name}: card is aligned to the trigger's left edge`);

  // 2. 起点とカードの間を渡っても閉じない。
  const gap = { x: t.x + 20, y: t.y + t.height + 4 };
  await s.page.mouse.move(gap.x, gap.y, { steps: 5 });
  await s.tick(100);
  assert.equal(await s.shown(), true, `${name}: stays open while crossing the gap`);
  await s.page.mouse.move(c.x + 30, c.y + 20, { steps: 5 });
  await s.tick(300);
  assert.equal(await s.shown(), true, `${name}: stays open while the pointer is on the card`);
  await s.hover(trigger);
  await s.tick(300);
  assert.equal(await s.shown(), true, `${name}: stays open after returning to the trigger`);

  // 3. 閉じる遅れ。
  await s.away();
  await s.tick(149);
  assert.equal(await s.shown(), true, `${name}: still open at 149ms`);
  await s.tick(1);
  assert.equal(await s.shown(), false, `${name}: closed at 150ms`);
  assert.equal(await s.log(), 'open:hanako close:hanako');
  assert.equal(await trigger.getAttribute('aria-details'), null, `${name}: aria-details is removed on close`);

  // 4. 横切っただけでは開かない。
  await s.hover(trigger);
  await s.tick(200);
  await s.away();
  await s.tick(1000);
  assert.equal(await s.shown(), false, `${name}: crossing does not open`);
  assert.equal(await s.log(), 'open:hanako close:hanako', `${name}: crossing never calls onOpenChange`);

  // 5. フォーカス。Tab は 起点 → カード → 起点の次、の順に進む。
  await previous.focus();
  await s.page.keyboard.press('Tab');
  assert.equal(await s.active(), 'A:@hanako');
  await s.tick(399);
  assert.equal(await s.shown(), false, `${name}: focus waits for the delay too`);
  await s.tick(1);
  await s.frame();
  assert.equal(await s.shown(), true, `${name}: opens on keyboard focus`);
  await s.page.keyboard.press('Tab');
  assert.match(await s.active(), /^A:プロフィールを見る/, `${name}: Tab moves into the card`);
  await s.page.keyboard.press('Shift+Tab');
  assert.equal(await s.active(), 'A:@hanako', `${name}: Shift+Tab returns to the trigger`);
  await s.tick(1000);
  assert.equal(await s.shown(), true, `${name}: stays open while focus is inside`);
  await s.page.keyboard.press('Tab');
  await s.page.keyboard.press('Tab');
  assert.equal(await s.active(), after, `${name}: Tab from the last card link goes to the element after the trigger`);
  assert.equal(await s.shown(), false, `${name}: leaving by Tab closes the card`);
  // 素通りしたときは開かない。
  await previous.focus();
  await s.page.keyboard.press('Tab');
  await s.page.keyboard.press('Shift+Tab');
  assert.equal(await s.active(), 'BUTTON:前へ');
  await s.tick(1000);
  assert.equal(await s.shown(), false, `${name}: tabbing past the trigger does not open`);

  // 6. Esc。カードの中にいたときだけ起点にフォーカスを戻す。
  await previous.focus();
  await s.page.keyboard.press('Tab');
  await s.tick(400);
  await s.frame();
  await s.page.keyboard.press('Tab');
  assert.match(await s.active(), /^A:プロフィールを見る/);
  await s.page.keyboard.press('Escape');
  assert.equal(await s.shown(), false, `${name}: Escape closes the card`);
  assert.equal(await s.active(), 'A:@hanako', `${name}: Escape inside the card returns focus to the trigger`);
  await s.tick(1000);
  assert.equal(await s.shown(), false, `${name}: Escape does not reopen while focus stays`);
  await s.page.keyboard.press('Tab');
  assert.equal(await s.active(), after);
  await s.page.keyboard.press('Shift+Tab');
  await s.tick(400);
  await s.frame();
  assert.equal(await s.shown(), true, `${name}: leaving and coming back opens again`);
  await s.page.keyboard.press('Escape');
  assert.equal(await s.shown(), false);
  assert.equal(await s.active(), 'A:@hanako', `${name}: Escape on the trigger keeps focus there`);
  // ホバーだけで開いたカードを Esc で閉じても、別の要素のフォーカスは奪わない。
  await previous.focus();
  await s.hover(trigger);
  await s.tick(400);
  await s.frame();
  assert.equal(await s.shown(), true);
  await s.page.keyboard.press('Escape');
  assert.equal(await s.shown(), false);
  assert.equal(await s.active(), 'BUTTON:前へ', `${name}: Escape does not steal focus when opened by hover`);
  await s.away();
  await s.tick(1000);

  // 9. axe（開いた状態）。axe が時計を使うので、最後に時計を流してから走らせる。
  await s.hover(trigger);
  await s.tick(400);
  await s.frame();
  assert.equal(await s.shown(), true);
  await accessibility(s);
  await s.finish();
};

// 外の起点だけ。札の移動と、描き直しに追従すること。
const delegated = async framework => {
  const s = await open(framework, 'external-triggers');
  const { card } = s;
  await s.hover(s.link('hanako'));
  await s.tick(400);
  await s.frame();
  assert.equal(await s.shown(), true);
  await s.hover(s.link('yupix'));
  await s.tick(400);
  await s.frame();
  assert.equal(await s.log(), 'open:hanako close:hanako open:yupix', 'moving to another mention swaps the card');
  assert.equal(await s.page.locator('[role="dialog"]').count(), 1, 'there is one card');
  assert.match(await card.innerText(), /yupix/);
  assert.equal(await s.link('hanako').getAttribute('aria-details'), null);
  assert.equal(await s.link('yupix').getAttribute('aria-details'), await card.getAttribute('id'));
  // セレクターに合わない札では開かない。
  await s.away();
  await s.tick(1000);
  await s.hover(s.page.locator('a[href="#left"]'));
  await s.tick(1000);
  assert.equal(await s.shown(), false, 'a mention without data-user has no card');
  assert.equal(await s.log(), 'open:hanako close:hanako open:yupix close:yupix');
  // 11. 描き直し。
  await s.hover(s.link('hanako'));
  await s.tick(400);
  await s.frame();
  assert.equal(await s.shown(), true);
  await s.page.getByTestId('body').evaluate(el => { el.innerHTML = el.innerHTML; });
  assert.equal(await s.shown(), false, 'replacing the trigger closes the card');
  assert((await s.log()).endsWith('open:hanako close:hanako'));
  await s.away();
  await s.hover(s.link('hanako'));
  await s.tick(400);
  await s.frame();
  assert.equal(await s.shown(), true, 'the redrawn mention opens without re-registering');
  await s.finish();
};

(async () => {
  try {
    await new Promise((resolve, reject) => {
      server.stdout.once('data', resolve);
      server.once('error', reject);
      server.once('exit', code => reject(new Error(`HoverCard test server exited (${code}); check port ${port}`)));
    });
    browser = await chromium.launch({ headless: true });
    const axe = readdirSync(`${root}/node_modules/.pnpm`).find(name => name.startsWith('axe-core@'));
    axeSource = readFileSync(`${root}/node_modules/.pnpm/${axe}/node_modules/axe-core/axe.min.js`, 'utf8');
    for (const framework of frameworks) {
      await behaviour(framework, 'default', 'hanako のプロフィール');
      await behaviour(framework, 'external-triggers', 'メンションのプロフィール');
      await delegated(framework);

      // 7. タッチでは開かない。タップは起点の既定の動作のまま。
      for (const name of ['default', 'external-triggers']) {
        const s = await open(framework, name, { hasTouch: true, isMobile: true });
        await s.link('hanako').tap();
        await s.tick(1000);
        assert.equal(await s.shown(), false, `${name}: a tap does not open the card`);
        assert.equal(await s.log(), '', `${name}: a tap never calls onOpenChange`);
        assert.equal(await s.page.evaluate(() => location.hash), '#profile-hanako', `${name}: the tap follows the link`);
        await s.finish();
      }

      // 12. 画面の下端では上に開く。
      {
        const s = await open(framework, 'bottom-edge', { clock: false });
        await s.card.waitFor({ state: 'visible' });
        assert.equal(await s.card.getAttribute('data-side'), 'top');
        const t = await s.link('hanako').boundingBox();
        const c = await insideViewport(s, s.card);
        near(c.y + c.height, t.y - 8, 'card sits 8px above the trigger');
        await s.finish();
      }

      // 13. 中身が伸びても起点から離れない。
      {
        const s = await open(framework, 'growing');
        await s.hover(s.link('hanako'));
        await s.tick(400);
        await s.frame();
        assert.equal(await s.card.getAttribute('data-side'), 'bottom', 'short content opens below');
        const before = (await s.card.boundingBox()).height;
        await s.button('中身を増やす').dispatchEvent('click');
        for (let i = 0; i < 40 && (await s.card.boundingBox()).height <= before; i++) await sleep(25);
        await sleep(100);
        const t = await s.link('hanako').boundingBox();
        const c = await insideViewport(s, s.card);
        assert(c.height > before, 'the card grew');
        assert.equal(await s.card.getAttribute('data-side'), 'top', 'it moves above when it no longer fits below');
        near(c.y + c.height, t.y - 8, 'the grown card stays attached to the trigger');
        await s.finish();
      }

      // 14. Dialog の中。Esc はカードだけを閉じる。
      {
        const s = await open(framework, 'in-dialog');
        await s.page.locator('dialog').evaluate(el => el.showModal());
        await s.hover(s.link('hanako'));
        await s.tick(400);
        await s.frame();
        assert.equal(await s.shown(), true);
        await s.page.keyboard.press('Escape');
        assert.equal(await s.shown(), false, 'Escape closes the card');
        assert.equal(await s.page.locator('dialog').evaluate(el => el.open), true, 'Escape closes only the card');
        await s.page.keyboard.press('Escape');
        assert.equal(await s.page.locator('dialog').evaluate(el => el.open), false, 'the next Escape reaches the dialog');
        await s.finish();
      }

      // 15. 開いた状態（defaultOpen）。動きを減らす・強制配色、明暗の axe。
      {
        const s = await open(framework, 'open', { clock: false });
        await s.card.waitFor({ state: 'visible' });
        await s.card.evaluate(el => Promise.all(el.getAnimations().map(a => a.finished)));
        await s.page.emulateMedia({ reducedMotion: 'reduce', forcedColors: 'active' });
        assert.equal(await s.card.evaluate(el => el.getAnimations().length), 0, 'no animation with reduced motion');
        const border = await s.card.evaluate(el => { const css = getComputedStyle(el); return `${css.borderTopWidth} ${css.borderTopStyle}`; });
        assert.equal(border, '1px solid', 'the border stays in forced colors');
        const colors = await s.card.evaluate(el => { const text = el.querySelector('.demo-card-bio'); return `${getComputedStyle(el).color} on ${getComputedStyle(el).backgroundColor} / ${getComputedStyle(text).color}`; });
        assert.equal(colors, 'rgb(0, 0, 0) on rgb(255, 255, 255) / rgb(0, 0, 0)', 'forced colors give the card system colors');
        await accessibility(s, { colors: false });
        await s.finish();
      }
      for (const name of ['open', 'open-light']) {
        const s = await open(framework, name, { clock: false });
        await s.card.waitFor({ state: 'visible' });
        await s.card.evaluate(el => Promise.all(el.getAnimations().map(a => a.finished)));
        assert.equal(await s.page.evaluate(() => document.documentElement.dataset.theme), name === 'open' ? 'dark' : 'light');
        await accessibility(s);
        await s.finish();
      }

      // 16. 破棄。リスナーと aria-details が残らず、onOpenChange も呼ばれない。
      {
        const s = await open(framework, 'default');
        const trigger = await s.link('hanako').elementHandle();
        await s.hover(s.link('hanako'));
        await s.tick(400);
        await s.frame();
        assert.equal(await s.shown(), true);
        await s.button('HoverCard を破棄').dispatchEvent('click');
        await s.card.waitFor({ state: 'detached' });
        assert.equal(await trigger.getAttribute('aria-details'), null, 'destroy removes aria-details');
        await trigger.evaluate(el => el.dispatchEvent(new PointerEvent('pointerover', { bubbles: true, pointerType: 'mouse' })));
        await s.tick(1000);
        assert.equal(await s.log(), 'open:hanako', 'destroy does not call onOpenChange and stops listening');
        await s.finish();
      }
      console.log(`${framework}: HoverCard open/close delays, gap crossing, Escape, focus and Tab order, touch, delegation, top placement, growth, dialog, reduced motion, destroy and axe passed`);
    }
  } finally {
    await browser?.close();
    server.kill();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
