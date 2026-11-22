// Run after pnpm typecheck, pnpm build-storybook and pnpm build:docs.
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { resolve } = require('node:path');
const { readFileSync, readdirSync } = require('node:fs');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = resolve(__dirname, '..');
const storyPort = process.env.TREE_TEST_PORT || '16340';
const docsPort = process.env.TREE_DOCS_TEST_PORT || '16341';
const servers = [];
let browser;

async function serve(directory, port) {
  const server = spawn('python3', ['-u', '-m', 'http.server', port, '--bind', '127.0.0.1', '--directory', directory], { stdio: ['ignore', 'pipe', 'pipe'] });
  servers.push(server);
  // Wait for this process to bind; never mistake another worker server for ours.
  await new Promise((resolve, reject) => {
    let errors = '';
    const timeout = setTimeout(() => reject(new Error(`Server ${port} did not start: ${errors}`)), 5000);
    server.stderr.on('data', chunk => { errors += chunk; });
    server.once('error', error => { clearTimeout(timeout); reject(error); });
    server.once('exit', code => { clearTimeout(timeout); reject(new Error(`Server ${port} exited (${code}): ${errors}`)); });
    server.stdout.on('data', chunk => {
      if (chunk.toString().includes('Serving HTTP')) { clearTimeout(timeout); resolve(); }
    });
  });
  return `http://127.0.0.1:${port}`;
}

