// No browser needed: node scripts/check-card-separator.cjs（pnpm build のあとに実行する）
// Storybook をビルド済みなら、続けてブラウザーでの検証も行う。
const assert = require('node:assert/strict');
const { readFileSync, readdirSync, existsSync } = require('node:fs');
const { spawn } = require('node:child_process');
const { resolve } = require('node:path');

const root = resolve(__dirname, '..');
const read = (path) => readFileSync(resolve(root, path), 'utf8');

for (const framework of ['vue', 'react']) {
  const css = read(`packages/${framework}/dist/style.css`);
  // CSS Modules ではないので、クラス名はハッシュ化されずそのまま使える。
  assert.match(css, /\.koyori-card\{/, `${framework}: カードのクラスがそのままの名前で入る`);
  assert.match(css, /\.koyori-card-heading\{/, `${framework}: 見出しのクラスがある`);
  assert.match(css, /\.koyori-card-actions\{/, `${framework}: 操作行のクラスがある`);
  assert.match(css, /\.koyori-separator\{/, `${framework}: 区切りのクラスがある`);
  assert.match(css, /\.koyori-separator\[aria-orientation=['"]?vertical['"]?\]/, `${framework}: 縦の区切りのクラスがある`);
  assert.match(css, /\.koyori-card\{[^}]*border-radius:calc\(var\(--koyori-radius-md\) \+ var\(--koyori-card-padding\)\)/,
    `${framework}: 外側の角丸は内側の角丸 + padding`);
  assert.equal((css.match(/--koyori-font-family:/g) || []).length, 1, `${framework}: トークンは配布 CSS に 1 回だけ`);
}

for (const framework of ['vue', 'react']) {
  const index = read(`packages/${framework}/src/index.ts`);
  assert.match(index, /^import '\.\/generated\/components\/shared\/utilities\.css';/m, `${framework}: 公開エントリーが読み込む`);
}

console.log('Card・Separator のクラス名、角丸の計算、トークンの重複なしを確認しました。');

if (!['vue', 'react'].every((framework) => existsSync(resolve(root, `packages/${framework}/storybook-static/iframe.html`)))) {
  console.log('storybook-static がないため、ブラウザー検証は省きました（pnpm build-storybook のあとに再実行してください）。');
  return;
}

const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const port = process.env.CARD_TEST_PORT || '16326';
const base = `http://127.0.0.1:${port}`;
const server = spawn('python3', ['-u', '-m', 'http.server', port, '--bind', '127.0.0.1', '--directory', root], { stdio: ['ignore', 'pipe', 'pipe'] });
let browser;
(async () => {
  try {
    // 自分が立てたサーバーの起動だけを待つ。別のポートの取り違えを避ける。
    await new Promise((ready, fail) => {
      let errors = '';
      const timeout = setTimeout(() => fail(new Error(`Server ${port} did not start: ${errors}`)), 5000);
      server.stderr.on('data', (chunk) => { errors += chunk; });
      server.once('error', (error) => { clearTimeout(timeout); fail(error); });
      server.once('exit', (code) => { clearTimeout(timeout); fail(new Error(`Server ${port} exited (${code}): ${errors}`)); });
      server.stdout.on('data', (chunk) => { if (chunk.toString().includes('Serving HTTP')) { clearTimeout(timeout); ready(); } });
    });
    const axe = readdirSync(resolve(root, 'node_modules/.pnpm')).find((name) => name.startsWith('axe-core@'));
    assert(axe, 'Storybook が入れた axe-core を使う');
    const axeSource = readFileSync(resolve(root, `node_modules/.pnpm/${axe}/node_modules/axe-core/axe.min.js`), 'utf8');
    browser = await chromium.launch({ headless: true });

    for (const framework of ['react', 'vue']) {
      const page = await browser.newPage({ viewport: { width: 900, height: 800 } });
      const errors = [];
      page.on('pageerror', (error) => errors.push(error.message));
      page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
      const story = async (name) => {
        await page.goto(`${base}/packages/${framework}/storybook-static/iframe.html?id=styles-card-separator--${name}&viewMode=story`);
        await page.locator('#storybook-root .koyori-card, #storybook-root .koyori-separator').first().waitFor();
      };
      const a11y = async () => {
        // Keep our instance separate from the addon, which may replace window.axe.
        await page.addScriptTag({ content: `${axeSource}\nwindow.cardAxe = window.axe;` });
        const violations = await page.evaluate(async () => (await window.cardAxe.run(document.querySelector('#storybook-root'))).violations.map((v) => ({ id: v.id, targets: v.nodes.map((n) => n.target) })));
        assert.deepEqual(violations, []);
      };

      await story('basic');
      const card = page.locator('.koyori-card').first();
      assert.equal(await card.evaluate((el) => getComputedStyle(el).borderTopLeftRadius), '24px', '既定は 8px + 16px');
      assert.equal(await page.getByRole('separator').count(), 1);
      await a11y();

      // padding を上書きすると角丸も追従する。
      await card.evaluate((el) => el.style.setProperty('--koyori-card-padding', '24px'));
      assert.equal(await card.evaluate((el) => getComputedStyle(el).borderTopLeftRadius), '32px');
      await card.evaluate((el) => el.style.setProperty('--koyori-radius-md', '12px'));
      assert.equal(await card.evaluate((el) => getComputedStyle(el).borderTopLeftRadius), '36px');

      await story('separators');
      const separators = page.getByRole('separator');
      assert.equal(await separators.count(), 3);
      assert.equal(await separators.nth(0).getAttribute('aria-orientation'), null, '横はそのまま');
      for (const index of [1, 2]) {
        assert.equal(await separators.nth(index).getAttribute('aria-orientation'), 'vertical');
        const box = await separators.nth(index).boundingBox();
        assert(box.height > box.width, '縦の区切りは縦長');
      }
      await a11y();

      await story('nested');
      const cards = page.locator('.koyori-card');
      assert.equal(await cards.count(), 3);
      const [outer, inner] = await cards.evaluateAll((elements) => elements.slice(0, 2).map((el) => getComputedStyle(el).borderTopLeftRadius));
      assert.equal(outer, '24px');
      assert.equal(inner, '24px', '入れ子でも同じ計算を使う');
      await a11y();

      for (const name of ['in-dialog', 'in-sidebar', 'dark-background']) {
        await story(name);
        await a11y();
      }

      assert.deepEqual(errors, []);
      await page.close();
      console.log(`${framework}: Card の角丸とトークンの追従、hr の区切り、縦の向き、入れ子、axe を確認しました。`);
    }
  } finally {
    await browser?.close();
    server.kill();
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
