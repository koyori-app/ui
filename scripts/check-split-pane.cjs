// Run after pnpm typecheck and pnpm -r build-storybook. See README for PLAYWRIGHT_MODULE.
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { readdirSync } = require('node:fs');
const { createRequire } = require('node:module');
const { resolve } = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = resolve(__dirname, '..');
const port = process.env.SPLIT_PANE_TEST_PORT || '16306';
const base = `http://127.0.0.1:${port}`;
const server = spawn('python3', ['-u', '-m', 'http.server', port, '--bind', '127.0.0.1', '--directory', root], { stdio: ['ignore', 'pipe', 'pipe'] });
let browser;
(async () => {
  try {
    // Wait for our own process to bind; never silently test another worker's server.
    await new Promise((ready, reject) => {
      server.stdout.on('data', data => { if (data.toString().includes('Serving HTTP')) ready(); });
      server.once('error', reject);
      server.once('exit', code => reject(new Error(`Test server failed to start (${code})`)));
      setTimeout(() => reject(new Error('Test server startup timed out')), 5000).unref();
    });
    browser = await chromium.launch({ headless: true });
    const axe = readdirSync(`${root}/node_modules/.pnpm`).find(name => name.startsWith('axe-core@'));
    const frameworks = ['react', 'vue'].filter(name => !process.env.SPLIT_PANE_TEST_FRAMEWORK || name === process.env.SPLIT_PANE_TEST_FRAMEWORK);
    assert(frameworks.length, 'SPLIT_PANE_TEST_FRAMEWORK must be react or vue');
    for (const framework of frameworks) {
      const requirePackage = createRequire(resolve(root, `packages/${framework}/package.json`));
      const { SplitPane } = await import(pathToFileURL(resolve(root, `packages/${framework}/dist/index.js`)));
      const props = { label: '一覧', primaryId: 'ssr-primary', size: 240 };
      const html = framework === 'react'
        ? requirePackage('react-dom/server').renderToString(requirePackage('react').createElement(SplitPane, props))
        : await requirePackage('vue/server-renderer').renderToString(requirePackage('vue').createSSRApp(SplitPane, props));
      assert.match(html, /role="separator"/);
      assert.match(html, /aria-controls="ssr-primary"/);
      assert.match(html, /aria-valuenow="240"/);
      assert.match(html, /aria-disabled="true"/, 'SSR waits to measure the parent before resizing');

      const page = await browser.newPage({ viewport: { width: 900, height: 750 }, hasTouch: true });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      page.on('console', message => { if (['error', 'warning'].includes(message.type())) errors.push(message.text()); });
      const handle = page.getByRole('separator');
      const split = handle.locator('..');
      const requests = async () => JSON.parse(await page.locator('[data-requests]').innerText());
      const value = async () => Number(await handle.getAttribute('aria-valuenow'));
      const settle = () => page.waitForTimeout(80);
      const story = async name => {
        await page.goto(`${base}/packages/${framework}/storybook-static/iframe.html?id=components-splitpane--${name}&viewMode=story`);
        await handle.waitFor();
        await settle();
      };
      const width = async expected => {
        await page.waitForFunction(n => Math.abs(Number(document.querySelector('[role=separator]')?.getAttribute('aria-valuenow')) - n) < 0.01, expected);
        const actual = await split.evaluate(el => el.children[0].getBoundingClientRect().width);
        assert(Math.abs(actual - expected) < 1, `${framework}: ${actual}px rendered, ${expected}px announced`);
      };
      const start = async () => {
        await handle.evaluate(el => el.addEventListener('pointerdown', event => { window.splitPointer = event.pointerId; }, { once: true }));
        const box = await handle.boundingBox();
        const position = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
        await page.mouse.move(position.x, position.y);
        await page.mouse.down();
        assert(await handle.evaluate(el => el === document.activeElement));
        assert(await handle.evaluate(el => el.hasPointerCapture(window.splitPointer)));
        return position;
      };
      const drag = async delta => {
        const p = await start();
        await page.mouse.move(p.x + delta, p.y, { steps: 3 });
        await page.mouse.up();
        await settle();
        assert.equal(await split.getAttribute('data-dragging'), null);
      };
      const axeCheck = async () => {
        await page.addScriptTag({ path: `${root}/node_modules/.pnpm/${axe}/node_modules/axe-core/axe.min.js` });
        const violations = await page.evaluate(async () => (await axe.run(document.querySelector('#storybook-root'))).violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.failureSummary) })));
        assert.deepEqual(violations, []);
      };

      await story('default');
      await width(320);
      assert.deepEqual(await requests(), []);
      assert.equal(await page.getByRole('separator', { name: 'タスク一覧', exact: true }).count(), 1);
      assert.equal(await handle.getAttribute('aria-controls'), 'task-list');
      assert.equal(await handle.getAttribute('aria-orientation'), 'vertical');
      assert.equal(await handle.getAttribute('aria-valuemin'), '160');
      assert.equal(await handle.getAttribute('aria-valuemax'), '536');
      assert.equal(await handle.getAttribute('aria-valuetext'), '320px');
      const box = await handle.boundingBox();
      assert(box.width >= 24 && box.height >= 36, 'usable pointer target');
      await page.getByRole('button', { name: '一覧の操作', exact: true }).focus();
      await page.keyboard.press('Tab');
      assert(await handle.evaluate(el => el === document.activeElement));
      assert.equal(await handle.evaluate(el => getComputedStyle(el).outlineWidth), '2px');
      await page.keyboard.press('ArrowLeft'); await width(310);
      await page.keyboard.press('Shift+ArrowRight'); await width(360);
      await page.keyboard.press('Home'); await width(160);
      const lowerCount = (await requests()).length;
      await page.keyboard.press('ArrowLeft'); await page.keyboard.press('Home');
      assert.equal((await requests()).length, lowerCount, 'no notification past the lower bound');
      await page.keyboard.press('End'); await width(536);
      const upperCount = (await requests()).length;
      await page.keyboard.press('ArrowRight'); await page.keyboard.press('End');
      assert.equal((await requests()).length, upperCount, 'no notification past the upper bound');
      await handle.dispatchEvent('keydown', { key: 'Home', isComposing: true });
      await page.keyboard.press('Control+ArrowLeft'); await width(536);
      await page.keyboard.press('Tab');
      assert(await page.getByRole('textbox', { name: '件名' }).evaluate(el => el === document.activeElement));
      await page.keyboard.press('Shift+Tab');
      assert(await handle.evaluate(el => el === document.activeElement));
      await axeCheck();

      await story('default');
      await drag(60); await width(380);
      assert.equal((await requests()).at(-1), 380);
      await drag(-220); await width(160); // exactly min
      const minCount = (await requests()).length;
      await drag(-100); await width(160);
      assert.equal((await requests()).length, minCount);
      await drag(500); await width(536); // beyond max, captured outside the handle
      assert.equal((await requests()).at(-1), 536);

      await story('controlled');
      await drag(60); await width(380);
      await page.getByRole('button', { name: '外部サイズを240pxに' }).click(); await width(240);
      const controlledCount = (await requests()).length;
      await page.getByRole('button', { name: '親幅を切替' }).click(); await width(128);
      assert.equal(await handle.getAttribute('aria-disabled'), 'true');
      await page.getByRole('button', { name: '親幅を切替' }).click(); await width(240);
      assert.equal((await requests()).length, controlledCount, 'external values and container clamping do not notify');
      await handle.press('ArrowRight'); await width(250);
      const externalDrag = await start();
      await page.getByRole('button', { name: '外部サイズを240pxに' }).evaluate(el => el.click());
      await width(240);
      await page.mouse.move(externalDrag.x + 40, externalDrag.y); await width(290);
      await page.mouse.up();

      await story('rejected');
      await handle.press('ArrowRight'); await width(320);
      assert.deepEqual(await requests(), [330]);
      await drag(80); await width(320);
      assert.equal((await requests()).at(-1), 400, 'rejected pointer requests never move controlled UI');
      await page.getByRole('button', { name: '外部サイズを240pxに' }).click(); await width(240);

      await story('outside-range'); await width(536);
      await page.setViewportSize({ width: 1400, height: 750 });
      await page.locator('[data-split-container]').evaluate(el => { el.style.width = '1200px'; });
      await width(900);
      assert.deepEqual(await requests(), [], 'out-of-range controlled preferences are restored without notification');
      await page.setViewportSize({ width: 900, height: 750 });

      await story('default');
      await drag(80); await width(400);
      const resizedCount = (await requests()).length;
      const parent = page.locator('[data-split-container]');
      for (const [outer, expected] of [[500, 316], [344, 160], [280, 128], [24, 0], [0, 0], [720, 400]]) {
        await parent.evaluate((el, px) => { el.style.width = `${px}px`; }, outer);
        await width(expected);
      }
      assert.equal((await requests()).length, resizedCount, 'container resizing preserves the preferred width without notifications');
      // Vue reapplies the story's bound inline width when its notification output rerenders.
      await page.addStyleTag({ content: '[data-split-container] { width: 720.75px !important; }' });
      await settle();
      await handle.press('End'); await width(536.75);
      assert.equal(await split.evaluate(el => el.children[2].getBoundingClientRect().width), 160, 'fractional container widths preserve the exact secondary minimum');
      await handle.press('Home'); await width(160);
      const constraintCount = (await requests()).length;
      await page.getByRole('button', { name: '最小幅を切替' }).click(); await width(260);
      await page.getByRole('button', { name: '最小幅を切替' }).click(); await width(160);
      assert.equal((await requests()).length, constraintCount);

      for (const interruption of ['Escape', 'Tab', 'pointercancel', 'capture', 'window', 'resize', 'constraint', 'disable', 'unmount']) {
        await story('default');
        const p = await start();
        await page.mouse.move(p.x + 30, p.y); await width(350);
        const count = (await requests()).length;
        if (['Escape', 'Tab'].includes(interruption)) await page.keyboard.press(interruption);
        if (interruption === 'pointercancel') await handle.evaluate(el => el.dispatchEvent(new PointerEvent('pointercancel', { pointerId: window.splitPointer, bubbles: true })));
        if (interruption === 'capture') await handle.evaluate(el => el.releasePointerCapture(window.splitPointer));
        if (interruption === 'window') await page.evaluate(() => window.dispatchEvent(new Event('blur')));
        if (interruption === 'resize') await parent.evaluate(el => { el.style.width = '680px'; });
        if (interruption === 'constraint') await page.getByRole('button', { name: '最小幅を切替' }).evaluate(el => el.click());
        if (interruption === 'disable') await page.getByRole('button', { name: '操作可否を切替' }).evaluate(el => el.click());
        if (interruption === 'unmount') await page.getByRole('button', { name: '表示を切替' }).evaluate(el => el.click());
        await settle();
        // Pointer capture loss is dispatched by the browser before the next pointer event.
        await page.mouse.move(p.x + 80, p.y);
        await page.mouse.up();
        await settle();
        assert.equal((await requests()).length, count, `${interruption} stops the drag`);
        if (interruption === 'unmount') {
          await page.getByRole('button', { name: '表示を切替' }).click(); await width(320);
        } else assert.equal(await split.getAttribute('data-dragging'), null, interruption);
      }

      await story('default');
      const touchBox = await handle.boundingBox();
      const x = touchBox.x + touchBox.width / 2, y = touchBox.y + touchBox.height / 2;
      const cdp = await page.context().newCDPSession(page);
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + 60, y }] });
      await width(380);
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
      await settle();
      assert.equal(await split.getAttribute('data-dragging'), null, 'native touch cancellation ends capture');
      await cdp.detach();

      for (const name of ['narrow', 'unequal-minima', 'disabled']) {
        await story(name);
        const before = await value();
        if (name === 'narrow') assert.equal(before, 128);
        if (name === 'unequal-minima') assert(Math.abs(before - 256 / 3) < 0.01);
        assert.equal(await handle.getAttribute('aria-disabled'), 'true');
        await handle.press('End'); await handle.press('ArrowRight');
        const disabledBox = await handle.boundingBox();
        await page.mouse.move(disabledBox.x + 12, disabledBox.y + 20);
        await page.mouse.down(); await page.mouse.move(disabledBox.x + 90, disabledBox.y + 20); await page.mouse.up();
        await width(before);
        assert.deepEqual(await requests(), []);
        await axeCheck();
      }
      await story('invalid-values'); await width(320); await axeCheck();
      await story('zero-minima');
      await handle.press('Home'); await width(0);
      assert(await split.evaluate(el => el.children[0].inert), 'zero-width primary content is inert');
      await page.keyboard.press('Shift+Tab');
      assert(await page.getByRole('button', { name: '表示を切替' }).evaluate(el => el === document.activeElement));
      await page.keyboard.press('Tab');
      assert(await handle.evaluate(el => el === document.activeElement));
      await page.keyboard.press('End'); await width(696);
      assert(await split.evaluate(el => el.children[2].inert), 'zero-width secondary content is inert');
      await page.keyboard.press('Tab');
      assert(await page.getByRole('button', { name: '次の操作' }).evaluate(el => el === document.activeElement));
      await handle.press('ArrowLeft'); await width(686);
      assert.equal(await split.evaluate(el => el.children[2].inert), false);
      assert.equal(await page.getByRole('textbox', { name: '件名' }).inputValue(), '期限を確認する', 'restored content retains its state');
      await axeCheck();
      await story('empty');
      assert.equal(await page.getByRole('separator', { name: 'タスク一覧', exact: true }).count(), 1);
      await axeCheck();
      await page.emulateMedia({ reducedMotion: 'reduce', forcedColors: 'active' });
      await story('default');
      await handle.press('ArrowRight'); await width(330);
      assert.equal(await split.evaluate(el => getComputedStyle(el).transitionDuration), '0s');
      assert.equal(await handle.evaluate(el => getComputedStyle(el).outlineStyle), 'solid');
      assert.notEqual(await handle.locator('span').evaluate(el => getComputedStyle(el).backgroundColor), 'rgba(0, 0, 0, 0)');
      await page.emulateMedia({ reducedMotion: 'no-preference', forcedColors: 'none' });
      await page.screenshot({ path: `/tmp/ui-13-split-pane-${framework}.png` });
      await page.setViewportSize({ width: 320, height: 750 });
      await story('default');
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'narrow viewport does not create page overflow');
      await axeCheck();
      await page.screenshot({ path: `/tmp/ui-13-split-pane-${framework}-narrow.png` });
      assert.deepEqual(errors, []);
      await page.close();
      console.log(`${framework}: SplitPane SSR, pointer/touch/keyboard, exact/outside bounds, narrow/resized containers, controlled/rejected requests, interruption/unmount, focus, forced colors/reduced motion and axe passed.`);
    }
  } finally {
    await browser?.close();
    server.kill();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
