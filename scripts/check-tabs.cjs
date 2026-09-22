// Run after typecheck, build-storybook and the docs build. Uses existing Playwright.
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { resolve } = require('node:path');
const { readdirSync, readFileSync } = require('node:fs');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = resolve(__dirname, '..');
const port = process.env.TABS_TEST_PORT || '16307';
const docsPort = process.env.TABS_DOCS_TEST_PORT || '16317';
const base = `http://127.0.0.1:${port}`;
async function serve(directory, port) {
  const server = spawn('python3', ['-u', '-m', 'http.server', port, '--bind', '127.0.0.1', '--directory', directory], { stdio: ['ignore', 'pipe', 'pipe'] });
  let serverError = '';
  server.stderr.on('data', chunk => { serverError += chunk; });
  await new Promise((resolve, reject) => {
    server.stdout.once('data', chunk => {
      if (String(chunk).includes('Serving HTTP')) resolve();
      else reject(new Error(`Unexpected server output: ${chunk}`));
    });
    server.once('error', reject);
    server.once('exit', code => reject(new Error(`Own server failed (${code}): ${serverError}`)));
  });
  return server;
}
let browser, server, docsServer;
(async () => {
  try {
    server = await serve(root, port); // Never accept an unrelated process that already owns this port.
    browser = await chromium.launch({ headless: true });
    const axe = readdirSync(`${root}/node_modules/.pnpm`).find(name => name.startsWith('axe-core@'));
    const axeSource = readFileSync(`${root}/node_modules/.pnpm/${axe}/node_modules/axe-core/axe.min.js`, 'utf8');
    for (const framework of ['react', 'vue']) {
      const page = await browser.newPage({ viewport: { width: 800, height: 650 } });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      page.on('console', message => { if (['error', 'warning'].includes(message.type())) errors.push(message.text()); });
      const story = async name => {
        await page.goto(`${base}/packages/${framework}/storybook-static/iframe.html?id=components-tabs--${name}&viewMode=story`);
        await page.locator('output').first().waitFor();
      };
      const tab = value => page.locator(`#task-views-tab-${value}`);
      const panel = value => page.locator(`#task-views-panel-${value}`);
      const focused = async locator => assert(await locator.evaluate(el => el === document.activeElement), `${framework}: expected focus on ${await locator.getAttribute('id') || await locator.textContent()}`);
      const selected = async value => {
        await page.waitForFunction(value => document.getElementById(`task-views-tab-${value}`)?.getAttribute('aria-selected') === 'true', value);
        assert.equal(await page.getByRole('tab', { selected: true }).count(), 1);
        assert.equal(await page.getByRole('tabpanel').count(), 1);
        assert(await panel(value).isVisible());
      };
      const requests = async values => assert.deepEqual(JSON.parse(await page.locator('output').first().textContent()), values);
      const accessibility = async () => {
        await page.addScriptTag({ content: `${axeSource}\nwindow.tabsAxe = window.axe;` });
        assert.deepEqual(await page.evaluate(async () => (await window.tabsAxe.run(document.querySelector('#storybook-root'))).violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) }))), [], `${framework}: axe`);
      };

      await story('default');
      assert.equal(await page.getByRole('tablist', { name: '表示形式' }).count(), 1);
      for (const value of ['list', 'locked', 'board', 'calendar']) {
        assert.equal(await tab(value).getAttribute('aria-controls'), await panel(value).getAttribute('id'));
        assert.equal(await panel(value).getAttribute('aria-labelledby'), await tab(value).getAttribute('id'));
      }
      await selected('list');
      assert.equal(await page.getByRole('tabpanel', { name: 'リスト' }).count(), 1);
      assert.equal(await page.getByRole('textbox', { name: 'ボードのメモ' }).count(), 0, 'hidden panels leave the accessibility tree');
      assert(await tab('locked').isDisabled());
      assert.equal(await page.locator('[role="tab"][tabindex="0"]').count(), 1);
      await tab('list').focus();
      await page.keyboard.press('ArrowRight'); await focused(tab('board'));
      await selected('list'); await requests([]);
      await page.keyboard.press('ArrowRight'); await focused(tab('calendar'));
      await page.keyboard.press('ArrowRight'); await focused(tab('list'));
      await page.keyboard.press('ArrowLeft'); await focused(tab('calendar'));
      await page.keyboard.press('Home'); await focused(tab('list'));
      await page.keyboard.press('End'); await focused(tab('calendar'));
      await page.keyboard.press('ArrowDown'); await focused(tab('calendar'));
      await page.keyboard.press('ArrowUp'); await focused(tab('calendar'));
      assert.equal(await tab('calendar').evaluate(el => el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', isComposing: true, bubbles: true, cancelable: true }))), true);
      await focused(tab('calendar'));
      await page.keyboard.press('Enter'); await selected('calendar'); await requests(['calendar']);
      await page.keyboard.press('Enter'); await requests(['calendar']);
      await page.keyboard.press('Home'); await focused(tab('list'));
      await page.keyboard.press('Tab'); await focused(panel('calendar'));
      await page.keyboard.press('Shift+Tab'); await focused(tab('calendar'));
      await page.keyboard.press('Home'); await page.keyboard.press('Space');
      await selected('list'); await requests(['calendar', 'list']);
      await page.keyboard.press('Tab'); await focused(panel('list'));
      await page.keyboard.press('Tab'); await focused(page.getByRole('textbox', { name: 'リストのメモ' }));
      await page.getByRole('textbox', { name: 'リストのメモ' }).fill('切り替えても残る下書き');
      await tab('board').click(); await selected('board');
      await page.keyboard.press('Tab'); await focused(panel('board'));
      await page.keyboard.press('Tab'); await focused(page.getByRole('textbox', { name: 'ボードのメモ' }));
      await page.keyboard.press('Tab'); await focused(page.getByRole('button', { name: '外からボードを選択' }));
      await tab('list').click();
      assert.equal(await page.getByRole('textbox', { name: 'リストのメモ' }).inputValue(), '切り替えても残る下書き');
      await accessibility();

      // External changes preserve focus outside the panel, and do not echo notifications.
      await story('external-selection'); await selected('board');
      await page.getByRole('button', { name: '外からリストを選択' }).click();
      await selected('list'); await focused(page.getByRole('button', { name: '外からリストを選択' }));
      await requests([]);
      await page.getByRole('textbox', { name: 'リストのメモ' }).focus();
      await page.getByRole('button', { name: '外からボードを選択' }).evaluate(el => el.click());
      await selected('board'); await focused(tab('board')); await requests([]);
      await tab('calendar').focus();
      await page.getByRole('button', { name: '外からリストを選択' }).evaluate(el => el.click());
      await selected('list'); await focused(tab('calendar'));
      await page.keyboard.press('Tab'); await focused(panel('list'));

      for (const action of ['Remove list', 'Disable list']) {
        await story('dynamic-items');
        await tab('list').focus();
        await page.getByRole('button', { name: action, exact: true }).evaluate(el => el.click());
        await selected('board'); await focused(tab('board')); await requests([]);
        assert.equal(await page.locator('[role="tab"][tabindex="0"]').count(), 1);
        await page.keyboard.press('ArrowRight'); await focused(tab('calendar'));
        await page.keyboard.press('Enter'); await selected('calendar');
        await page.keyboard.press('ArrowLeft'); await focused(tab('board'));
        await page.keyboard.press('Space'); await selected('board'); await requests(['calendar', 'board']);

        await story('dynamic-items');
        await tab('calendar').click();
        await tab('list').focus();
        await page.getByRole('button', { name: action, exact: true }).evaluate(el => el.click());
        await selected('calendar'); await focused(tab('calendar')); await requests(['calendar']);

        await story('dynamic-items');
        await tab('calendar').focus();
        await page.getByRole('button', { name: action, exact: true }).evaluate(el => el.click());
        await selected('board'); await focused(tab('calendar'));

        await story('dynamic-items');
        await tab('list').focus();
        const outside = page.getByRole('button', { name: action, exact: true });
        await outside.click();
        await selected('board'); await focused(outside);

        await story('dynamic-items');
        await tab('list').focus();
        await outside.evaluate(el => { el.click(); el.focus(); });
        await selected('board'); await focused(outside);

        await story('dynamic-items');
        await tab('list').focus();
        await tab('list').evaluate(el => el.blur());
        await page.getByRole('button', { name: action, exact: true }).evaluate(el => el.click());
        await selected('board');
        assert(await page.evaluate(() => document.activeElement === document.body), 'an earlier explicit blur must not restore stale focus');
      }
      for (const action of ['Remove all', 'Disable all']) {
        await story('dynamic-items');
        await tab('list').focus();
        await page.getByRole('button', { name: action, exact: true }).evaluate(el => el.click());
        await page.waitForFunction(() => !document.querySelector('[role="tab"][aria-selected="true"]'));
        assert.equal(await page.getByRole('tabpanel').count(), 0);
        assert.equal(await page.locator('[role="tab"][tabindex="0"]').count(), 0);
        await requests([]);
        await page.getByRole('button', { name: 'Reset items', exact: true }).evaluate(el => el.click());
        await selected('list');
        assert(await page.evaluate(() => document.activeElement === document.body), 'restoring items does not reclaim focus after all tabs were unavailable');
      }

      await story('rejected');
      await tab('board').click(); await selected('list'); await focused(tab('board')); await requests(['board']);
      await page.keyboard.press('Tab'); await focused(panel('list'));
      await page.keyboard.press('Shift+Tab'); await focused(tab('list'));

      for (const name of ['unknown-value', 'disabled-value']) {
        await story(name); await selected('list'); await requests([]); await accessibility();
      }
      for (const name of ['empty', 'all-disabled']) {
        await story(name);
        assert.equal(await page.getByRole('tab', { selected: true }).count(), 0);
        assert.equal(await page.getByRole('tabpanel').count(), 0);
        assert.equal(await page.locator('[role="tab"][tabindex="0"]').count(), 0);
        if (name === 'empty') assert.equal(await page.getByRole('tablist').count(), 0);
        await requests([]); await accessibility();
      }
      await story('single');
      await tab('list').focus();
      for (const key of ['ArrowRight', 'ArrowLeft', 'Home', 'End', 'Enter', 'Space']) {
        await page.keyboard.press(key); await focused(tab('list'));
      }
      await selected('list'); await requests([]);

      await story('focusable-first'); await tab('list').focus();
      await page.keyboard.press('Tab'); await focused(page.getByRole('textbox', { name: 'リストのメモ' }));
      await story('right-to-left'); await tab('list').focus();
      await page.keyboard.press('ArrowLeft'); await focused(tab('board'));
      await page.keyboard.press('ArrowRight'); await focused(tab('list'));
      await page.keyboard.press('ArrowRight'); await focused(tab('calendar'));

      await story('narrow');
      assert(await page.getByRole('tablist').evaluate(el => el.scrollWidth > el.clientWidth));
      await tab('list').focus(); await page.keyboard.press('End'); await focused(tab('calendar'));
      assert(await tab('calendar').evaluate(el => { const a = el.getBoundingClientRect(), b = el.parentElement.getBoundingClientRect(); return a.left >= b.left - 1 && a.right <= b.right + 1; }), 'keyboard reveals the last tab');
      await page.keyboard.press('Enter'); await selected('calendar'); await accessibility();

      await story('multiple');
      const ids = await page.locator('#storybook-root [id]').evaluateAll(els => els.map(el => el.id));
      assert.equal(new Set(ids).size, ids.length);
      await page.locator('#other-views-tab-board').click();
      assert.equal(await page.locator('#other-views-tab-board').getAttribute('aria-selected'), 'true');
      assert.equal(await tab('list').getAttribute('aria-selected'), 'true');
      await accessibility();

      await story('default');
      const list = page.getByRole('tablist');
      const highlight = list.locator('[data-hover-highlight]');
      await tab('list').hover();
      await page.waitForFunction(() => document.querySelector('[role="tablist"]').style.getPropertyValue('--highlight-opacity') === '1');
      const firstX = await list.evaluate(el => el.style.getPropertyValue('--highlight-x'));
      await tab('board').hover();
      assert.notEqual(await list.evaluate(el => el.style.getPropertyValue('--highlight-x')), firstX, 'one hover surface moves between tabs');
      assert.equal(await tab('list').getAttribute('aria-selected'), 'true');
      const indicator = list.locator('[data-tab-indicator]');
      assert.equal(await indicator.evaluate(el => getComputedStyle(el).height), '2px', 'selected underline remains separate from hover');
      assert.equal(await list.evaluate(el => el.style.getPropertyValue('--tab-indicator-opacity')), '1');
      const indicatorX = await list.evaluate(el => el.style.getPropertyValue('--tab-indicator-x'));
      assert.notEqual(await indicator.evaluate(el => getComputedStyle(el).transitionDuration), '0s', 'underline slides between tabs');
      await tab('board').click();
      await page.waitForFunction(x => document.querySelector('[role="tablist"]').style.getPropertyValue('--tab-indicator-x') !== x, indicatorX);
      assert.equal(await indicator.evaluate(el => el.style.getPropertyValue('--tab-indicator-transition')), '', 'selection change keeps the slide transition');
      await tab('list').click();
      await page.waitForFunction(x => document.querySelector('[role="tablist"]').style.getPropertyValue('--tab-indicator-x') === x, indicatorX);
      await tab('locked').hover();
      assert.equal(await list.evaluate(el => el.style.getPropertyValue('--highlight-opacity')), '0');
      await page.mouse.move(780, 620);
      await tab('list').focus(); await page.keyboard.press('ArrowRight'); await focused(tab('board'));
      assert.equal(await list.evaluate(el => el.style.getPropertyValue('--highlight-opacity')), '1');
      assert.equal(await tab('board').evaluate(el => getComputedStyle(el).outlineStyle), 'solid');
      await page.emulateMedia({ reducedMotion: 'reduce' });
      assert.equal(await highlight.evaluate(el => getComputedStyle(el).transitionDuration), '0s');
      assert.equal(await indicator.evaluate(el => getComputedStyle(el).transitionDuration), '0s', 'underline does not slide with reduced motion');
      await page.emulateMedia({ forcedColors: 'active' });
      assert.equal(await tab('list').evaluate(el => getComputedStyle(el).outlineStyle), 'solid');
      await page.emulateMedia({ forcedColors: 'none', reducedMotion: 'no-preference' });
      assert.deepEqual(errors, [], `${framework}: no runtime or hydration errors`);
      await page.close();
      console.log(`${framework}: Tabs keyboard, pointer, controlled selection, panels, focus, highlight and axe passed`);
    }

    docsServer = await serve(`${root}/apps/docs/dist`, docsPort);
    const docs = await browser.newPage();
    const errors = [];
    docs.on('pageerror', error => errors.push(error.message));
    docs.on('console', message => { if (['error', 'warning'].includes(message.type())) errors.push(message.text()); });
    await docs.goto(`http://127.0.0.1:${docsPort}/components/tabs/`);
    for (const framework of ['vue', 'react']) {
      await docs.getByRole('tab', { name: framework === 'vue' ? 'Vue' : 'React', exact: true }).click();
      const demo = docs.locator(`#${framework}-task-views-tab-board`);
      await demo.click();
      await docs.waitForFunction(framework => document.getElementById(`${framework}-task-views-tab-board`)?.getAttribute('aria-selected') === 'true', framework);
      assert(await docs.locator(`#${framework}-task-views-panel-board`).isVisible());
    }
    assert.deepEqual(errors, [], 'docs hydrate and run both package examples');
    console.log('docs: Vue and React Tabs hydrate and switch panels');
  } finally {
    await browser?.close();
    server?.kill();
    docsServer?.kill();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
