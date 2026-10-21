// No browser needed: node scripts/check-pagination.cjs（pnpm build のあとに実行する）
// Storybook をビルド済みなら、続けてブラウザーでの検証も行う。
const assert = require('node:assert/strict');
const { mkdtempSync, rmSync, readFileSync, readdirSync, existsSync } = require('node:fs');
const { execFileSync, spawn } = require('node:child_process');
const { tmpdir } = require('node:os');
const { join, resolve } = require('node:path');

const root = resolve(__dirname, '..');
const compiled = mkdtempSync(join(tmpdir(), 'koyori-pagination-'));
let pagination;
try {
  execFileSync(process.execPath, [require.resolve('typescript/bin/tsc'), '--ignoreConfig',
    '--module', 'commonjs', '--target', 'ES2022', '--skipLibCheck', '--outDir', compiled,
    resolve(root, 'components/Pagination/pagination.ts')], { stdio: 'inherit' });
  pagination = require(join(compiled, 'pagination.js'));
} finally {
  rmSync(compiled, { recursive: true, force: true });
}
const { pageCount, clampPage, pageRange, canGoPrevious, canGoNext, formatPageRange, pageItems, formatPageLabel } = pagination;
const { NaN: nan, POSITIVE_INFINITY: infinity } = Number;

// ページ数: 端数は 1 ページに数える。0 で割らない。
assert.equal(pageCount(120, 20), 6);
assert.equal(pageCount(121, 20), 7, '端数も 1 ページ');
assert.equal(pageCount(0, 20), 0, '0 件は 0 ページ');
assert.equal(pageCount(undefined, 20), 0, '未取得は 0 ページ');
assert.equal(pageCount(5, 0), 5, 'pageSize 0 は 1 件ずつ');
assert.equal(pageCount(5, -3), 5, '負の pageSize は 1 件ずつ');
assert.equal(pageCount(5, nan), 5, 'NaN の pageSize は 1 件ずつ');
assert.equal(pageCount(5, infinity), 5, 'Infinity の pageSize は 1 件ずつ');
assert.equal(pageCount(infinity, 20), 0, '非有限の total は 0 件');
assert.equal(pageCount(nan, 20), 0, 'NaN の total は 0 件');

// 範囲: 先頭・途中・末尾・端数・0 件・範囲外。
assert.deepEqual(pageRange(1, 20, 120), { from: 1, to: 20, total: 120 }, '先頭ページ');
assert.deepEqual(pageRange(3, 20, 120), { from: 41, to: 60, total: 120 }, '途中のページ');
assert.deepEqual(pageRange(6, 20, 120), { from: 101, to: 120, total: 120 }, '末尾ページ');
assert.deepEqual(pageRange(7, 20, 121), { from: 121, to: 121, total: 121 }, '端数だけの末尾ページ');
assert.deepEqual(pageRange(1, 20, 0), { from: 0, to: 0, total: 0 }, '0 件');
assert.deepEqual(pageRange(3, 20, 0), { from: 0, to: 0, total: 0 }, '0 件ならページによらず 0');
assert.deepEqual(pageRange(10, 20, 120), { from: 101, to: 120, total: 120 }, '範囲外は末尾ページとして表示');
assert.deepEqual(pageRange(0, 20, 120), { from: 1, to: 20, total: 120 }, '1 未満は先頭ページ');
assert.deepEqual(pageRange(nan, 20, 120), { from: 1, to: 20, total: 120 }, 'NaN のページは先頭ページ');
assert.deepEqual(pageRange(2.7, 20, 120), { from: 21, to: 40, total: 120 }, '小数のページは切り捨て');
assert.deepEqual(pageRange(2, 0, 3), { from: 2, to: 2, total: 3 }, 'pageSize 0 は 1 件ずつ');
assert.deepEqual(pageRange(1, 20, infinity), { from: 0, to: 0, total: 0 }, '非有限の total は 0 件');
assert.equal(clampPage(10, 20, 120), 6, '範囲外は末尾ページ');
assert.equal(clampPage(10, 20, undefined), 10, 'total が無ければ直さない');
assert.equal(clampPage(3, 20, 0), 1, '0 件なら 1 ページ目');

// 前へ・次へ。
assert.equal(canGoPrevious(1), false, '先頭では前へ進めない');
assert.equal(canGoPrevious(2), true);
assert.equal(canGoPrevious(0), false, '1 未満は先頭扱い');
assert.equal(canGoPrevious(nan), false, 'NaN は先頭扱い');
assert.equal(canGoNext(1, 20, 120, undefined), true);
assert.equal(canGoNext(6, 20, 120, undefined), false, '末尾では次へ進めない');
assert.equal(canGoNext(10, 20, 120, undefined), false, '範囲外も末尾扱い');
assert.equal(canGoNext(1, 20, 0, true), false, '0 件なら hasNext より total を優先する');
assert.equal(canGoNext(1, 20, 20, undefined), false, 'ちょうど 1 ページ');
assert.equal(canGoNext(1, 20, 21, undefined), true, '1 件はみ出せば次がある');
assert.equal(canGoNext(1, 20, undefined, true), true, 'total が無ければ hasNext に従う');
assert.equal(canGoNext(1, 20, undefined, false), false);
assert.equal(canGoNext(1, 20, undefined, undefined), false, 'hasNext も無ければ次は無い');

