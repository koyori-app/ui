// Run after build-storybook; same browser setup as check-picker.cjs.
// キーボードの移動を動かさないこと、タッチ端末の扱い、狭い幅で崩れないことを検証する。
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { resolve, join } = require('node:path');
const { readdirSync, readFileSync } = require('node:fs');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = resolve(__dirname, '..');
const port = process.env.TOUCH_NARROW_TEST_PORT || '16340';
const base = `http://127.0.0.1:${port}`;
const server = spawn('python3', ['-u', '-m', 'http.server', port, '--bind', '127.0.0.1', '--directory', root], { stdio: 'ignore' });
let browser;

// タップ後に色が残らないよう、:hover は必ずホバーできる端末に限る。
function bareHovers(file) {
  const css = readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  const stack = [];
  const found = [];
  let start = 0;
  for (let i = 0; i < css.length; i++) {
    if (css[i] === '{') {
      const prelude = css.slice(start, i).trim();
      const gated = stack.some(entry => entry.includes('(hover: hover)'));
      if (prelude.includes(':hover') && !prelude.startsWith('@') && !gated) found.push(prelude);
      stack.push(prelude);
      start = i + 1;
    } else if (css[i] === '}') {
      stack.pop();
      start = i + 1;
    } else if (css[i] === ';') {
      start = i + 1;
    }
  }
  return found;
}
function cssFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => (entry.isDirectory()
    ? cssFiles(join(dir, entry.name))
    : entry.name.endsWith('.css') ? [join(dir, entry.name)] : []));
}
for (const file of cssFiles(resolve(root, 'components'))) {
  assert.deepEqual(bareHovers(file), [], `${file}: :hover は (hover: hover) の中に書く`);
}
for (const framework of ['react/src/generated/components/Textarea/Textarea.tsx', 'vue/src/generated/components/Textarea/Textarea.vue']) {
  assert.match(readFileSync(resolve(root, 'packages', framework), 'utf8'), /maxLength/, `${framework}: maxLength を渡す`);
}

