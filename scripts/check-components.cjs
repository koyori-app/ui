// Run after typecheck and build-storybook; same browser setup as check-picker.cjs.
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { resolve } = require('node:path');
const { readFileSync } = require('node:fs');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = resolve(__dirname, '..');
const port = process.env.COMPONENTS_TEST_PORT || '6243';
const base = `http://127.0.0.1:${port}`;
const server = spawn('python3', ['-m', 'http.server', port, '--bind', '127.0.0.1', '--directory', root], { stdio: 'ignore' });
let browser;
(async () => {
  try {
    for (let i = 0; i < 40; i++) {
      try { if ((await fetch(base)).ok) break; } catch {}
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    browser = await chromium.launch({ headless: true });
    for (const framework of ['react', 'vue']) {
      const css = readFileSync(resolve(root, `packages/${framework}/dist/style.css`), 'utf8');
      assert.equal((css.match(/--koyori-font-family:/g) || []).length, 1, 'tokens occur once in distribution CSS');
      const page = await browser.newPage({ viewport: { width: 800, height: 700 } });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      page.on('console', message => { if (['error', 'warning'].includes(message.type())) errors.push(message.text()); });
      const settle = () => page.waitForTimeout(100);
      const story = async (component, name) => {
        await page.goto(`${base}/packages/${framework}/storybook-static/iframe.html?id=components-${component}--${name}&viewMode=story`);
        await page.locator('#storybook-root > *').first().waitFor();
        await settle();
      };
      // Input は枠・背景・フォーカス枠を包む要素が描く。Textarea と Button はその要素自身。
      const ring = locator => locator.evaluate(el => {
        const target = el.tagName === 'INPUT' ? el.parentElement : el;
        const css = getComputedStyle(target);
        return [css.outlineWidth, css.outlineColor, css.outlineOffset];
      });
      const shellStyle = (locator, property) => locator.evaluate((el, property) => getComputedStyle(el.tagName === 'INPUT' ? el.parentElement : el)[property], property);
      const surface = locator => locator.evaluate(el => {
        const css = getComputedStyle(el.firstElementChild);
        return [css.padding, css.gap, css.backgroundColor, css.transitionDuration, getComputedStyle(el).color];
      });
      await story('button', 'icon-only');
      assert(await page.getByRole('button', { name: 'その他の操作', exact: true }).isVisible());
      assert.equal(await page.getByRole('button').innerText(), '');
      await story('button', 'ghost');
      let button = page.getByRole('button', { name: 'Continue' });
      await page.keyboard.press('Tab');
      const focus = await ring(button);
      assert.equal(focus[0], '2px');
      await button.hover(); await page.waitForTimeout(200);
      const ghost = await surface(button);
      for (const component of ['dropdown', 'picker']) {
        await story(component, 'default');
        const trigger = page.getByRole('button').first();
        await page.keyboard.press('Tab');
        assert.deepEqual(await ring(trigger), focus);
        await trigger.hover(); await page.waitForTimeout(200);
        assert.deepEqual(await surface(trigger), ghost, `${component} uses the ghost surface`);
        assert.equal(await trigger.locator('svg').getAttribute('width'), '16');
        const panel = page.locator(component === 'dropdown' ? '[role="menu"]' : '[role="group"]');
        await panel.evaluate(el => {
          window.menuProbeAdds = 0;
          new MutationObserver(records => {
            for (const record of records) for (const node of record.addedNodes) {
              if (node instanceof HTMLElement && node.style.visibility === 'hidden') window.menuProbeAdds++;
            }
          }).observe(el, { childList: true });
        });
        await trigger.click(); await settle();
        assert.equal(await page.evaluate(() => window.menuProbeAdds), 1, 'measure once when opening');
        await page.evaluate(() => {
          for (let i = 0; i < 5; i++) {
            window.dispatchEvent(new Event('resize'));
            window.dispatchEvent(new Event('scroll'));
          }
        });
        await settle();
        assert.equal(await page.evaluate(() => window.menuProbeAdds), 1, 'scroll and resize reuse measured lengths');
        await trigger.click(); await settle();
        await trigger.click(); await settle();
        assert.equal(await page.evaluate(() => window.menuProbeAdds), 2, 'reopening refreshes the measurements');
      }
      await story('button', 'secondary');
      const enabledBackground = (await surface(page.getByRole('button')))[2];
      await story('button', 'secondary-disabled');
      const disabledBackground = (await surface(page.getByRole('button')))[2];
      assert.notEqual(disabledBackground, enabledBackground);
      await story('field', 'disabled');
      assert.equal(await shellStyle(page.getByRole('textbox'), 'backgroundColor'), disabledBackground);
      let inputBorder;
      for (const name of ['required', 'with-textarea']) {
        await story('field', name);
        const input = page.getByRole('textbox');
        await page.keyboard.press('Tab');
        await page.mouse.move(799, 699);
        await page.waitForTimeout(200);
        inputBorder = await shellStyle(input, 'borderTopColor');
        assert.deepEqual(await ring(input), focus);
        const id = await input.getAttribute('id');
        assert.equal(await page.locator('label').getAttribute('for'), id);
        assert.equal(await input.getAttribute('aria-describedby'), `${id}-description`);
        if (name === 'required') assert(await input.evaluate(el => el.required));
        await page.locator('label').click();
        assert(await input.evaluate(el => el === document.activeElement));
      }
      await story('field', 'invalid');
      const errorBorder = await shellStyle(page.getByRole('textbox'), 'borderTopColor');
      await story('dropdown', 'localized');
      assert.equal(await page.getByRole('menuitem').innerText(), 'No actions available');
      await story('picker', 'localized');
      const search = page.getByRole('searchbox', { name: 'Search teams' });
      assert.equal(await search.getAttribute('placeholder'), 'Search…');
      await page.waitForTimeout(350);
      assert.equal(await page.getByRole('status').innerText(), '2 teams available');
      await page.getByRole('option', { name: 'Design' }).click();
      await page.getByRole('option', { name: 'Frontend' }).click();
      assert.equal(await page.getByRole('button').innerText(), 'Design, Frontend');
      await page.getByRole('status').evaluate(el => {
        window.statusChanges = [];
        new MutationObserver(() => window.statusChanges.push(el.textContent)).observe(el, { childList: true, characterData: true, subtree: true });
      });
      await search.fill('De');
      await page.waitForTimeout(50);
      await search.fill('Fro');
      await page.waitForTimeout(50);
      await search.fill('Front');
      await page.waitForTimeout(350);
      assert.deepEqual(await page.evaluate(() => window.statusChanges), ['1 teams available'], 'rapid input produces one final announcement');
      await search.fill('missing');
      assert(await page.getByText('No teams found', { exact: true }).first().isVisible(), 'empty result is visible immediately');
      await page.waitForTimeout(350);
      assert.equal(await page.getByRole('status').innerText(), 'No teams found');
      await search.fill('Design');
      await search.press('Escape');
      await page.waitForTimeout(350);
      assert.equal(await page.getByRole('status', { includeHidden: true }).textContent(), '', 'closing cancels pending announcements');
      await story('picker', 'undefined-search');
      assert(await page.getByRole('searchbox').isVisible(), 'undefined keeps the default search enabled');
      await story('picker', 'updating-parent');
      await page.waitForFunction(() => document.querySelector('[role="status"]')?.textContent === '6件の候補', undefined, { timeout: 2000 });
      assert(Number(await page.locator('output').innerText()) >= 1, 'inline formatter changes must not postpone the announcement');

      for (const name of ['in-field', 'in-field-without-search']) {
        await story('picker', name);
        const trigger = page.locator('#team');
        const error = page.locator('#team-error');
        const originalError = await error.elementHandle();
        assert.equal(await error.getAttribute('aria-live'), 'polite');
        assert.equal(await error.innerText(), '');
        assert.equal(await page.locator('#team-required').innerText(), 'Required');
        assert(await page.getByRole('button', { name: '担当チーム 選んでください Required', exact: true }).isVisible(), 'required is exposed while closed');
        assert.equal(await trigger.getAttribute('aria-required'), null, 'button must not receive unsupported aria-required');
        await page.mouse.move(799, 699);
        assert.equal(await trigger.locator(':scope > span').evaluate(el => getComputedStyle(el).borderTopColor), inputBorder);
        assert.equal((await trigger.boundingBox()).width, 360, 'Field trigger follows the input width');
        await page.getByRole('button', { name: '確認', exact: true }).click();
        await settle();
        assert.equal(await error.innerText(), 'チームを選択してください。');
        assert(await originalError.evaluate(el => el.isConnected), 'live region survives updates');
        assert.equal(await trigger.getAttribute('aria-describedby'), 'team-description team-error');
        assert.equal(await trigger.getAttribute('aria-invalid'), 'true');
        assert.equal(await trigger.locator(':scope > span').evaluate(el => getComputedStyle(el).borderTopColor), errorBorder);
        if (name === 'in-field') await page.screenshot({ path: `/tmp/koyori-rereview-field-${framework}.png` });
        await page.locator('label').click();
        await settle();
        const list = page.getByRole('listbox', { name: '担当チーム', exact: true });
        assert.equal(await list.getAttribute('aria-required'), 'true');
        assert.equal(await list.getAttribute('aria-invalid'), 'true');
        assert.equal(await list.getAttribute('aria-describedby'), null);
        if (name === 'in-field') {
          const search = page.getByRole('searchbox');
          assert(await search.evaluate(el => el === document.activeElement));
          assert.equal(await search.getAttribute('aria-describedby'), null);
        } else assert(await list.evaluate(el => el === document.activeElement));
        await list.getByRole('option', { name: 'Frontend' }).click();
        await settle();
        assert(await page.getByRole('button', { name: '担当チーム Frontend Required', exact: true }).isVisible());
        assert.equal(await trigger.getAttribute('aria-invalid'), null);
        assert.equal(await trigger.getAttribute('aria-describedby'), 'team-description');
        assert.equal(await error.innerText(), '');
        assert(await originalError.evaluate(el => el.isConnected));
        await page.getByRole('button', { name: '必須／任意を切り替え', exact: true }).click();
        await settle();
        assert(await page.getByRole('button', { name: '担当チーム Frontend', exact: true }).isVisible());
        assert.equal(await page.locator('#team-required').count(), 0);
        await trigger.click();
        await settle();
        assert.equal(await list.getAttribute('aria-required'), null);
        assert.equal((await page.getByRole('group').boundingBox()).width, 200, 'panel width stays independent of the Field');
      }
      await story('picker', 'in-field-disabled');
      assert(await page.locator('#team').isDisabled());
      assert.equal((await surface(page.locator('#team')))[2], disabledBackground);
      await story('picker', 'large-list');
      const options = page.getByRole('option');
      assert.equal(await options.count(), 1001);
      const lastId = await options.last().getAttribute('id');
      const list = page.getByRole('listbox');
      await list.focus(); await list.press('End'); await settle();
      assert.equal(await list.getAttribute('aria-activedescendant'), lastId);
      const activeRing = await ring(options.last());
      assert.deepEqual(activeRing, [focus[0], focus[1], '-2px']);
      await page.getByRole('searchbox').fill(' ＴＥＡＭ 1000 '); await settle();
      assert.equal(await options.count(), 1);
      assert.equal(await options.first().getAttribute('id'), lastId);
      await page.getByRole('searchbox').press('Enter'); await settle();
      assert.equal(await page.getByRole('button').innerText(), 'Team 1000');
      await page.getByRole('button').click(); await settle();
      assert.equal(await options.count(), 1001);
      await page.locator('#storybook-root').evaluate(el => {
        el.style.setProperty('--koyori-menu-max-height', 'calc(10rem + 20px)');
        el.style.setProperty('--koyori-menu-gap', '.75rem');
        el.style.setProperty('--koyori-menu-viewport-margin', 'calc(.5rem + 4px)');
        el.style.setProperty('--koyori-menu-width', '244px');
        window.dispatchEvent(new Event('resize'));
      });
      await settle();
      const panel = page.getByRole('group');
      assert.equal((await panel.boundingBox()).height, 360, 'length changes are held until reopening');
      await page.getByRole('button').click(); await settle();
      await page.getByRole('button').click(); await settle();
      const panelBox = await panel.boundingBox();
      const triggerBox = await page.getByRole('button').boundingBox();
      assert.equal(panelBox.width, 244);
      assert.equal(panelBox.height, 180);
      assert.equal(panelBox.y - triggerBox.y - triggerBox.height, 12);
      await page.getByRole('button').evaluate(el => {
        el.parentElement.style.cssText = 'position: fixed; bottom: 16px; right: 0;';
        window.dispatchEvent(new Event('resize'));
      });
      await settle();
      const above = await panel.boundingBox();
      const below = await page.getByRole('button').boundingBox();
      assert.equal(await panel.getAttribute('data-side'), 'top');
      assert.equal(below.y - above.y - above.height, 12);
      assert(above.x + above.width <= 800 - 12, 'calc viewport margin is respected horizontally');
      await page.emulateMedia({ reducedMotion: 'reduce' });
      assert.equal(await list.locator(':scope > span').first().evaluate(el => getComputedStyle(el).transitionDuration), '0s');
      assert.equal((await surface(page.getByRole('button')))[3], '0s');
      assert.deepEqual(errors, []);
      console.log(`${framework}: shared styles, disabled state, localization, Field updates, 1,001 options and tokens passed.`);
      await page.close();
    }
  } finally {
    await browser?.close();
    server.kill();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