// 文言: en dash でつなぎ、0 件は範囲を出さない。
assert.equal(formatPageRange({ from: 1, to: 20, total: 120 }), '1–20 / 120 件');
assert.equal(formatPageRange({ from: 0, to: 0, total: 0 }), '0 件');
assert.equal(formatPageRange(pageRange(7, 20, 121)), '121–121 / 121 件');

// ページ番号: 先頭・末尾と現在ページの前後 2 ページ。省略記号が 1 ページしか隠さないならそのページを出す。
const labels = (items) => items.map((item) => item.page ?? '…').join(' ');
assert.equal(labels(pageItems(5, 20, 640)), '1 2 3 4 5 6 7 … 32', '先頭寄りは末尾側だけ省略する');
assert.equal(labels(pageItems(1, 20, 640)), '1 2 3 4 5 6 7 … 32', '先頭でも項目数を保つ');
assert.equal(labels(pageItems(6, 20, 640)), '1 … 4 5 6 7 8 … 32', '途中は両側を省略する');
assert.equal(labels(pageItems(28, 20, 640)), '1 … 26 27 28 29 30 31 32', '末尾寄りは先頭側だけ省略する');
assert.equal(labels(pageItems(32, 20, 640)), '1 … 26 27 28 29 30 31 32', '末尾でも項目数を保つ');
assert.equal(labels(pageItems(40, 20, 640)), '1 … 26 27 28 29 30 31 32', '範囲外は末尾ページとして並べる');
assert.equal(labels(pageItems(3, 20, 180)), '1 2 3 4 5 6 7 8 9', '9 ページ以下は省略しない');
assert.equal(labels(pageItems(5, 20, 200)), '1 2 3 4 5 6 7 … 10');
assert.equal(labels(pageItems(16, 20, 640, 1)), '1 … 15 16 17 … 32', 'siblingCount で前後の数を変える');
assert.equal(labels(pageItems(16, 20, 640, 0)), '1 … 16 … 32', 'siblingCount 0 は現在ページだけ');
assert.equal(labels(pageItems(16, 20, 640, -1)), labels(pageItems(16, 20, 640)), '負の siblingCount は既定の 2');
assert.equal(labels(pageItems(16, 20, 640, nan)), labels(pageItems(16, 20, 640)), 'NaN の siblingCount は既定の 2');
for (const page of [1, 2, 3, 4, 5, 6, 10, 16, 27, 28, 29, 30, 31, 32]) {
  assert.equal(pageItems(page, 20, 640).length, 9, `${page} ページ目でも項目数は 9`);
}
assert.deepEqual(pageItems(1, 20, 0), [], '0 件はページ番号を出さない');
assert.deepEqual(pageItems(1, 20, undefined), [], '総件数が分からなければページ番号を出さない');
const keys = pageItems(16, 20, 640).map((item) => item.key);
assert.equal(new Set(keys).size, keys.length, 'key は重ならない');
assert.equal(formatPageLabel(5), '5 ページ目');

const read = (path) => readFileSync(resolve(root, path), 'utf8');

for (const [name, path] of [['Vue', 'packages/vue/src/generated/components/Pagination/Pagination.vue'], ['React', 'packages/react/src/generated/components/Pagination/Pagination.tsx']]) {
  const source = read(path);
  assert.match(source, /<nav\b/, `${name} 版は nav のランドマーク`);
  assert.match(source, /aria-label/, `${name} 版は nav に名前を付ける`);
  assert.match(source, /ページ送り/, `${name} 版の既定の名前`);
  assert.match(source, /aria-disabled/, `${name} 版は端で aria-disabled を使う`);
  assert.doesNotMatch(source, /\s:?disabled=/, `${name} 版は disabled でフォーカスを消さない`);
  assert.match(source, /aria-live="polite"/, `${name} 版は範囲を polite で読ませる`);
  assert.match(source, /aria-atomic="true"/, `${name} 版は範囲をまとめて読ませる`);
  assert.match(source, /aria-busy/, `${name} 版は取得中を伝える`);
  assert.match(source, /aria-current/, `${name} 版は現在ページに aria-current を付ける`);
  assert.match(source, /data-hover-group/, `${name} 版はホバーの面を項目間で動かす`);
  for (const helper of ['pageRange', 'canGoPrevious', 'canGoNext', 'formatPageRange', 'clampPage', 'pageItems', 'formatPageLabel', 'listenToSidebar']) {
    assert.match(source, new RegExp(helper), `${name} 版も ${helper} の計算に通す`);
  }
}

