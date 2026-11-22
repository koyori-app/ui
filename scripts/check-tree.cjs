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
      // いまの節。フォーカスが行にあっても（roving tabindex）、入れ物にあって aria-activedescendant で指していても同じに読む。
      const active = () => page.evaluate(() => {
        const el = document.activeElement;
        if (el?.getAttribute('role') === 'treeitem') return el.getAttribute('data-tree-id');
        if (el?.getAttribute('role') === 'tree') return document.getElementById(el.getAttribute('aria-activedescendant') || '')?.getAttribute('data-tree-id') ?? null;
        return null;
      });
      const inTree = () => page.evaluate(() => !!document.activeElement?.closest('[role="tree"]'));
      // Tab で止まる場所の数（入れ物と行を合わせて）。
      const tabStops = () => tree.evaluate(t => [t, ...t.querySelectorAll('*')].filter(el => el.getAttribute('tabindex') === '0').length);
      const output = page.locator('#storybook-root output');
      const press = async (key, expected) => {
        await page.keyboard.press(key);
        assert.equal(await active(), expected, `${framework}: ${key} moves focus to ${expected}`);
      };
      const frame = () => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      // 更新のボタンはフォーカスを動かさずに押す。
      const push = async name => {
        await page.locator('#storybook-root').getByRole('button', { name, exact: true }).evaluate(el => el.click());
        await frame();
      };
      // スクロールは整数 px に丸まるので、行の端が 1px 未満はみ出すのは見えているとみなす。
      const inView = id => node(id).evaluate(el => { const r = el.getBoundingClientRect(); return r.top > -1 && r.bottom < innerHeight + 1; });
      // ホバーの面が出ていて、その行の位置にあるか。
      const highlightOn = id => page.waitForFunction(id => {
        const list = document.querySelector('#storybook-root [role="tree"]');
        const row = list.querySelector(`[data-tree-id="${id}"]`);
        const style = getComputedStyle(list);
        return style.getPropertyValue('--highlight-opacity').trim() === '1'
          && Math.abs(parseFloat(style.getPropertyValue('--highlight-y')) - (row.getBoundingClientRect().top - list.getBoundingClientRect().top)) < 1;
      }, id, { timeout: 2000 });
      // 外からの更新の検査は 1 件ずつ結果を集め、最後にまとめて落とす（どの更新で落ちるかを全部見るため）。
      const failures = [];
      const scenario = async (name, run) => {
        try { await run(); } catch (error) { failures.push(`${framework} ${name}: ${error.message.split('\n')[0]}`); }
      };

      // 木にフォーカスがある間の外からの更新（T1〜T5・T7〜T10）。いまの節はキーで置く（クリックは選択と開閉をするため）。
      // 見える順は src, lib, a, b, c。選択は無いので、最初の Tab は先頭の src に入る。
      await scenario('T1 reorder moves the active row', async () => {
        await story('external-updates');
        await page.keyboard.press('Tab');
        for (let i = 0; i < 3; i++) await page.keyboard.press('ArrowDown');
        assert.equal(await active(), 'b');
        await highlightOn('b');
        await push('並びを回す');
        assert.deepEqual(await ids(), ['b', 'c', 'src', 'lib', 'a']);
        assert.equal(await active(), 'b', 'the active node stays');
        assert.equal(await inTree(), true, 'focus stays in the tree');
        assert.equal(await tabStops(), 1, 'T10: one tab stop');
        // id が同じで位置だけ変わっても、面はいまの行へ付いていく。
        await highlightOn('b');
        await press('ArrowDown', 'c');
      });
      await scenario('T2 reorder moves other rows', async () => {
        await story('external-updates');
        await page.keyboard.press('Tab');
        assert.equal(await active(), 'src');
        await push('並びを回す');
        assert.equal(await active(), 'src');
        assert.equal(await inTree(), true);
        await press('ArrowDown', 'lib');
      });
      await scenario('T3 closing the new parent after a move', async () => {
        await story('external-updates');
        await page.keyboard.press('Tab');
        await page.keyboard.press('ArrowDown');
        await page.keyboard.press('ArrowDown');
        assert.equal(await active(), 'a');
        await push('a を lib の下へ移す');
        assert.equal(await node('a').getAttribute('aria-level'), '3');
        assert.equal(await tabStops(), 1, 'T10: one tab stop');
        await push('lib を閉じる');
        assert.equal(await active(), 'lib', 'the current parent, not the parent at focus time');
        assert.equal(await inTree(), true);
      });
      await scenario('T4 emptying and refilling the tree', async () => {
        await story('external-updates');
        await page.keyboard.press('Tab');
        await page.keyboard.press('ArrowDown');
        await page.keyboard.press('ArrowDown');
        await push('空にする');
        assert.equal(await items.count(), 0);
        assert.equal(await inTree(), true, 'focus stays on the empty tree');
        assert.equal(await tabStops(), 0, 'T10: no tab stop without rows');
        await push('元に戻す');
        assert.equal(await tabStops(), 1, 'T10: one tab stop again');
        assert.equal(await active(), 'src');
        // キーを挟まずに並べ替えても、戻ったときのいまの節（src）のまま。先頭（b）へ動かない。
        await push('並びを回す');
        assert.equal(await active(), 'src', 'the active node is taken back after refilling');
        await highlightOn('src');
        await press('ArrowDown', 'lib');
      });
      await scenario('T5 focus outside is left alone', async () => {
        await story('external-updates');
        await page.keyboard.press('Tab');
        await page.keyboard.press('ArrowDown');
        await page.keyboard.press('ArrowDown');
        await page.mouse.click(790, 690);
        assert.equal(await page.evaluate(() => document.activeElement === document.body), true);
        await push('空にする');
        await push('元に戻す');
        assert.equal(await page.evaluate(() => document.activeElement === document.body), true, 'the tree does not take focus');
      });
      await scenario('T7 End scrolls the last row into view', async () => {
        await page.setViewportSize({ width: 800, height: 120 });
        await story('default');
        await page.keyboard.press('Tab');
        await press('End', 'page');
        await page.waitForFunction(() => { const r = document.querySelector('#storybook-root [data-tree-id="page"]').getBoundingClientRect(); return r.top > -1 && r.bottom < innerHeight + 1; }, null, { timeout: 2000 });
        assert.equal(await inView('page'), true);
      });
      await page.setViewportSize({ width: 800, height: 700 });
      await scenario('T8 an external collapse reveals and highlights the new active row', async () => {
        await page.setViewportSize({ width: 800, height: 120 });
        await story('controlled-expansion');
        await page.keyboard.press('Tab');
        await page.keyboard.press('Tab');
        assert.equal(await active(), 'lib');
        await press('ArrowDown', 'composables');
        await press('ArrowDown', 'use-url');
        await push('すべて閉じる');
        assert.equal(await active(), 'composables');
        await page.waitForFunction(() => {
          const list = document.querySelector('#storybook-root [role="tree"]');
          const row = list.querySelector('[data-tree-id="composables"]');
          const offset = row.getBoundingClientRect().top - list.getBoundingClientRect().top;
          const style = getComputedStyle(list);
          const r = row.getBoundingClientRect();
          return style.getPropertyValue('--highlight-opacity').trim() === '1'
            && Math.abs(parseFloat(style.getPropertyValue('--highlight-y')) - offset) < 1
            && r.top > -1 && r.bottom < innerHeight + 1;
        }, null, { timeout: 2000 });
      });
      await page.setViewportSize({ width: 800, height: 700 });
      await scenario('T9 keys after a click show the focus outline', async () => {
        await story('default');
        await node('url').click();
        await press('ArrowDown', 'url-test');
        assert.notEqual(await node('url-test').evaluate(el => getComputedStyle(el).outlineStyle), 'none');
      });
      await scenario('T11 a pending reveal does not bring the highlight back after leaving', async () => {
        await story('default');
        await page.keyboard.press('Tab');
        await frame();
        // キーで寄せる処理を積んだ同じタスクの中で木を出る（素早い Tab と同じ順）。
        await page.evaluate(() => {
          const list = document.querySelector('#storybook-root [role="tree"]');
          const outside = document.createElement('button');
          outside.textContent = '木の外';
          document.body.append(outside);
          list.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
          outside.focus();
        });
        await frame();
        assert.equal(await tree.evaluate(el => getComputedStyle(el).getPropertyValue('--highlight-opacity').trim()), '0');
      });
      if (failures.length) console.error(failures.join('\n'));

      // role と aria。見えている節を 1 段に並べ、深さと兄弟の中の位置を属性で伝える。
      await story('default');
      assert.equal(await tree.getAttribute('aria-label'), 'ファイル');
      assert.equal(await page.locator('#storybook-root').getByText('ファイル · 5', { exact: true }).count(), 1, 'heading');
      assert.equal(await tree.locator('[role="group"]').count(), 0, 'flat rows, no nested groups');
      assert.deepEqual(await ids(), ['lib', 'state', 'url', 'url-test', 'composables', 'use-url', 'pages', 'page'], 'all branches start open');
      const attrs = id => node(id).evaluate(el => ['aria-level', 'aria-setsize', 'aria-posinset', 'aria-expanded', 'aria-selected']
        .map(name => el.getAttribute(name)));
      assert.deepEqual(await attrs('lib'), ['1', '3', '1', 'true', null]);
      assert.deepEqual(await attrs('state'), ['2', '3', '1', null, 'true'], 'leaves have no aria-expanded');
      assert.deepEqual(await attrs('url-test'), ['2', '3', '3', null, 'false'], 'a selectable leaf that is not selected has aria-selected="false" (APG)');
      assert.deepEqual(await attrs('pages'), ['1', '3', '3', 'true', null]);
      assert.equal(await tabStops(), 1, 'one tab stop');
      // フォーカスは入れ物に置き、いまの節（選択中の節）を aria-activedescendant で指す。行はフォーカスを受けない。
      assert.equal(await tree.getAttribute('tabindex'), '0');
      assert.equal(await items.evaluateAll(els => els.filter(el => el.hasAttribute('tabindex')).length), 0, 'rows take no focus');
      assert.equal(await tree.getAttribute('aria-activedescendant'), await node('state').getAttribute('id'), 'the selection is the active node');
      assert.deepEqual(await items.evaluateAll(els => els.filter(el => el.dataset.active === 'true').map(el => el.dataset.treeId)), ['state']);
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
      assert.equal(await active(), 'state', 'Tab enters at the selected node');
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
      assert.equal(await active(), 'lib');
      await press('ArrowRight', 'state');
      await press('End', 'page');
      await press('ArrowDown', 'page');
      await press('Home', 'lib');
      await press('ArrowUp', 'lib');
      assert.equal(await items.evaluateAll(els => els.filter(el => el.dataset.active === 'true').map(el => el.dataset.treeId).join()), 'lib', 'the active row follows the keys');
      assert.equal(await tabStops(), 1);
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
      assert.equal(await active(), null, 'Tab leaves the tree');
      assert.equal(await tree.evaluate(el => getComputedStyle(el).getPropertyValue('--highlight-opacity').trim()), '0', 'the focus highlight leaves with the focus');
      // 木に入り直すと、最後にフォーカスした節ではなく選択中の節へ入る（APG）。選択が隠れていれば先頭。
      await page.keyboard.press('Shift+Tab');
      assert.equal(await active(), 'lib', 'Shift+Tab re-enters at the first node when the selection is hidden');
      await press('ArrowDown', 'state');
      await page.keyboard.press('Enter');
      await press('ArrowDown', 'url');
      await page.keyboard.press('Tab');
      assert.equal(await active(), null);
      await page.keyboard.press('Shift+Tab');
      assert.equal(await active(), 'state', 'Shift+Tab re-enters at the selection, not at the last focused node');
      await page.keyboard.press('Tab');

      // クリック: 子を持つ節は開閉、葉は選択。
      await node('composables').click();
      assert.equal(await node('composables').getAttribute('aria-expanded'), 'false');
      assert.equal(await node('use-url').count(), 0);
      await node('composables').click();
      assert.equal(await node('composables').getAttribute('aria-expanded'), 'true');
      await node('url').click();
      assert.equal(await output.innerText(), 'url');
      assert.equal(await active(), 'url', 'the clicked node takes focus');
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
      assert.equal(await active(), 'state');
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
      // フォーカス中の葉だけが nodes から消え、親は残るなら、親へフォーカスを移す（Tab の止まる先の lib ではなく）。
      await node('page').click();
      await page.locator('#storybook-root').getByRole('button', { name: '+Page.vue を消す' }).evaluate(el => el.click());
      await page.waitForFunction(() => document.querySelectorAll('#storybook-root [role="treeitem"]').length === 4);
      assert.equal(await active(), 'pages', `${framework}: focus moves to the remaining parent of a removed leaf`);
      await page.locator('#storybook-root').getByRole('button', { name: '残りを読み込む' }).evaluate(el => el.click());
      await page.waitForFunction(() => document.querySelectorAll('#storybook-root [role="treeitem"]').length === 5);
      // T6: 消えた節が同じ id で戻っても、いまの節は戻らない。
      await frame();
      assert.equal(await active(), 'pages', `${framework}: the active node does not jump back to a returning node`);
      // フォーカス中の節が外から消えたら、残った節へフォーカスを移す（祖先も消えたら Tab の止まる先）。
      await node('page').click();
      await page.locator('#storybook-root').getByRole('button', { name: '最初の節だけにする' }).evaluate(el => el.click());
      await page.waitForFunction(() => document.querySelectorAll('#storybook-root [role="treeitem"]').length === 1);
      assert.equal(await active(), 'lib', `${framework}: focus falls back to the tab stop when the node and its ancestors are gone`);

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
      assert.equal(await active(), 'composables', `${framework}: focus moves to the nearest visible ancestor`);
      await press('ArrowDown', 'pages');
      // フォーカスが木の外にあれば奪わない。
      await node('lib').click();
      await node('state').click();
      await collapseAll.click();
      await page.waitForFunction(() => document.querySelectorAll('#storybook-root [role="treeitem"]').length === 3);
      assert.equal(await page.evaluate(() => document.activeElement?.textContent), 'すべて閉じる', 'focus outside the tree is left alone');
      // 閉じるのと同じ処理の中でフォーカスが外へ移る（blur の後始末より先に描画が終わる）ときも奪わない。
      await node('lib').click();
      await node('state').click();
      await collapseAll.evaluate(el => { el.click(); el.focus(); });
      await page.waitForFunction(() => document.querySelectorAll('#storybook-root [role="treeitem"]').length === 3);
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      assert.equal(await page.evaluate(() => document.activeElement?.textContent), 'すべて閉じる', `${framework}: focus moved outside in the same task is left alone`);
      assert.deepEqual(failures, [], 'external updates while the tree has focus');
      assert.deepEqual(errors, []);
      console.log(`${framework}: roles and aria, keyboard, click to toggle and select, badges, indentation, highlight, disabled, controlled expansion, external updates while focused and axe passed.`);

      await page.goto(`${docsBase}/components/tree/`);
      await page.waitForFunction(() => !document.querySelector('astro-island[ssr]'));
      await page.getByRole('tab', { name: framework === 'vue' ? 'Vue' : 'React', exact: true }).click();
      const preview = page.locator('[role="tabpanel"]:visible .component-preview');
      await preview.getByRole('treeitem', { name: /list-url\.ts/ }).click();
      assert.equal(await preview.getByRole('status').innerText(), '選択中: lib/url');
      // 行はフォーカスを受けないので、キーは入れ物へ送る。← で親へ移り、もう一度 ← で閉じる。
      await page.keyboard.press('ArrowLeft');
      await page.keyboard.press('ArrowLeft');
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
      assert.equal(await island.locator('[role="tree"][tabindex="0"]').count(), 1, 'the tree is the tab stop');
      assert.equal(await island.locator('[role="treeitem"][tabindex]').count(), 0, 'rows take no focus');
      assert.equal(await island.locator('[role="treeitem"][data-active="true"]').getAttribute('data-tree-id'), 'lib/state', 'the selection is the active node');
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