(async () => {
  try {
    const storyBase = await serve(root, storyPort);
    const docsBase = await serve(resolve(root, 'apps/docs/dist'), docsPort);
    const axe = readdirSync(resolve(root, 'node_modules/.pnpm')).find(name => name.startsWith('axe-core@'));
    assert(axe, 'use axe-core already installed by Storybook');
    const axeSource = readFileSync(resolve(root, `node_modules/.pnpm/${axe}/node_modules/axe-core/axe.min.js`), 'utf8');
    browser = await chromium.launch({ headless: true });

    for (const framework of ['react', 'vue']) {
      const page = await browser.newPage({ viewport: { width: 800, height: 700 } });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      page.on('console', message => { if (['error', 'warning'].includes(message.type())) errors.push(message.text()); });
      const story = async name => {
        await page.goto(`${storyBase}/packages/${framework}/storybook-static/iframe.html?id=components-tree--${name}&viewMode=story`);
        await page.locator('#storybook-root [role="treeitem"]').first().waitFor();
        // ライブラリは地を塗らない。React の Storybook には地を塗る preview.css が無いため、利用側と同じく面の色を敷く。
        await page.addStyleTag({ content: 'body { background: var(--koyori-color-surface); color: var(--koyori-color-text); }' });
      };
      const a11y = async selector => {
        await page.addScriptTag({ content: `${axeSource}\nwindow.treeAxe = window.axe;` });
        const violations = await page.evaluate(async selector => (await window.treeAxe.run(document.querySelector(selector))).violations.map(v => ({ id: v.id, targets: v.nodes.map(n => n.target) })), selector);
        assert.deepEqual(violations, []);
      };
      const tree = page.locator('#storybook-root [role="tree"]');
      const items = tree.locator('[role="treeitem"]');
      const node = id => tree.locator(`[data-tree-id="${id}"]`);
      const ids = () => items.evaluateAll(els => els.map(el => el.getAttribute('data-tree-id')));
      const focused = () => page.evaluate(() => document.activeElement?.getAttribute('data-tree-id') ?? null);
      const output = page.locator('#storybook-root output');
      const press = async (key, expected) => {
        await page.keyboard.press(key);
        assert.equal(await focused(), expected, `${framework}: ${key} moves focus to ${expected}`);
      };

      // role と aria。見えている節を 1 段に並べ、深さと兄弟の中の位置を属性で伝える。
      await story('default');
      assert.equal(await tree.getAttribute('aria-label'), 'ファイル');
      assert.equal(await page.locator('#storybook-root').getByText('ファイル · 5', { exact: true }).count(), 1, 'heading');
      assert.equal(await tree.locator('[role="group"]').count(), 0, 'flat rows, no nested groups');
      assert.deepEqual(await ids(), ['lib', 'state', 'url', 'url-test', 'composables', 'use-url', 'pages', 'page'], 'all branches start open');
      const attrs = id => node(id).evaluate(el => ['aria-level', 'aria-setsize', 'aria-posinset', 'aria-expanded', 'aria-selected', 'tabindex']
        .map(name => el.getAttribute(name)));
      assert.deepEqual(await attrs('lib'), ['1', '3', '1', 'true', null, '-1']);
      assert.deepEqual(await attrs('state'), ['2', '3', '1', null, 'true', '0'], 'leaves have no aria-expanded; the selection is the tab stop');
      assert.deepEqual(await attrs('url-test'), ['2', '3', '3', null, 'false', '-1'], 'a selectable leaf that is not selected has aria-selected="false" (APG)');
      assert.deepEqual(await attrs('pages'), ['1', '3', '3', 'true', null, '-1']);
      assert.equal(await items.evaluateAll(els => els.filter(el => el.getAttribute('tabindex') === '0').length), 1, 'one tab stop');
      assert.equal(await node('pages').getAttribute('title'), 'apps/frontend/src/pages/projects/@projectKey/tasks');
      // badge は soft・sm の Badge。色は tone から。
      const badge = node('state').locator('[data-tone]');
      assert.equal(await badge.innerText(), '2 / 3');
      assert.deepEqual(await badge.evaluate(el => [el.dataset.tone, el.dataset.appearance, el.dataset.size]), ['danger', 'soft', 'sm']);
      assert.equal(await node('url-test').locator('[data-tone]').getAttribute('data-tone'), 'success');
      assert.equal(await node('lib').locator('[data-tone]').count(), 0);
      // 葉のアイコンと開閉の矢印は読み上げから除く。字下げで葉のアイコンが親のラベルの頭に揃う。
      assert.equal(await tree.locator('svg').count(), 8, '3 chevrons + 5 file icons');
      assert.equal(await tree.locator('svg:not([aria-hidden="true"])').evaluateAll(els => els.filter(el => !el.closest('[aria-hidden="true"]')).length), 0);
      const leafIcon = await node('state').locator('svg').boundingBox();
      const branchLabel = await node('lib').locator('span').last().boundingBox();
      assert(Math.abs(leafIcon.x - branchLabel.x) < 1, `${framework}: leaf icon (${leafIcon.x}) lines up with the parent label (${branchLabel.x})`);
      const rowHeight = (await node('state').boundingBox()).height;
      assert(rowHeight >= 32, `${framework}: rows are at least 32px tall (${rowHeight})`);
      await a11y('#storybook-root');

      // キーボード（APG の Tree View）。
      await page.keyboard.press('Tab');
      assert.equal(await focused(), 'state', 'Tab enters at the selected node');
      await press('ArrowDown', 'url');
      await press('ArrowUp', 'state');
      await press('ArrowLeft', 'lib');
      await page.keyboard.press('ArrowLeft');
      assert.equal(await node('lib').getAttribute('aria-expanded'), 'false', 'ArrowLeft closes an open node');
      assert.deepEqual(await ids(), ['lib', 'composables', 'use-url', 'pages', 'page']);
      await press('ArrowDown', 'composables');
      await press('ArrowUp', 'lib');
      await page.keyboard.press('ArrowRight');
      assert.equal(await node('lib').getAttribute('aria-expanded'), 'true', 'ArrowRight opens a closed node');
      assert.equal(await focused(), 'lib');
      await press('ArrowRight', 'state');
      await press('End', 'page');
      await press('ArrowDown', 'page');
      await press('Home', 'lib');
      await press('ArrowUp', 'lib');
      assert.equal(await items.evaluateAll(els => els.filter(el => el.getAttribute('tabindex') === '0').map(el => el.dataset.treeId).join()), 'lib', 'the tab stop follows focus');
      await page.keyboard.press('End');
      await page.keyboard.press('Enter');
      assert.equal(await output.innerText(), 'page', 'Enter selects a leaf');
      assert.equal(await node('page').getAttribute('aria-selected'), 'true');
      assert.equal(await node('state').getAttribute('aria-selected'), 'false');
      await press('ArrowUp', 'pages');
      await page.keyboard.press(' ');
      assert.equal(await node('pages').getAttribute('aria-expanded'), 'false', 'Space on a branch toggles it');
      assert.equal(await output.innerText(), 'page', 'toggling does not change the selection');
      assert(await page.evaluate(() => window.scrollY === 0), 'handled keys do not scroll the page');
      await page.keyboard.press('Tab');
      assert.equal(await focused(), null, 'Tab leaves the tree');
      assert.equal(await tree.evaluate(el => getComputedStyle(el).getPropertyValue('--highlight-opacity').trim()), '0', 'the focus highlight leaves with the focus');
      // 木に入り直すと、最後にフォーカスした節ではなく選択中の節へ入る（APG）。選択が隠れていれば先頭。
      await page.keyboard.press('Shift+Tab');
      assert.equal(await focused(), 'lib', 'Shift+Tab re-enters at the first node when the selection is hidden');
      await press('ArrowDown', 'state');
      await page.keyboard.press('Enter');
      await press('ArrowDown', 'url');
      await page.keyboard.press('Tab');
      assert.equal(await focused(), null);
      await page.keyboard.press('Shift+Tab');
      assert.equal(await focused(), 'state', 'Shift+Tab re-enters at the selection, not at the last focused node');
      await page.keyboard.press('Tab');

      // クリック: 子を持つ節は開閉、葉は選択。
      await node('composables').click();
      assert.equal(await node('composables').getAttribute('aria-expanded'), 'false');
      assert.equal(await node('use-url').count(), 0);
      await node('composables').click();
      assert.equal(await node('composables').getAttribute('aria-expanded'), 'true');
      await node('url').click();
      assert.equal(await output.innerText(), 'url');
      assert.equal(await focused(), 'url', 'the clicked node takes focus');
      // ホバーの背景は Dropdown と同じく 1 つの面が動く。
      await node('url-test').hover();
      await page.waitForFunction(() => getComputedStyle(document.querySelector('[role="tree"]')).getPropertyValue('--highlight-opacity').trim() === '1');
      await page.emulateMedia({ reducedMotion: 'reduce' });
      assert.equal(await node('lib').locator('span').first().evaluate(el => getComputedStyle(el).transitionDuration), '0s', 'reduced motion stops the chevron');
      await page.emulateMedia({ reducedMotion: 'no-preference' });
      await a11y('#storybook-root');
      // 明るい表示でも対比が足りる。
      await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'light'));
      await a11y('#storybook-root');
      await page.evaluate(() => document.documentElement.removeAttribute('data-theme'));

      // 強制カラーモード: 選択中の節にフォーカスがあると、選択だけの節と輪郭が違う。ホバーにも輪郭を出す。
      await story('default');
      await page.emulateMedia({ forcedColors: 'active' });
      const outline = id => node(id).evaluate(el => { const s = getComputedStyle(el); return `${s.outlineStyle} ${s.outlineWidth} ${s.outlineColor}`; });
      await page.keyboard.press('Tab');
      assert.equal(await focused(), 'state');
      const selectedFocused = await outline('state');
      await press('ArrowDown', 'url');
      const selectedOnly = await outline('state');
      assert.notEqual(selectedFocused, selectedOnly, `${framework}: forced colors show focus on the selected node (${selectedFocused} vs ${selectedOnly})`);
      assert.equal(selectedFocused, await outline('url'), 'focus looks the same on selected and unselected nodes');
      await node('url-test').hover();
      assert(!(await outline('url-test')).startsWith('none'), `${framework}: forced colors outline the hovered node`);
      assert.equal(await outline('url'), selectedFocused, 'focus wins over hover elsewhere');
      await node('url').hover();
      assert.equal(await outline('url'), selectedFocused, 'focus wins over hover on the same node');
      await page.emulateMedia({ forcedColors: 'none' });

      await story('partly-collapsed');
      assert.deepEqual(await ids(), ['lib', 'state', 'url', 'url-test', 'composables', 'pages']);
      assert.equal(await node('composables').getAttribute('aria-expanded'), 'false');

      await story('without-icon');
      assert.equal(await tree.locator('svg').count(), 3, 'only the chevrons');
      assert.equal(await page.locator('#storybook-root').getByText('ファイル · 5').count(), 0, 'no heading without the prop');

      // 無効の節: 選択と開閉をしない。フォーカスは置ける。
      await story('disabled');
      assert.equal(await node('off').getAttribute('aria-disabled'), 'true');
      await node('off').click({ force: true });
      assert.equal(await node('off').getAttribute('aria-selected'), null);
      assert.equal(await output.innerText(), 'state', 'a disabled leaf is not selected');
      await node('locked').click({ force: true });
      assert.equal(await node('locked').getAttribute('aria-expanded'), 'false', 'a disabled branch does not open');
      await page.keyboard.press('ArrowRight');
      assert.equal(await node('locked').getAttribute('aria-expanded'), 'false');
      await press('ArrowUp', 'off');
      await page.keyboard.press('Enter');
      assert.equal(await output.innerText(), 'state');
      await press('ArrowUp', 'leaf');
      await page.keyboard.press(' ');
      assert.equal(await output.innerText(), 'leaf');
      await a11y('#storybook-root');

      // 後から届いた節も開いて出す。閉じた節は閉じたまま。
      await story('late-nodes');
      assert.deepEqual(await ids(), ['lib', 'state', 'url', 'url-test']);
      await node('lib').click();
      await page.locator('#storybook-root').getByRole('button', { name: '残りを読み込む' }).click();
      assert.deepEqual(await ids(), ['lib', 'composables', 'use-url', 'pages', 'page'], 'late branches open; the closed one stays closed');
      assert.equal(await node('lib').getAttribute('aria-expanded'), 'false');
      // フォーカス中の節が外から消えたら、残った節へフォーカスを移す（祖先も消えたら Tab の止まる先）。
      await node('page').click();
      await page.locator('#storybook-root').getByRole('button', { name: '最初の節だけにする' }).evaluate(el => el.click());
      await page.waitForFunction(() => document.querySelectorAll('#storybook-root [role="treeitem"]').length === 1);
      assert.equal(await focused(), 'lib', `${framework}: focus falls back to the tab stop when the node and its ancestors are gone`);

      // 開閉を外から持つ。
      await story('controlled-expansion');
      assert.deepEqual(await ids(), ['lib', 'composables', 'use-url', 'pages']);
      await node('lib').click();
      assert.equal(await output.innerText(), 'composables,lib');
      assert.equal(await node('lib').getAttribute('aria-expanded'), 'true');
      // 外から閉じてフォーカス中の節が隠れたら、見えている最も近い祖先へフォーカスを移し、キー操作を続けられる。
      await node('use-url').click();
      const collapseAll = page.locator('#storybook-root').getByRole('button', { name: 'すべて閉じる' });
      await collapseAll.evaluate(el => el.click());
      await page.waitForFunction(() => document.querySelectorAll('#storybook-root [role="treeitem"]').length === 3);
      assert.equal(await focused(), 'composables', `${framework}: focus moves to the nearest visible ancestor`);
      await press('ArrowDown', 'pages');
      // フォーカスが木の外にあれば奪わない。
      await node('lib').click();
      await node('state').click();
      await collapseAll.click();
      await page.waitForFunction(() => document.querySelectorAll('#storybook-root [role="treeitem"]').length === 3);
      assert.equal(await page.evaluate(() => document.activeElement?.textContent), 'すべて閉じる', 'focus outside the tree is left alone');
      assert.deepEqual(errors, []);
      console.log(`${framework}: roles and aria, keyboard, click to toggle and select, badges, indentation, highlight, disabled, controlled expansion and axe passed.`);

      await page.goto(`${docsBase}/components/tree/`);
      await page.waitForFunction(() => !document.querySelector('astro-island[ssr]'));
      await page.getByRole('tab', { name: framework === 'vue' ? 'Vue' : 'React', exact: true }).click();
      const preview = page.locator('[role="tabpanel"]:visible .component-preview');
      await preview.getByRole('treeitem', { name: /list-url\.ts/ }).click();
      assert.equal(await preview.getByRole('status').innerText(), '選択中: lib/url');
      await preview.getByRole('treeitem', { name: /src\/lib/ }).press('ArrowLeft');
      assert.equal(await preview.getByRole('treeitem', { name: /src\/lib/ }).getAttribute('aria-expanded'), 'false');
      await a11y('[role="tabpanel"]:not([hidden]) .component-preview');
      assert.deepEqual(errors, [], 'docs hydrate and operate without errors or warnings');
      console.log(`${framework}: docs hydration, selection and keyboard passed.`);
      await page.close();
    }

    const ssr = await browser.newPage({ javaScriptEnabled: false });
    await ssr.goto(`${docsBase}/components/tree/`);
    const islands = ssr.locator('.component-preview astro-island');
    assert.equal(await islands.count(), 2);
    for (const island of await islands.all()) {
      assert.equal(await island.locator('[role="tree"][aria-label="ファイル"]').count(), 1);
      assert.equal(await island.locator('[role="treeitem"]').count(), 5, 'both frameworks render the open tree in initial HTML');
      assert.equal(await island.locator('[role="treeitem"][aria-selected="true"]').getAttribute('data-tree-id'), 'lib/state');
      assert.equal(await island.locator('[role="treeitem"][tabindex="0"]').count(), 1);
      assert.equal(await island.locator('[role="treeitem"]:not([aria-expanded])').count(), 3, 'leaves have no aria-expanded');
      assert.equal(await island.locator('[data-tone="danger"]').count(), 2);
    }
    await ssr.close();
    console.log('Vue/React initial HTML passed with JavaScript disabled.');
  } finally {
    await browser?.close();
    for (const server of servers) server.kill();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