// 共有のボタン用 CSS は DataList と共有なので、aria-disabled の見た目を足していないこと。
assert.doesNotMatch(read('components/shared/control.module.css'), /aria-disabled/, 'shared/control.module.css は触らない');

for (const framework of ['vue', 'react']) {
  const css = read(`packages/${framework}/dist/style.css`);
  assert.ok(/_page[^{]*\[aria-current=['"]?page['"]?\][^,{]*\{[^}]*background:var\(--koyori-color-accent\)[^}]*font-weight:600/.test(css), `${framework}: 現在ページはアクセントの面と太字`);
  assert.ok(/_step[^{]*\[aria-disabled=['"]?true['"]?\][^{]*\{[^}]*color:var\(--koyori-color-text-disabled\)[^}]*cursor:not-allowed/.test(css), `${framework}: aria-disabled は押せない見た目`);
  assert.ok(/forced-colors[^{]*\{[^@]*?aria-disabled[^{]*\{[^}]*graytext/i.test(css), `${framework}: 強制配色で aria-disabled を GrayText にする`);
  assert.ok(/forced-colors[^{]*\{[^@]*?aria-current[^{]*\{[^}]*highlight/i.test(css), `${framework}: 強制配色で現在ページを枠で示す`);
  assert.match(css, /tabular-nums/, `${framework}: 数字の幅をそろえる`);
}

console.log('Pagination のページ計算・範囲の文言、生成物、配布 CSS の規則を確認しました。');

if (!['vue', 'react'].every((framework) => existsSync(resolve(root, `packages/${framework}/storybook-static/iframe.html`)))) {
  console.log('storybook-static がないため、ブラウザー検証は省きました（pnpm build-storybook のあとに再実行してください）。');
  return;
}

const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const port = process.env.PAGINATION_TEST_PORT || '16329';
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
      const page = await browser.newPage({ viewport: { width: 800, height: 700 } });
      const errors = [];
      page.on('pageerror', (error) => errors.push(error.message));
      page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
      const nav = page.getByRole('navigation', { name: 'ページ送り' });
      const range = nav.locator('p');
      const previous = nav.getByRole('button', { name: '前へ', exact: true });
      const next = nav.getByRole('button', { name: '次へ', exact: true });
      const story = async (name) => {
        await page.goto(`${base}/packages/${framework}/storybook-static/iframe.html?id=components-pagination--${name}&viewMode=story`);
        await nav.waitFor();
      };
      const a11y = async () => {
        // Keep our instance separate from the addon, which may replace window.axe.
        await page.addScriptTag({ content: `${axeSource}\nwindow.paginationAxe = window.axe;` });
        const violations = await page.evaluate(async () => (await window.paginationAxe.run(document.querySelector('#storybook-root'))).violations.map((v) => ({ id: v.id, targets: v.nodes.map((n) => n.target) })));
        assert.deepEqual(violations, []);
      };
      const focused = (locator) => locator.evaluate((el) => el === document.activeElement);

      await story('default');
      assert.equal(await range.textContent(), '1–20 / 120 件');
      assert.equal(await range.getAttribute('aria-live'), 'polite');
      assert.equal(await previous.getAttribute('aria-disabled'), 'true', '先頭では前へを aria-disabled にする');
      assert.equal(await previous.evaluate((el) => el.disabled), false, 'disabled にはしない');
      assert.equal(await next.getAttribute('aria-disabled'), null);
      const pageButton = (number) => nav.getByRole('button', { name: `${number} ページ目`, exact: true });
      const numbers = () => nav.locator('li').evaluateAll((items) => items.map((item) => item.textContent.trim()).join(' '));
      assert.equal(await numbers(), '1 2 3 4 5 6', '6 ページなら全部の番号を出す');
      assert.equal(await pageButton(1).getAttribute('aria-current'), 'page', '現在ページに aria-current');
      assert.equal(await pageButton(2).getAttribute('aria-current'), null);
      // Tab は 前へ → 1〜6 → 次へ。端でも前へに到達できる。
      await page.keyboard.press('Tab');
      assert(await focused(previous), '最初の Tab は前へ');
      await page.keyboard.press('Enter');
      assert.equal(await range.textContent(), '1–20 / 120 件', '端では押しても動かない');
      for (let number = 1; number <= 6; number++) {
        await page.keyboard.press('Tab');
        assert(await focused(pageButton(number)), `Tab で ${number} ページ目へ`);
      }
      await page.keyboard.press('Tab');
      assert(await focused(next), '番号の次は次へ');
      await page.keyboard.press('Enter');
      assert.equal(await range.textContent(), '21–40 / 120 件', '次のページへ移る');
      assert(await focused(next), 'フォーカスはボタンに残る');
      assert.equal(await pageButton(2).getAttribute('aria-current'), 'page', '現在ページが移る');
      assert.equal(await previous.getAttribute('aria-disabled'), null, '2 ページ目からは前へ戻れる');
      await pageButton(4).focus();
      await page.keyboard.press('Enter');
      assert.equal(await range.textContent(), '61–80 / 120 件', '番号のページへ移る');
      assert(await focused(pageButton(4)), '押した番号にフォーカスが残る');
      await pageButton(4).click();
      assert.equal(await range.textContent(), '61–80 / 120 件', '現在ページを押しても動かない');
      // aria-disabled は Playwright では押せない扱いになるため force で押し、押下が無視されることを確かめる。
      for (let i = 0; i < 6; i++) await next.click({ force: true });
      assert.equal(await range.textContent(), '101–120 / 120 件', '末尾で止まる');
      assert.equal(await next.getAttribute('aria-disabled'), 'true', '末尾では次へを aria-disabled にする');
      assert(await focused(next), '末尾に着いてもフォーカスは消えない');
      const looks = await next.evaluate((el) => ({ color: getComputedStyle(el).color, cursor: getComputedStyle(el).cursor }));
      assert.equal(looks.cursor, 'not-allowed');
      // ホバーの面は番号の上に出て、aria-disabled の上では隠れる。
      const highlight = () => nav.locator('[data-hover-group]').evaluate((el) => el.style.getPropertyValue('--highlight-opacity'));
      await pageButton(2).hover();
      assert.equal(await highlight(), '1', '番号にホバーすると面が出る');
      await next.hover({ force: true });
      assert.equal(await highlight(), '0', 'aria-disabled の上では面を出さない');
      await previous.click();
      assert.equal(await range.textContent(), '81–100 / 120 件', '前のページへ戻る');
      await a11y();

      await story('many-pages');
      assert.equal(await numbers(), '1 2 3 4 5 6 7 … 32', '多いときは間を省略する');
      assert.equal(await nav.locator('li[aria-hidden="true"]').count(), 1, '省略記号は読ませない');
      await pageButton(7).click();
      assert.equal(await numbers(), '1 … 5 6 7 8 9 … 32', '現在ページの前後を出す');
      assert(await focused(pageButton(7)), '並びが変わってもフォーカスは押した番号に残る');
      await pageButton(32).click();
      assert.equal(await numbers(), '1 … 26 27 28 29 30 31 32');
      assert.equal(await next.getAttribute('aria-disabled'), 'true');
      await a11y();

      await story('fewer-siblings');
      assert.equal(await numbers(), '1 … 15 16 17 … 32', 'siblingCount で前後の数を変える');
      await a11y();

      await story('last-page');
      assert.equal(await range.textContent(), '101–120 / 120 件');
      assert.equal(await next.getAttribute('aria-disabled'), 'true');
      await a11y();

      await story('empty');
      assert.equal(await range.textContent(), '0 件', '0 件は範囲を出さない');
      assert.equal(await nav.locator('ul').count(), 0, '0 件は番号を出さない');
      assert.equal(await previous.getAttribute('aria-disabled'), 'true');
      assert.equal(await next.getAttribute('aria-disabled'), 'true');
      await a11y();

      await story('unknown-total');
      assert.equal(await range.count(), 0, '総件数が分からなければ範囲を出さない');
      assert.equal(await nav.locator('ul').count(), 0, '総件数が分からなければ番号を出さない');
      const output = page.locator('#storybook-root output');
      for (let i = 0; i < 5; i++) await next.click({ force: true });
      assert.equal(await output.textContent(), '4 ページ目', 'hasNext が false になったら止まる');
      assert.equal(await next.getAttribute('aria-disabled'), 'true');
      await a11y();

      await story('loading');
      assert.equal(await range.getAttribute('aria-busy'), 'true', '取得中は範囲に aria-busy');
      assert.equal(await previous.getAttribute('aria-disabled'), 'true', '取得中は前へも止める');
      assert.equal(await next.getAttribute('aria-disabled'), 'true', '取得中は次へも止める');
      assert.equal(await pageButton(3).getAttribute('aria-disabled'), 'true', '取得中は番号も止める');
      await a11y();

      await story('custom-format');
      assert.equal(await range.textContent(), '全 120 件中 21 件目から 40 件目', 'formatRange で文を差し替える');
      await a11y();

      assert.deepEqual(errors, []);
      await page.close();
      console.log(`${framework}: Pagination の範囲の文、ページ番号と省略、端と取得中の aria-disabled、フォーカスの維持、Tab の順、ホバーの面、axe を確認しました。`);
    }
  } finally {
    await browser?.close();
    server.kill();
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
