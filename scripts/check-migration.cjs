// After pnpm build:docs. Tests the actual prerendered Astro pages and both frameworks.
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { resolve } = require('node:path');
const { readdirSync } = require('node:fs');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = resolve(__dirname, '..');
const port = process.env.MIGRATION_TEST_PORT || '16318';
const base = `http://127.0.0.1:${port}`;
const server = spawn('python3', ['-m', 'http.server', port, '--bind', '127.0.0.1', '--directory', resolve(root, 'apps/docs/dist')], { stdio: 'ignore' });
let browser;
let releaseScripts;
(async () => {
  try {
    for (let i = 0; i < 40; i++) {
      try { if ((await fetch(base)).ok) break; } catch {}
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1100, height: 900 } });
    const errors = [];
    const capture = target => {
      target.on('pageerror', error => errors.push(error.message));
      target.on('console', message => { if (['error', 'warning'].includes(message.type())) errors.push(message.text()); });
    };
    capture(page);
    const gate = new Promise(resolve => { releaseScripts = resolve; });
    await page.route('**/*', async route => {
      if (route.request().resourceType() === 'script') await gate;
      await route.continue();
    });
    await page.goto(`${base}/blocks/task-properties/`, { waitUntil: 'commit' });
    await page.locator('[data-task-properties="vue"]').waitFor();
    // Wait for styles, while component scripts are still blocked.
    await page.waitForFunction(() => getComputedStyle(document.querySelector('.task-property-readonly')).minHeight === '36px');
    const initial = await page.evaluate(() => {
      const roots = [...document.querySelectorAll('[data-task-properties]')];
      window.migrationNodes = roots.map(root => [root, root.querySelector('h3'), root.querySelector('[data-selection-summary]')]);
      return roots.map(root => ({
        framework: root.dataset.taskProperties,
        heading: root.querySelector('h3').textContent,
        summary: root.querySelector('[data-selection-summary]').textContent,
        progress: root.querySelector('[role="progressbar"]').getAttribute('aria-valuenow'),
        triggers: root.querySelectorAll('button[aria-expanded]').length,
        boxes: [...root.querySelectorAll('[data-property]')].map(el => { const rect = el.getBoundingClientRect(); return [rect.width, rect.height, rect.top - root.getBoundingClientRect().top]; }),
      }));
    });
    assert.equal(initial.length, 2);
    for (const value of initial) {
      assert.equal(value.heading, '請求書を送る');
      assert.equal(value.summary, '担当者: 山田 太郎 / 状態: 進行中');
      assert.equal(value.progress, '40');
      assert.equal(value.triggers, value.framework === 'vue' ? 0 : 2, 'Vue defers only Picker; React prerenders closed Picker controls');
    }
    releaseScripts();
    await page.waitForFunction(() => [...document.querySelectorAll('[data-task-properties]')].every(root => !root.closest('astro-island').hasAttribute('ssr')));
    await page.waitForFunction(() => document.querySelectorAll('[data-task-properties="vue"] button[aria-expanded]').length === 2);
    assert(await page.evaluate(() => window.migrationNodes.every(([root, heading, summary]) => root.isConnected && root.querySelector('h3') === heading && root.querySelector('[data-selection-summary]') === summary)), 'hydration retains SSR nodes instead of replacing the snapshot');
    const hydratedBoxes = await page.locator('[data-task-properties="vue"]').evaluate(root => [...root.querySelectorAll('[data-property]')].map(el => { const rect = el.getBoundingClientRect(); return [rect.width, rect.height, rect.top - root.getBoundingClientRect().top]; }));
    initial.find(value => value.framework === 'vue').boxes.forEach((box, i) => box.forEach((value, j) => assert(Math.abs(value - hydratedBoxes[i][j]) <= 1, 'mounting Vue Picker must not shift the initial property rows')));
    const settle = () => page.waitForTimeout(100);
    const focused = async locator => { await settle(); assert(await locator.evaluate(el => el === document.activeElement), `Expected focus: ${await locator.evaluate(el => el.outerHTML)}`); };
    const axe = readdirSync(`${root}/node_modules/.pnpm`).find(name => name.startsWith('axe-core@'));
    await page.addScriptTag({ path: `${root}/node_modules/.pnpm/${axe}/node_modules/axe-core/axe.min.js` });

    for (const framework of ['vue', 'react']) {
      await page.getByRole('tab', { name: framework === 'vue' ? 'Vue' : 'React', exact: true }).click();
      const demo = page.locator(`[data-task-properties="${framework}"]`);
      const owner = demo.getByRole('button', { name: /^担当者/ });
      const status = demo.getByRole('button', { name: /^状態:/ });
      const search = demo.getByRole('searchbox', { name: '担当者を検索' });
      const list = demo.getByRole('listbox', { name: '担当者', exact: true });
      const summary = demo.locator('[data-selection-summary]');
      const state = demo.getByRole('combobox', { name: '候補取得' });
      assert.equal(await summary.innerText(), '担当者: 山田 太郎 / 状態: 進行中');
      assert.equal(await owner.getAttribute('aria-expanded'), 'false');
      await owner.focus();
      await owner.press('Enter');
      await focused(search);
      const controls = await owner.getAttribute('aria-controls');
      assert(await page.locator(`[id="${controls}"]`).isVisible());
      await search.fill('佐藤');
      await search.press('Enter');
      await focused(list);
      assert((await summary.innerText()).includes('山田 太郎、佐藤 花子'));
      await list.press('Escape');
      await focused(owner);
      await status.press('Enter');
      const statuses = demo.getByRole('listbox', { name: '状態', exact: true });
      await focused(statuses);
      assert.equal(await statuses.evaluate(el => document.getElementById(el.getAttribute('aria-activedescendant'))?.textContent.trim()), '進行中');
      await statuses.press('End');
      await statuses.press('Enter');
      await focused(status);
      assert((await summary.innerText()).endsWith('状態: 完了'));

      for (const [value, message] of [['loading', '候補を読み込み中…'], ['error', '候補を取得できませんでした。'], ['empty', '担当者に指定できる利用者がいません。']]) {
        await state.selectOption(value);
        await settle();
        assert.equal(await owner.count(), 0, 'unavailable candidates do not expose an editable Picker');
        assert(await demo.getByText(message, { exact: true }).isVisible());
        assert.equal(await summary.innerText(), '担当者: 山田 太郎、佐藤 花子 / 状態: 完了');
      }
      await state.selectOption('error');
      await demo.getByRole('button', { name: '候補を再取得' }).click();
      assert(await demo.getByText('候補を読み込み中…', { exact: true }).isVisible());
      await owner.waitFor();
      await focused(owner);
      assert.equal(await summary.innerText(), '担当者: 山田 太郎、佐藤 花子 / 状態: 完了');
      await owner.click();
      assert.equal(await list.getByRole('option', { selected: true }).count(), 2);
      await search.fill('候補にない人');
      await settle();
      assert.equal(await list.getByRole('option').count(), 0);
      assert(await demo.getByText('該当する項目がありません', { exact: true }).first().isVisible());
      await search.press('Escape');
      await demo.getByRole('checkbox', { name: '編集を許可' }).uncheck();
      assert.equal(await owner.count(), 0);
      assert.equal(await status.count(), 0);
      assert.equal(await summary.innerText(), '担当者: 山田 太郎、佐藤 花子 / 状態: 完了');
      await demo.getByRole('checkbox', { name: '編集を許可' }).check();
      await owner.click();
      while (await list.getByRole('option', { selected: true }).count()) await list.getByRole('option', { selected: true }).first().click();
      await list.press('Escape');
      assert.equal(await summary.innerText(), '担当者: 未割り当て / 状態: 完了');
      assert.deepEqual(await demo.evaluate(async element => (await axe.run(element)).violations.map(v => v.id)), []);
      await page.emulateMedia({ reducedMotion: 'reduce' });
      assert.equal(await owner.locator(':scope > span').evaluate(el => getComputedStyle(el).transitionDuration), '0s');
      await page.setViewportSize({ width: 390, height: 844 });
      assert(await demo.evaluate(el => el.scrollWidth <= el.clientWidth));
      await page.setViewportSize({ width: 1100, height: 900 });
      console.log(`${framework}: SSR snapshot, hydration, first interaction, focus, state preservation, retry, permissions and accessibility passed`);
    }

    // Existing whole-demo client-only boundaries: inspect real HTML without JavaScript.
    const htmlPage = await browser.newPage({ javaScriptEnabled: false });
    const routes = ['components/picker', 'blocks/assignees', 'components/context-menu', 'components/data-list', 'components/dropdown', 'blocks/two-column-dialog'];
    for (const route of routes) {
      await htmlPage.goto(`${base}/${route}/`);
      const island = htmlPage.locator('.component-preview astro-island[client="only"]');
      assert.equal(await island.count(), 1, `${route}: Vue demo is client-only`);
      assert((await island.textContent()).includes('デモを読み込んでいます…'));
      assert.equal(await island.locator('button').count(), 0);
      assert.equal(await htmlPage.locator('.component-preview astro-island[client="load"]').count(), 1, `${route}: React demo is prerendered`);
    }
    await htmlPage.close();
    for (const route of routes.slice(0, 4)) {
      await page.goto(`${base}/${route}/`);
      for (const framework of ['Vue', 'React']) {
        await page.getByRole('tab', { name: framework, exact: true }).click();
        const preview = page.locator('.component-preview').filter({ visible: true });
        await preview.locator('astro-island:not([ssr])').waitFor();
        const trigger = route === 'components/picker' ? preview.getByRole('button', { name: '担当チーム', exact: true })
          : route === 'blocks/assignees' ? preview.getByRole('button', { name: /^担当者:/ })
          : route === 'components/context-menu' ? preview.getByRole('button', { name: '請求書を送るの操作' })
          : preview.getByRole('button', { name: /^一覧のデザインを整えるの担当者/ });
        await trigger.click();
        const destination = route === 'components/context-menu' ? preview.getByRole('menu', { name: 'タスクの操作', exact: true }).getByRole('menuitem', { name: '編集', exact: true })
          : route === 'components/data-list' ? preview.getByRole('listbox', { name: '一覧のデザインを整えるの担当者', exact: true })
          : preview.getByRole('searchbox').first();
        await focused(destination);
        await destination.press('Escape');
        await focused(trigger);
      }
      console.log(`${route}: Vue client-only / React hydration and first focus passed`);
    }
    assert.deepEqual(errors, [], 'no browser errors or hydration warnings');
    await page.close();
  } finally {
    releaseScripts?.();
    await browser?.close();
    server.kill();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
