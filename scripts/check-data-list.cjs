// Build Storybook first. Browser setup is documented in README.
const assert = require('node:assert/strict');
const { spawn, execFileSync } = require('node:child_process');
const { join, resolve } = require('node:path');
const { mkdtempSync, rmSync, readdirSync, readFileSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = resolve(__dirname, '..');
const port = process.env.DATA_LIST_TEST_PORT || '6284';
const base = `http://127.0.0.1:${port}`;
const server = spawn('python3', ['-m', 'http.server', port, '--bind', '127.0.0.1', '--directory', root], { stdio: 'ignore' });

// 並び順の遷移はブラウザーなしで確かめる。
const compiled = mkdtempSync(join(tmpdir(), 'koyori-data-list-'));
let sorting;
try {
  execFileSync(process.execPath, [require.resolve('typescript/bin/tsc'), '--ignoreConfig',
    '--module', 'commonjs', '--target', 'ES2022', '--skipLibCheck', '--outDir', compiled,
    resolve(root, 'components/DataList/data-list.ts')], { stdio: 'inherit' });
  sorting = require(join(compiled, 'data-list.js'));
} finally {
  rmSync(compiled, { recursive: true, force: true });
}
const { nextSort, ariaSort } = sorting;
const ascending = { columnId: 'title', direction: 'ascending' };
const descending = { columnId: 'title', direction: 'descending' };

assert.deepEqual(nextSort(null, 'title'), ascending, '並べ替えなしからは昇順');
assert.deepEqual(nextSort(undefined, 'title'), ascending, '未指定からも昇順');
assert.deepEqual(nextSort(ascending, 'title'), descending, '同じ列の 2 回目は降順');
assert.equal(nextSort(descending, 'title'), null, '同じ列の 3 回目で解除');
assert.deepEqual(nextSort(descending, 'owner'), { columnId: 'owner', direction: 'ascending' }, '別の列は昇順から');
assert.deepEqual(nextSort(ascending, 'owner'), { columnId: 'owner', direction: 'ascending' }, '別の列は向きを引き継がない');

assert.equal(ariaSort({ id: 'title' }, ascending), undefined, '並べ替えできない列には付けない');
assert.equal(ariaSort({ id: 'title', sortable: false }, ascending), undefined, '明示的な false も付けない');
assert.equal(ariaSort({ id: 'title', sortable: true }, null), 'none', '対象でなければ none');
assert.equal(ariaSort({ id: 'owner', sortable: true }, ascending), 'none', '別の列が対象なら none');
assert.equal(ariaSort({ id: 'title', sortable: true }, ascending), 'ascending');
assert.equal(ariaSort({ id: 'title', sortable: true }, descending), 'descending');

for (const [name, path] of [['Vue', 'packages/vue/src/generated/components/DataList/DataList.vue'], ['React', 'packages/react/src/generated/components/DataList/DataList.tsx']]) {
  const source = readFileSync(resolve(root, path), 'utf8');
  assert.match(source, /aria-sort/, `${name} 版が並び順を読み上げ属性で伝える`);
  assert.match(source, /ariaSort/, `${name} 版も同じ判定を通す`);
  assert.match(source, /nextSort/, `${name} 版も同じ遷移を通す`);
}
console.log('DataList の並び順の遷移と読み上げ属性、生成物を確認しました。');

let browser;
(async () => {
  try {
    browser = await chromium.launch({ headless: true });
    const axe = readdirSync(`${root}/node_modules/.pnpm`).find(name => name.startsWith('axe-core@'));
    const axeSource = readFileSync(`${root}/node_modules/.pnpm/${axe}/node_modules/axe-core/axe.min.js`, 'utf8');
    for (const framework of ['react', 'vue']) {
      const page = await browser.newPage({ viewport: { width: 900, height: 760 } });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
      const story = async name => {
        await page.goto(`${base}/packages/${framework}/storybook-static/iframe.html?id=components-datalist--${name}&viewMode=story`);
        await page.locator('#list-default-heading').waitFor();
      };
      const accessibility = async () => {
        // Keep our instance separate from the Storybook addon's window.axe.
        await page.addScriptTag({ content: axeSource + '\nwindow.dataListAxe = window.axe;' });
        const violations = await page.evaluate(async () => (await dataListAxe.run(document.querySelector('#storybook-root'))).violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => ({target:n.target, summary:n.failureSummary})) })));
        assert.deepEqual(violations, []);
      };
      const table = page.getByRole('table', { name: '進行中', exact: true });
      const trigger = page.locator('#list-default-heading button');
      await story('default');
      assert.equal(await table.locator('th[scope="col"]').count(), 4);
      assert.equal(await table.locator('th[scope="row"]').count(), 2);
      const rows = table.locator('tr[data-list-row]');
      assert.equal(await rows.first().getAttribute('role'), null);
      assert.equal(await rows.first().getAttribute('tabindex'), null);
      const beforeHover = await rows.first().boundingBox();
      assert(beforeHover.height <= 44, `compact row height: ${beforeHover.height}px`);
      await rows.first().hover();
      assert.deepEqual(await rows.first().boundingBox(), beforeHover, 'hover keeps row geometry');
      assert.equal(await rows.first().evaluate(el => getComputedStyle(el).transitionDuration), '0s');
      assert.equal(await table.locator('..').locator(':scope > [data-hover-highlight]').count(), 0);
      const firstCheckbox = table.getByRole('checkbox', { name: '「設計を確認」を選択', exact: true });
      const secondCheckbox = table.getByRole('checkbox', { name: '「画面を実装」を選択', exact: true });
      assert.equal(await table.getByRole('checkbox').count(), 2);
      await firstCheckbox.focus();
      await page.keyboard.press('Space');
      assert(await firstCheckbox.isChecked());
      assert.equal(await rows.first().getAttribute('data-selected'), 'true');
      assert.deepEqual(await rows.first().boundingBox(), beforeHover, 'checkbox selection preserves row size');
      await secondCheckbox.check();
      assert.equal(await table.locator('tr[data-selected=true]').count(), 2, 'rows can be selected together');
      await firstCheckbox.uncheck();
      assert.equal(await rows.first().getAttribute('data-selected'), null);
      assert(await secondCheckbox.isChecked(), 'clearing one row preserves other selections');
      await secondCheckbox.uncheck();
      assert.equal(await table.locator('tr[data-selected=true]').count(), 0);
      assert.match(await page.locator('#storybook-root > div > p').innerText(), /選択: なし/);
      await firstCheckbox.check();
      const selectedBackground = await rows.first().evaluate(el => getComputedStyle(el).backgroundColor);
      await rows.first().hover();
      assert.equal(await rows.first().evaluate(el => getComputedStyle(el).backgroundColor), selectedBackground);

      // Both existing menu components must work past the list's scroll viewport.
      for (const [name, role, label] of [['画面を実装の担当者', 'option', 'sousuke'], ['2件目の操作', 'menuitem', 'アーカイブ']]) {
        await table.getByRole('button', { name: new RegExp(`^${name}`) }).click();
        const item = page.getByRole(role, { name: label, exact: true });
        await item.waitFor();
        const box = await item.boundingBox();
        const viewport = await table.locator('..').boundingBox();
        assert(box.y + box.height > viewport.y + viewport.height, 'menu extends below the list');
        assert(await item.evaluate(el => {
          const box = el.getBoundingClientRect();
          return el.contains(document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2));
        }), 'menu outside the list receives pointer input');
        if (role === 'option') assert.equal(await item.locator('[role=img]').count(), 1, 'option has an avatar beside its name');
        await item.click();
        assert.equal(await rows.first().getAttribute('data-selected'), 'true', 'cell actions do not change row selection');
        assert(await firstCheckbox.isChecked());
        assert.equal(await secondCheckbox.isChecked(), false);
        if (role === 'option') {
          const assigneeTrigger = table.getByRole('button', { name: /^画面を実装の担当者/ });
          assert.equal(await assigneeTrigger.getByRole('img').count(), 2, 'selected people update the AvatarGroup');
          assert.equal(await item.getAttribute('aria-selected'), 'true');
          await page.getByRole('option', { name: 'yupix', exact: true }).click();
          await item.click();
          assert.equal(await assigneeTrigger.getByRole('img').count(), 0);
          assert.match(await assigneeTrigger.innerText(), /未割り当て/);
          assert.equal(await rows.first().getByRole('img').count(), 1, 'each row keeps its own assignees');
          await item.click();
          await page.getByRole('option', { name: 'yupix', exact: true }).click();
          await page.keyboard.press('Escape');
          assert(await table.getByRole('button', { name: new RegExp(`^${name}`) }).evaluate(el => el === document.activeElement));
        } else assert.match(await page.locator('#storybook-root > div > p').innerText(), /archive/);
        assert.equal(await page.locator(':popover-open').count(), 0);
      }
      await table.getByRole('button', { name: /^画面を実装の担当者/ }).click();
      await trigger.evaluate(el => el.click());
      await page.waitForTimeout(100);
      assert.equal(await trigger.getAttribute('aria-expanded'), 'false');
      assert.equal(await page.locator(':popover-open').count(), 0, 'collapse closes top-layer menus');
      assert(await trigger.evaluate(el => el === document.activeElement));
      assert.equal(await table.count(), 0);
      await trigger.press('Enter');
      assert.equal(await table.count(), 1);
      assert(await firstCheckbox.isChecked(), 'collapse preserves checkbox selection');
      assert.equal(await rows.first().getAttribute('data-selected'), 'true');
      await accessibility();
      await page.screenshot({ path: `/tmp/koyori-data-list-${framework}.png` });

      await story('collapsed');
      assert.equal(await trigger.getAttribute('aria-expanded'), 'false');
      assert.equal(await table.count(), 0);
      await page.locator('#storybook-root').evaluate(el => el.insertAdjacentHTML('beforeend', '<button id="after-list">次へ</button>'));
      await trigger.focus(); await page.keyboard.press('Tab');
      assert(await page.locator('#after-list').evaluate(el => el === document.activeElement), 'closed rows are skipped by Tab');
      await story('plain');
      assert.equal(await trigger.count(), 0);
      assert.equal(await table.count(), 1);

      await story('controlled');
      const draftCheckbox = page.getByRole('checkbox', { name: '下書きを選択' });
      await draftCheckbox.check();
      const input = page.getByRole('textbox', { name: '下書き' });
      await input.fill('書きかけを保持');
      await input.evaluate(el => { el.dataset.probe = 'retained'; });
      await page.getByRole('button', { name: '外側から閉じる' }).evaluate(el => el.click());
      await page.waitForTimeout(80);
      assert(await trigger.evaluate(el => el === document.activeElement), 'external collapse restores focus');
      assert.equal(await page.locator('output').innerText(), '閉じています');
      await trigger.click();
      assert.equal(await input.inputValue(), '書きかけを保持');
      assert(await draftCheckbox.isChecked());
      assert.equal(await rows.first().getAttribute('data-selected'), 'true');
      assert.equal(await input.getAttribute('data-probe'), 'retained', 'collapse keeps the same DOM nodes');
      await accessibility();

      for (const [name, message, rowCount] of [['empty', '項目がありません', 0], ['loading', '読み込み中…', 0], ['loading-more', '読み込み中…', 2], ['error', '一覧を取得できませんでした', 0], ['no-columns', '項目がありません', 0]]) {
        await story(name);
        assert(await table.getByText(message, { exact: true }).isVisible());
        assert.equal(await rows.count(), rowCount);
        assert.equal(await table.locator('td[colspan]').getAttribute('colspan'), name === 'no-columns' ? '1' : '4');
        if (name === 'empty') assert.match(await page.locator('#list-default-heading').innerText(), /0/);
        if (name.startsWith('loading')) assert.equal(await table.locator('tbody').first().getAttribute('aria-busy'), 'true');
        await accessibility();
      }
      await story('retry');
      await page.getByRole('button', { name: '再試行', exact: true }).click();
      assert(await table.getByText('読み込み中…').isVisible());
      assert.equal(await page.getByRole('button', { name: '再試行', exact: true }).count(), 0, 'loading removes repeat submission');
      await story('groups');
      await trigger.click();
      assert.equal(await page.getByRole('table', { name: '完了', exact: true }).count(), 1);

      await page.setViewportSize({ width: 320, height: 760 });
      await story('narrow');
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      const scroll = table.locator('..');
      assert(await scroll.evaluate(el => el.scrollWidth > el.clientWidth));
      await scroll.focus(); await page.keyboard.press('ArrowRight');
      await page.waitForTimeout(150);
      assert(await scroll.evaluate(el => el.scrollLeft > 0));
      await table.getByRole('button', { name: /^画面を実装の担当者/ }).click();
      const option = page.getByRole('option', { name: 'sousuke', exact: true });
      const box = await option.boundingBox();
      assert(box.x >= 0 && box.x + box.width <= 320, 'popup stays within the viewport');
      await option.click(); await page.keyboard.press('Escape');
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await rows.last().hover();
      assert.equal(await rows.last().evaluate(el => getComputedStyle(el).transitionDuration), '0s');
      await accessibility();
      await page.screenshot({ path: `/tmp/koyori-data-list-narrow-${framework}.png` });
      await page.emulateMedia({ reducedMotion: 'no-preference' });
      await page.setViewportSize({ width: 900, height: 760 });

      // 並べ替え。DataList は行を並べ替えず、状態の遷移と読み上げ属性だけを担う。
      const sortStory = async name => {
        await page.goto(`${base}/packages/${framework}/storybook-static/iframe.html?id=components-datalist--${name}&viewMode=story`);
        await page.getByRole('columnheader', { name: 'タイトル' }).first().waitFor();
      };
      const headerSort = name => page.getByRole('columnheader', { name }).first().getAttribute('aria-sort');
      const titles = () => page.getByRole('rowheader').allInnerTexts();

      await sortStory('sortable');
      assert.equal(await headerSort('タイトル'), 'ascending');
      assert.equal(await headerSort('担当者'), 'none', '並べ替えできる列は none で伝える');
      assert.equal(await headerSort('更新日'), null, '並べ替えできない列には付けない');
      const ascendingTitles = await titles();
      assert.deepEqual(ascendingTitles, ['レビューを受ける', '画面を実装', '設計を確認'], '昇順は利用側の並べ替えに従う');
      const titleButton = page.getByRole('columnheader', { name: 'タイトル' }).first().getByRole('button');
      await titleButton.click();
      assert.equal(await headerSort('タイトル'), 'descending', '2 回目は降順');
      assert.deepEqual(await titles(), [...ascendingTitles].reverse(), '降順は昇順の逆');
      await titleButton.click();
      assert.equal(await headerSort('タイトル'), 'none', '3 回目で解除');
      await titleButton.press('Enter');
      assert.equal(await headerSort('タイトル'), 'ascending', 'Enter でも進む');
      await titleButton.press('Space');
      assert.equal(await headerSort('タイトル'), 'descending', 'Space でも進む');
      await page.getByRole('columnheader', { name: '担当者' }).first().getByRole('button').click();
      assert.deepEqual([await headerSort('タイトル'), await headerSort('担当者')], ['none', 'ascending'], '別の列は昇順から始まる');
      await accessibility();

      // 同じ columns と sort を渡したグループは表示がそろう。
      await sortStory('two-groups');
      await page.getByRole('columnheader', { name: 'タイトル' }).first().getByRole('button').click();
      const headers = page.getByRole('columnheader', { name: 'タイトル' });
      assert.equal(await headers.count(), 2);
      assert.deepEqual(await headers.evaluateAll(cells => cells.map(cell => cell.getAttribute('aria-sort'))), ['ascending', 'ascending']);
      await accessibility();

      await page.emulateMedia({ reducedMotion: 'reduce' });
      await sortStory('sortable');
      assert.equal(await page.getByRole('columnheader', { name: 'タイトル' }).first().locator('span[aria-hidden="true"]').evaluate(el => getComputedStyle(el).transitionDuration), '0s');
      await page.emulateMedia({ reducedMotion: 'no-preference' });

      assert.deepEqual(errors, []);
      await page.close();
      console.log(`${framework}: DataList structure, checkbox multi-selection, collapse/focus/retention, status/retry, avatar assignees, compact rows, menus, scrolling, sorting, motion and axe passed`);
    }
  } finally {
    await browser?.close();
    server.kill();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