(async () => {
  try {
    for (let i = 0; i < 40; i++) {
      try { if ((await fetch(base)).ok) break; } catch {}
      await new Promise(done => setTimeout(done, 100));
    }
    browser = await chromium.launch({ headless: true });
    const frameworks = (process.env.TOUCH_NARROW_FRAMEWORKS || 'react,vue').split(',');
    for (const framework of frameworks) {
      const open = async (page, id) => {
        await page.goto(`${base}/packages/${framework}/storybook-static/iframe.html?id=components-${id}&viewMode=story`);
        await page.locator('#storybook-root > *').first().waitFor({ state: 'attached' });
        await page.waitForTimeout(150);
      };
      const running = (locator) => locator.evaluate(el => el.getAnimations().filter(a => a.transitionProperty !== 'opacity').length);
      const pageOverflow = (page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

      // --- キーボードでの移動は動かさない。ホバーの帯は短く動く。
      const desktop = await browser.newPage({ viewport: { width: 800, height: 700 } });
      await open(desktop, 'dropdown--open');
      const band = desktop.locator('[data-hover-highlight]').first();
      await desktop.locator('[role^="menuitem"]').first().focus();
      await desktop.keyboard.press('ArrowDown');
      assert.equal(await running(band), 0, `${framework}: 矢印キーで帯を動かさない`);
      assert.match(await band.evaluate(el => getComputedStyle(el).transitionDuration), /^0\.14s/, `${framework}: ホバーの帯は 140ms`);

      await open(desktop, 'tabs--default');
      const tab = desktop.locator('[role="tab"][aria-selected="true"]');
      await tab.focus();
      await desktop.keyboard.press('ArrowRight');
      await desktop.waitForTimeout(30);
      const indicator = desktop.locator('[data-tab-indicator]').first();
      assert.equal(await running(indicator), 0, `${framework}: 矢印キーでタブの印を動かさない`);
      assert.match(await indicator.evaluate(el => getComputedStyle(el).transitionDuration), /^0\.22s/, `${framework}: タブの印は 220ms`);

      // --- デスクトップの入力欄は 13px のまま。
      await open(desktop, 'input--text');
      assert.equal(await desktop.locator('#storybook-root input').first().evaluate(el => getComputedStyle(el).fontSize), '13px', `${framework}: デスクトップの入力欄は 13px`);
      await open(desktop, 'input--max-length');
      assert.equal(await desktop.locator('#storybook-root input').first().getAttribute('maxlength'), '5', `${framework}: maxLength を input に渡す`);

      // --- Tooltip はホバーを少し待ち、フォーカスでは待たない。
      await open(desktop, 'tooltip--default');
      const tooltip = desktop.locator('[role="tooltip"]').first();
      const trigger = desktop.getByRole('button', { name: 'その他の操作' });
      await trigger.hover();
      await desktop.waitForTimeout(100);
      assert.equal(await tooltip.isVisible(), false, `${framework}: ホバーの直後には出さない`);
      await tooltip.waitFor({ state: 'visible', timeout: 1000 });
      await desktop.mouse.move(0, 0);
      await tooltip.waitFor({ state: 'hidden', timeout: 1000 });
      await trigger.hover();
      await desktop.waitForTimeout(50);
      assert.equal(await tooltip.isVisible(), true, `${framework}: 閉じた直後の 2 回目は待たせない`);
      await desktop.mouse.move(0, 0);
      await tooltip.waitFor({ state: 'hidden', timeout: 1000 });
      await desktop.waitForTimeout(400);
      await trigger.focus();
      await desktop.waitForTimeout(30);
      assert.equal(await tooltip.isVisible(), true, `${framework}: フォーカスでは待たせない`);

      // --- 極端な値。
      await open(desktop, 'pagination--large-total');
      assert.match(await desktop.locator('#storybook-root').innerText(), /128,400 件/, `${framework}: 件数に桁区切りを付ける`);
      await open(desktop, 'avatar--empty-name');
      assert.equal(await desktop.locator('[role="img"][aria-label="名前のない利用者"] svg').count(), 1, `${framework}: 名前が空ならアイコンを出す`);
      await open(desktop, 'avatar--emoji-name');
      assert.equal((await desktop.locator('[role="img"]').first().textContent()).trim(), '👩🏽‍💻P', `${framework}: 結合された絵文字を分割しない`);
      await desktop.close();

      // --- タッチ端末の入力欄は 16px にして、iOS Safari の拡大を防ぐ。
      const context = await browser.newContext({ viewport: { width: 390, height: 700 }, isMobile: true, hasTouch: true });
      const phone = await context.newPage();
      await open(phone, 'input--text');
      assert.equal(await phone.locator('#storybook-root input').first().evaluate(el => getComputedStyle(el).fontSize), '16px', `${framework}: タッチ端末の入力欄は 16px`);
      await open(phone, 'picker--open');
      assert.equal(await phone.locator('#storybook-root input').first().evaluate(el => getComputedStyle(el).fontSize), '16px', `${framework}: タッチ端末の検索欄は 16px`);
      await open(phone, 'button--secondary');
      const button = phone.locator('#storybook-root button').first();
      const resting = await button.locator('span').first().evaluate(el => getComputedStyle(el).backgroundColor);
      await button.tap();
      // 指を離した直後は押下の色が見える。ホバーの色が残っていれば、待っても戻らない。
      await button.locator('span').first().evaluate((el, expected) => new Promise((done, fail) => {
        const started = performance.now();
        const poll = () => {
          if (getComputedStyle(el).backgroundColor === expected) done();
          else if (performance.now() - started > 1500) fail(new Error(`タップ後にホバーの色が残る: ${getComputedStyle(el).backgroundColor}`));
          else requestAnimationFrame(poll);
        };
        poll();
      }), resting);
      assert.equal(await button.evaluate(el => getComputedStyle(el).touchAction), 'manipulation', `${framework}: タップの遅延をなくす`);
      await context.close();

      // --- 幅 320px で、はみ出さない。
      const narrow = await browser.newPage({ viewport: { width: 320, height: 700 } });
      await open(narrow, 'button--long-label-narrow');
      const longLabel = await narrow.locator('#storybook-root button').first().boundingBox();
      assert(longLabel.width <= 200.5, `${framework}: 長いラベルのボタンはコンテナに収める (${longLabel.width})`);
      assert(longLabel.height > 36, `${framework}: 長いラベルは折り返す`);
      assert.equal(await pageOverflow(narrow), 0, `${framework}: 長いラベルでページが横に動かない`);

      await open(narrow, 'button--narrow-row');
      for (const box of await narrow.locator('#storybook-root button').evaluateAll(els => els.map(el => el.getBoundingClientRect().height))) {
        assert(box <= 37, `${framework}: 短いラベルは狭い行でも折り返さない (${box})`);
      }

      await open(narrow, 'confirmdialog--long-confirm-label');
      const dialog = await narrow.locator('dialog[open]').boundingBox();
      for (const box of await narrow.locator('dialog[open] button').evaluateAll(els => els.map(el => { const r = el.getBoundingClientRect(); return { left: r.left, right: r.right }; }))) {
        assert(box.left >= dialog.x && box.right <= dialog.x + dialog.width, `${framework}: ダイアログのボタンを切らない`);
      }

      await open(narrow, 'picker--long-selection-narrow');
      assert.equal(await pageOverflow(narrow), 0, `${framework}: Picker の長い選択でページが横に動かない`);

      await open(narrow, 'alert--long-message-narrow');
      const body = await narrow.locator('[role="alert"], [role="status"]').first().boundingBox();
      assert(body.width >= 200, `${framework}: 狭い幅でも Alert の本文を細らせない (${body.width})`);

      await open(narrow, 'input--long-affix');
      assert((await narrow.locator('#storybook-root input').first().boundingBox()).width >= 60, `${framework}: 長い前後要素で入力欄を潰さない`);
      assert.equal(await pageOverflow(narrow), 0, `${framework}: 長い前後要素でページが横に動かない`);

      await open(narrow, 'tabs--narrow');
      const list = narrow.locator('[role="tablist"]');
      assert.equal(await list.evaluate(el => el.hasAttribute('data-more-after')), true, `${framework}: 続きのタブがある側を示す`);
      await list.evaluate(el => { el.scrollLeft = el.scrollWidth; });
      await narrow.waitForTimeout(100);
      assert.equal(await list.evaluate(el => el.hasAttribute('data-more-after')), false, `${framework}: 末尾まで進めば示さない`);
      assert.equal(await list.evaluate(el => el.hasAttribute('data-more-before')), true, `${framework}: 手前のタブがある側を示す`);
      await narrow.close();
      console.log(`${framework}: keyboard motion, touch, tooltip delay and narrow layouts ok`);
    }
  } finally {
    await browser?.close();
    server.kill();
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
