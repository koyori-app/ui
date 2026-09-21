// Run after pnpm typecheck, pnpm build-storybook and pnpm build:docs.
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { resolve } = require('node:path');
const { readFileSync, readdirSync } = require('node:fs');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = resolve(__dirname, '..');
const storyPort = process.env.TAG_BADGE_TEST_PORT || '16308';
const docsPort = process.env.TAG_BADGE_DOCS_PORT || '16318';
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
  console.log(`Own server pid=${server.pid}, port=${port}, directory=${directory}`);
  return `http://127.0.0.1:${port}`;
}

(async () => {
  try {
    const storyBase = await serve(root, storyPort);
    const docsBase = await serve(resolve(root, 'apps/docs/dist'), docsPort);
    const axe = readdirSync(resolve(root, 'node_modules/.pnpm')).find(name => name.startsWith('axe-core@'));
    assert(axe, 'use axe-core already installed by Storybook');
    const axePath = resolve(root, `node_modules/.pnpm/${axe}/node_modules/axe-core/axe.min.js`);
    const axeSource = readFileSync(axePath, 'utf8');
    browser = await chromium.launch({ headless: true });

    for (const framework of ['react', 'vue']) {
      const page = await browser.newPage({ viewport: { width: 800, height: 700 } });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      page.on('console', message => { if (['error', 'warning'].includes(message.type())) errors.push(message.text()); });
      const story = async (component, name) => {
        await page.goto(`${storyBase}/packages/${framework}/storybook-static/iframe.html?id=components-${component}--${name}&viewMode=story`);
        await page.locator('#storybook-root [data-size]').waitFor();
      };
      const a11y = async selector => {
        // Keep our instance separate from the addon, which may replace window.axe.
        await page.addScriptTag({ content: `${axeSource}\nwindow.tagBadgeAxe = window.axe;` });
        const violations = await page.evaluate(async selector => (await window.tagBadgeAxe.run(document.querySelector(selector))).violations.map(v => ({ id: v.id, targets: v.nodes.map(n => n.target) })), selector);
        assert.deepEqual(violations, []);
      };
      const item = page.locator('#storybook-root [data-size]');
      const dot = item.locator(':scope > span > span[aria-hidden="true"]');
      for (const component of ['tag', 'badge']) {
        await story(component, 'default');
        assert.equal(await item.getAttribute('data-size'), 'sm');
        assert.equal(await dot.count(), 0);
        assert.equal(await page.getByRole('button').count(), 0, 'display-only labels have no button');
        assert.equal(await item.locator('[tabindex], [role]').count(), 0);
        const small = await item.boundingBox();
        assert.equal(await item.evaluate(el => getComputedStyle(el).fontSize), '14px');
        await a11y('#storybook-root');

        await story(component, 'with-dot');
        assert.equal(await dot.count(), 1);
        assert.equal(await dot.getAttribute('aria-hidden'), 'true');
        assert.notEqual(await dot.evaluate(el => getComputedStyle(el).backgroundColor), 'rgba(0, 0, 0, 0)', 'CSS variable color resolves');
        await a11y('#storybook-root');
        await page.emulateMedia({ forcedColors: 'active' });
        assert.equal(await dot.evaluate(el => getComputedStyle(el).outlineStyle), 'solid');
        await page.emulateMedia({ forcedColors: 'none' });

        await story(component, 'empty-dot');
        assert.equal(await dot.count(), 0, 'empty color hides the decorative dot');

        await story(component, 'medium');
        assert.equal(await item.evaluate(el => getComputedStyle(el).fontSize), '16px');
        assert((await item.boundingBox()).height > small.height);
        assert.equal(await dot.evaluate(el => getComputedStyle(el).backgroundColor), 'rgb(35, 112, 75)');

        await story(component, 'long-label');
        await page.setViewportSize({ width: 320, height: 700 });
        assert((await item.boundingBox()).width <= 220);
        assert((await item.boundingBox()).height > small.height, 'long text wraps rather than truncates');
        assert(await item.evaluate(el => el.scrollWidth <= el.clientWidth + 1), 'no internal horizontal overflow');
        assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'no viewport horizontal overflow');
        await a11y('#storybook-root');
        await page.screenshot({ path: `/tmp/ui-11-${framework}-${component}-long.png` });
        await page.setViewportSize({ width: 800, height: 700 });
      }

      for (const [name, expected] of [['zero', '0'], ['count', '123456789']]) {
        await story('badge', name);
        assert.equal(await item.innerText(), expected);
        assert.equal(await page.getByRole('button').count(), 0);
        await a11y('#storybook-root');
      }

      await story('tag', 'removable');
      const remove = page.getByRole('button', { name: 'デザインを削除', exact: true });
      const requests = page.locator('output[aria-label="削除通知"]');
      assert.equal(await remove.getAttribute('type'), 'button');
      assert.equal(await remove.locator('svg').getAttribute('aria-hidden'), 'true');
      const box = await remove.boundingBox();
      assert(box.width >= 24 && box.height >= 24, 'remove target is at least 24px');
      await page.keyboard.press('Tab');
      assert(await remove.evaluate(el => el === document.activeElement));
      assert.equal(await remove.evaluate(el => getComputedStyle(el).outlineWidth), '2px');
      await page.keyboard.press('Enter');
      await page.waitForFunction(() => document.querySelector('output')?.textContent === '1');
      await page.keyboard.press('Space');
      await page.waitForFunction(() => document.querySelector('output')?.textContent === '2');
      await remove.click();
      assert.equal(await requests.innerText(), '3', 'one notification per click/Enter/Space');
      assert.equal(await page.locator('output[aria-label="送信回数"]').innerText(), '0');
      assert(await remove.isVisible(), 'the app can reject removal without the Tag disappearing');
      assert(await remove.evaluate(el => el === document.activeElement));
      await a11y('#storybook-root');

      await page.locator('#storybook-root').evaluate(el => {
        el.style.setProperty('--koyori-radius-md', '12px');
        el.style.setProperty('--koyori-space-xs', '6px');
      });
      assert.equal(await remove.evaluate(el => getComputedStyle(el).borderTopLeftRadius), '12px');
      assert.equal(await item.evaluate(el => getComputedStyle(el).borderTopLeftRadius), '15px', 'outer radius = inner radius + padding, following token overrides');
      await page.emulateMedia({ reducedMotion: 'reduce' });
      assert.equal(await remove.locator('span').first().evaluate(el => getComputedStyle(el).transitionDuration), '0s');
      await page.emulateMedia({ reducedMotion: 'no-preference' });

      await story('tag', 'custom-remove-label');
      assert(await page.getByRole('button', { name: 'Remove Design label', exact: true }).isVisible());
      await a11y('#storybook-root');
      assert.deepEqual(errors, []);
      console.log(`${framework}: sizes, decorative dots, wrapping, zero/count, removal notifications, keyboard, focus, tokens, reduced motion, forced colors and axe passed.`);

      await page.goto(`${docsBase}/components/tag-badge/`);
      await page.waitForFunction(() => !document.querySelector('astro-island[ssr]'));
      await page.getByRole('tab', { name: framework === 'vue' ? 'Vue' : 'React', exact: true }).click();
      const preview = page.locator('[role="tabpanel"]:visible .component-preview');
      await preview.getByRole('button', { name: 'デザインを削除', exact: true }).focus();
      await page.keyboard.press('Enter');
      const second = preview.getByRole('button', { name: 'アクセシビリティを削除', exact: true });
      assert(await second.evaluate(el => el === document.activeElement), 'app moves focus to the next Tag');
      await second.press('Space');
      const reset = preview.getByRole('button', { name: 'ラベルを戻す', exact: true });
      assert(await reset.evaluate(el => el === document.activeElement), 'last removal moves focus to the fallback button');
      assert.equal(await preview.getByText('0', { exact: true }).innerText(), '0');
      assert.equal(await preview.getByRole('status').innerText(), 'アクセシビリティを削除しました');
      await reset.click();
      await preview.getByRole('button', { name: 'アクセシビリティを削除', exact: true }).click();
      assert(await preview.getByRole('button', { name: 'デザインを削除', exact: true }).evaluate(el => el === document.activeElement), 'app falls back to the previous Tag');
      await a11y('[role="tabpanel"]:not([hidden]) .component-preview');
      assert.deepEqual(errors, [], 'docs hydrate and operate without errors or warnings');
      console.log(`${framework}: docs hydration, app-owned deletion/count/status, next/previous/fallback focus and axe passed.`);
      await page.close();
    }

    const ssr = await browser.newPage({ javaScriptEnabled: false });
    await ssr.goto(`${docsBase}/components/tag-badge/`);
    const islands = ssr.locator('.component-preview astro-island');
    assert.equal(await islands.count(), 2);
    for (const island of await islands.all()) {
      assert.equal(await island.locator('[data-size]').count(), 7, 'both frameworks render the whole demo in initial HTML');
      assert.equal(await island.locator('button[aria-label$="を削除"]').count(), 2);
      assert.equal(await island.getByText('2', { exact: true }).textContent(), '2');
    }
    await ssr.close();
    console.log('Vue/React initial HTML passed with JavaScript disabled.');
  } finally {
    await browser?.close();
    for (const server of servers) server.kill();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
