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
// 生きているリスナーを数える（破棄で取り残しがないかを直接見る）。ページの読み込み前に入れる。
const countListeners = () => {
  const live = new WeakMap();
  const key = (type, options) => type + '|' + (options === true || (options && options.capture) ? 'capture' : 'bubble');
  const add = EventTarget.prototype.addEventListener;
  const remove = EventTarget.prototype.removeEventListener;
  EventTarget.prototype.addEventListener = function (type, listener, options) {
    if (listener) {
      const keys = live.get(this) ?? new Map();
      live.set(this, keys);
      keys.set(key(type, options), (keys.get(key(type, options)) ?? new Set()).add(listener));
    }
    return add.call(this, type, listener, options);
  };
  EventTarget.prototype.removeEventListener = function (type, listener, options) {
    live.get(this)?.get(key(type, options))?.delete(listener);
    return remove.call(this, type, listener, options);
  };
  window.__listeners = (target, type, capture = false) => live.get(target)?.get(key(type, capture))?.size ?? 0;
  window.__listenersOn = target => Array.from(live.get(target)?.values() ?? [], set => set.size).reduce((sum, size) => sum + size, 0);
};

const open = async (framework, name, { clock = true, instrument = false, ...contextOptions } = {}) => {
  const context = await browser.newContext({ viewport: { width: 800, height: 600 }, ...contextOptions });
  if (instrument) await context.addInitScript(countListeners);
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
  await s.page.evaluate(() => { window.escapeReached = 0; document.addEventListener('keydown', event => { if (event.key === 'Escape') window.escapeReached++; }); });
  await s.page.keyboard.press('Escape');
  assert.equal(await s.shown(), false, `${name}: Escape closes the card`);
  assert.equal(await s.page.evaluate(() => window.escapeReached), 0, `${name}: Escape with focus in the card is not passed on`);
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
  assert.equal(await s.page.evaluate(() => window.escapeReached), 0, `${name}: Escape with focus on the trigger is not passed on`);
  // ホバーだけで開いたカードを Esc で閉じても、別の要素のフォーカスは奪わず、Esc も止めない（入力欄などへ届く）。
  await previous.focus();
  await previous.evaluate(button => { window.buttonEscape = null; button.addEventListener('keydown', event => { if (event.key === 'Escape') window.buttonEscape = { prevented: event.defaultPrevented }; }); });
  await s.hover(trigger);
  await s.tick(400);
  await s.frame();
  assert.equal(await s.shown(), true);
  await s.page.keyboard.press('Escape');
  assert.equal(await s.shown(), false);
  assert.equal(await s.active(), 'BUTTON:前へ', `${name}: Escape does not steal focus when opened by hover`);
  assert.deepEqual(await s.page.evaluate(() => window.buttonEscape), { prevented: false }, `${name}: Escape opened by hover reaches the focused element untouched`);
  assert.equal(await s.page.evaluate(() => window.escapeReached), 1, `${name}: Escape opened by hover bubbles on`);
  await s.away();
  await s.tick(1000);

  // Tab の候補。tabindex=-1・無効・非表示・inert は飛ばす。
  await previous.focus();
  await s.page.keyboard.press('Tab');
  await s.tick(400);
  await s.frame();
  assert.equal(await s.shown(), true);
  await s.page.evaluate(() => {
    const make = html => Object.assign(document.createElement('template'), { innerHTML: html }).content.firstElementChild;
    document.querySelector('[role="dialog"]').prepend(make('<a href="#skip" tabindex="-1" data-injected>飛ばす</a>'));
    document.querySelector('[role="dialog"]').append(make('<button disabled tabindex="0" data-injected>無効</button>'));
    document.querySelector('a[data-user="hanako"]').after(make('<button disabled tabindex="0" data-injected>無効の次</button>'), make('<button hidden tabindex="0" data-injected>非表示</button>'), make('<div inert data-injected><a href="#inert">inert</a></div>'));
  });
  await s.page.keyboard.press('Tab');
  assert.match(await s.active(), /^A:プロフィールを見る/, `${name}: Tab from the trigger skips tabindex=-1 links`);
  await s.page.keyboard.press('Tab');
  assert.equal(await s.active(), after, `${name}: Tab from the last item skips disabled, hidden and inert elements`);
  assert.equal(await s.shown(), false, `${name}: the card closes and focus is not left inside it`);
  await s.page.evaluate(() => document.querySelectorAll('[data-injected]').forEach(element => element.remove()));
  await s.away();
  await s.tick(1000);

  // マウスで押して得たフォーカスでは開いたままにしない。
  await s.hover(trigger);
  await s.tick(400);
  await s.frame();
  assert.equal(await s.shown(), true);
  await card.getByRole('link', { name: /プロフィールを見る/ }).click();
  assert.match(await s.active(), /^A:プロフィールを見る/);
  await s.away();
  await s.tick(149);
  assert.equal(await s.shown(), true, `${name}: still open at 149ms after a click inside`);
  await s.tick(1);
  assert.equal(await s.shown(), false, `${name}: a click inside does not keep the card open once the pointer leaves`);
  assert.equal(await trigger.getAttribute('aria-details'), null);
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

// 札から札へ移る・フォーカスとポインターが別の札にあるときの開閉。
const crossing = async framework => {
  const prepare = async () => {
    const s = await open(framework, 'external-triggers');
    s.focusHanako = async () => {
      await s.button('前へ').focus();
      await s.page.keyboard.press('Tab');
      assert.equal(await s.active(), 'A:@hanako');
      await s.tick(400);
      await s.frame();
      assert.equal(await s.shown(), true);
    };
    return s;
  };
  // 札から札へ移り、どちらにも開かないまま札の外へ出ると閉じる。
  {
    const s = await prepare();
    await s.hover(s.link('hanako'));
    await s.tick(400);
    await s.frame();
    assert.equal(await s.shown(), true);
    await s.hover(s.link('yupix'));
    await s.tick(200);
    await s.away();
    await s.tick(150);
    assert.equal(await s.shown(), false, 'the card closes after the pointer leaves for a place that is not a mention');
    assert.equal(await s.link('hanako').getAttribute('aria-details'), null);
    assert.equal(await s.link('yupix').getAttribute('aria-details'), null);
    await s.tick(1000);
    assert.equal(await s.shown(), false);
    assert.equal(await s.log(), 'open:hanako close:hanako', 'the mention that was only crossed never opens');
    await s.finish();
  }
  // カードの最後から Tab で隣の札へ出ると、普通に Tab で来たときと同じ遅れで開く。
  {
    const s = await prepare();
    await s.focusHanako();
    await s.page.keyboard.press('Tab');
    assert.match(await s.active(), /^A:プロフィールを見る/);
    await s.page.keyboard.press('Tab');
    assert.equal(await s.active(), 'A:@yupix');
    assert.equal(await s.log(), 'open:hanako close:hanako');
    await s.tick(399);
    assert.equal(await s.shown(), false, 'the next mention waits for the open delay');
    await s.tick(1);
    await s.frame();
    assert.equal(await s.shown(), true, 'tabbing out of the card onto a mention opens it');
    assert.match(await s.card.innerText(), /yupix/);
    assert.equal(await s.log(), 'open:hanako close:hanako open:yupix');
    await s.finish();
  }
  // 札にフォーカスがある間に、別の札を横切っても開かない。
  {
    const s = await prepare();
    await s.focusHanako();
    await s.hover(s.link('yupix'));
    await s.tick(100);
    await s.away();
    await s.tick(1000);
    assert.equal(await s.log(), 'open:hanako', 'a mention that was only crossed does not open while another has focus');
    assert.equal(await s.shown(), true);
    assert.match(await s.card.innerText(), /hanako/);
    await s.finish();
  }
  // カードの中にフォーカスがある間は、札を横切っても、とどまっても入れ替わらない。フォーカスはカードの中に残る。
  {
    const s = await prepare();
    await s.focusHanako();
    await s.page.keyboard.press('Tab');
    assert.match(await s.active(), /^A:プロフィールを見る/);
    await s.hover(s.link('yupix'));
    await s.tick(100);
    await s.away();
    await s.tick(1000);
    assert.equal(await s.log(), 'open:hanako', 'crossing a mention does not swap the card while focus is inside it');
    assert.match(await s.card.innerText(), /hanako/);
    assert.match(await s.active(), /^A:プロフィールを見る/);
    await s.hover(s.link('yupix'));
    await s.tick(600);
    await s.frame();
    assert.equal(await s.log(), 'open:hanako', 'resting on a mention does not swap the card while focus is inside it');
    assert.match(await s.card.innerText(), /hanako/);
    assert.equal(await s.shown(), true);
    assert.match(await s.active(), /^A:プロフィールを見る/, 'focus stays in the card');
    // フォーカスがカードから出たら通常に戻る。Esc で起点へ戻り、ポインターを離してから載せ直すと開く。
    await s.away();
    await s.page.keyboard.press('Escape');
    assert.equal(await s.shown(), false);
    await s.hover(s.link('yupix'));
    await s.tick(400);
    await s.frame();
    assert.equal(await s.shown(), true, 'after focus leaves the card, hovering another mention opens it again');
    assert.match(await s.card.innerText(), /yupix/);
    await s.finish();
  }
  // 起点にフォーカスがあって別の札にとどまると、札は入れ替わる。入れ替わってもフォーカスは起点に残る（抑止はカードの中にフォーカスがあるときだけ）。
  {
    const s = await prepare();
    await s.focusHanako();
    await s.hover(s.link('yupix'));
    await s.tick(400);
    await s.frame();
    assert.equal(await s.log(), 'open:hanako close:hanako open:yupix', 'resting on a mention swaps the card while focus is on another mention');
    assert.match(await s.card.innerText(), /yupix/);
    assert.equal(await s.active(), 'A:@hanako', 'focus stays on the focused mention');
    await s.finish();
  }
  // Esc は開く予約も取り消す。A を開いて B に移り、予約の途中で Esc を押すと、B は開かない（ポインターが B にいる間も、離れて戻るまで）。
  {
    const s = await prepare();
    await s.hover(s.link('hanako'));
    await s.tick(400);
    await s.frame();
    assert.equal(await s.shown(), true);
    await s.hover(s.link('yupix'));
    await s.tick(100);
    await s.page.keyboard.press('Escape');
    assert.equal(await s.shown(), false);
    await s.tick(1000);
    assert.equal(await s.shown(), false, 'Escape cancels the reservation of the mention the pointer moved to');
    assert.equal(await s.log(), 'open:hanako close:hanako');
    await s.away();
    await s.hover(s.link('yupix'));
    await s.tick(400);
    await s.frame();
    assert.equal(await s.shown(), true, 'the mention opens again once the pointer has left and returned');
    await s.finish();
  }
  // Esc のあと、フォーカスのある札は開き直らない。ポインターを離しても、別の札を横切っても同じ。
  {
    const s = await prepare();
    await s.focusHanako();
    await s.hover(s.link('yupix'));
    await s.tick(400);
    await s.frame();
    assert.equal(await s.log(), 'open:hanako close:hanako open:yupix');
    await s.page.keyboard.press('Escape');
    assert.equal(await s.shown(), false);
    await s.away();
    await s.tick(1000);
    assert.equal(await s.shown(), false, 'the focused mention does not open again after Escape once the pointer leaves');
    await s.hover(s.link('yupix'));
    await s.tick(100);
    await s.away();
    await s.tick(1000);
    assert.equal(await s.shown(), false, 'crossing a mention after Escape does not open the focused mention');
    assert.equal(await s.log(), 'open:hanako close:hanako open:yupix close:yupix');
    // Esc で閉じたのは yupix のカード。フォーカスのある hanako は抑止しないので、ポインターを載せれば開く。
    await s.hover(s.link('hanako'));
    await s.tick(400);
    await s.frame();
    assert.equal(await s.shown(), true, 'hovering the focused mention opens it after Escape closed another card');
    assert.equal(await s.log(), 'open:hanako close:hanako open:yupix close:yupix open:hanako');
    await s.finish();
  }
  // ホバーで開いて札の外へ出たあと、閉じる待ちの間に Esc を押しても、離れていた札は抑止しない（戻れば開く）。
  {
    const s = await prepare();
    await s.hover(s.link('hanako'));
    await s.tick(400);
    await s.frame();
    assert.equal(await s.shown(), true);
    await s.away();
    await s.tick(50);
    await s.page.keyboard.press('Escape');
    assert.equal(await s.shown(), false);
    await s.hover(s.link('hanako'));
    await s.tick(400);
    await s.frame();
    assert.equal(await s.shown(), true, 'a mention the pointer had left is not suppressed by Escape');
    await s.finish();
  }
  // フォーカスのある札が入れ替わったあと、ポインターを離しても、あとで別の札を横切っても、フォーカスのある札は開き直らない。
  {
    const s = await prepare();
    await s.focusHanako();
    await s.hover(s.link('yupix'));
    await s.tick(400);
    await s.frame();
    assert.equal(await s.log(), 'open:hanako close:hanako open:yupix');
    await s.away();
    await s.tick(1000);
    assert.equal(await s.shown(), false);
    await s.hover(s.link('yupix'));
    await s.tick(100);
    await s.away();
    await s.tick(1000);
    assert.equal(await s.shown(), false, 'an unrelated crossing does not reopen the focused mention');
    assert.equal(await s.log(), 'open:hanako close:hanako open:yupix close:yupix');
    await s.finish();
  }
  // 札にフォーカスがあって開く予約が待つ間に、別の札を横切っても、その札は開く。
  {
    const s = await prepare();
    await s.button('前へ').focus();
    await s.page.keyboard.press('Tab');
    assert.equal(await s.active(), 'A:@hanako');
    await s.tick(100);
    await s.hover(s.link('yupix'));
    await s.tick(100);
    await s.away();
    assert.equal(await s.shown(), false);
    await s.tick(399);
    assert.equal(await s.shown(), false, 'the open delay restarts from the moment the pointer leaves');
    await s.tick(1);
    await s.frame();
    assert.equal(await s.shown(), true, 'the focused mention still opens after another was crossed');
    assert.match(await s.card.innerText(), /hanako/);
    assert.equal(await s.log(), 'open:hanako');
    await s.finish();
  }
};

// 折り返した札。カードは、下に開くなら最後の行、上に開くなら最初の行の箱に付く。
const wrapped = async framework => {
  for (const side of ['bottom', 'top']) {
    const s = await open(framework, 'external-triggers');
    const link = s.link('hanako');
    await s.page.getByTestId('body').evaluate((element, side) => {
      Object.assign(element.style, side === 'bottom' ? { position: 'fixed', left: '64px', top: '120px', width: '150px', paddingLeft: '100px', textIndent: '-100px' } : { position: 'fixed', left: '64px', bottom: '24px', width: '150px' });
      element.querySelector('a[data-user="hanako"]').textContent = 'とても長い名前の @hanako さん';
    }, side);
    const rects = await link.evaluate(element => Array.from(element.getClientRects(), r => ({ left: r.left, top: r.top, right: r.right, bottom: r.bottom })));
    assert(rects.length >= 2, `${side}: the mention wraps over lines`);
    const first = rects[0];
    const last = rects[rects.length - 1];
    if (side === 'bottom') assert(last.left > first.left + 4, 'the last line starts to the right of the first');
    else assert(first.left > last.left + 4, 'the first line starts to the right of the last');
    await s.page.mouse.move((first.left + first.right) / 2, (first.top + first.bottom) / 2);
    await s.tick(400);
    await s.frame();
    assert.equal(await s.shown(), true);
    assert.equal(await s.card.getAttribute('data-side'), side);
    const c = await s.card.boundingBox();
    if (side === 'bottom') {
      near(c.x, last.left, 'the card is aligned to the left edge of the last line box');
      near(c.y, last.bottom + 8, 'the card sits below the last line box');
    } else {
      near(c.x, first.left, 'the card is aligned to the left edge of the first line box');
      near(c.y + c.height, first.top - 8, 'the card sits above the first line box');
    }
    await s.finish();
  }
};

// 部品だけを破棄したとき、容れ物に残った札にリスナーが残らない。
const detached = async framework => {
  const s = await open(framework, 'external-triggers', { instrument: true });
  const body = await s.page.getByTestId('body').elementHandle();
  await s.hover(s.link('hanako'));
  await s.tick(400);
  await s.frame();
  assert.equal(await s.shown(), true);
  const counts = () => s.page.evaluate(element => ({
    body: window.__listenersOn(element),
    keydown: window.__listeners(document, 'keydown', true),
    resize: window.__listeners(window, 'resize'),
    scroll: window.__listeners(window, 'scroll', true),
  }), body);
  const before = await counts();
  assert(before.body > 0, 'the container has the component listeners while it is mounted');
  await s.button('HoverCard を破棄').dispatchEvent('click');
  await s.card.waitFor({ state: 'detached' });
  const after = await counts();
  assert.equal(after.body, 0, 'destroy removes every listener from the container');
  assert.equal(after.keydown, before.keydown - 1, 'destroy removes the document keydown listener');
  assert.equal(after.resize, before.resize - 1, 'destroy removes the window resize listener');
  assert.equal(after.scroll, before.scroll - 1, 'destroy removes the window scroll listener');
  assert.equal(await s.link('hanako').getAttribute('aria-details'), null, 'destroy removes aria-details');
  await s.away();
  await s.hover(s.link('hanako'));
  await s.tick(1000);
  assert.equal(await s.log(), 'open:hanako', 'hovering a mention left in the container no longer opens or logs');
  assert.equal(await s.page.locator('[role="dialog"]').count(), 0);
  await s.button('前へ').focus();
  await s.button('前へ').evaluate(button => { window.buttonEscape = null; button.addEventListener('keydown', event => { if (event.key === 'Escape') window.buttonEscape = { prevented: event.defaultPrevented }; }); });
  await s.page.keyboard.press('Escape');
  assert.deepEqual(await s.page.evaluate(() => window.buttonEscape), { prevented: false }, 'Escape reaches other elements after destroy');
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
      await crossing(framework);
      await wrapped(framework);
      await detached(framework);

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

      // 15. 動きを減らす設定。開いた直後の動きを、設定ごとのコンテキストで確かめる（動きが終わってから設定を変えても CSS の指定は確かめられない）。
      for (const reducedMotion of ['reduce', 'no-preference']) {
        const s = await open(framework, 'default', { reducedMotion });
        await s.card.evaluate(el => { window.animationsStarted = 0; el.addEventListener('animationstart', () => window.animationsStarted++); });
        await s.hover(s.link('hanako'));
        await s.tick(400);
        const running = await s.card.evaluate(el => el.getAnimations().length);
        await sleep(250);
        const started = await s.page.evaluate(() => window.animationsStarted);
        if (reducedMotion === 'reduce') {
          assert.equal(running, 0, 'no animation right after opening with reduced motion');
          assert.equal(started, 0, 'no animation starts with reduced motion');
        } else {
          assert(started >= 1, 'the card animates in when motion is allowed');
        }
        await s.finish();
      }
      // 開いた状態（defaultOpen）。強制配色、明暗の axe。
      {
        const s = await open(framework, 'open', { clock: false });
        await s.card.waitFor({ state: 'visible' });
        await s.card.evaluate(el => Promise.all(el.getAnimations().map(a => a.finished)));
        await s.page.emulateMedia({ forcedColors: 'active' });
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
      console.log(`${framework}: HoverCard open/close delays, gap crossing, Escape, focus and Tab order, touch, delegation, mention-to-mention moves, wrapped triggers, top placement, growth, dialog, reduced motion, destroy and axe passed`);
    }
  } finally {
    await browser?.close();
    server.kill();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
