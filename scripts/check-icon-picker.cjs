// Run after pnpm build-storybook. See README for the external Playwright setup.
// ICON_PICKER_TEST_FRAMEWORK=vue などで片方だけを検証できる。
const assert = require('node:assert/strict');
const { spawn, execFileSync } = require('node:child_process');
const { copyFileSync, existsSync, mkdtempSync, rmSync, readFileSync, readdirSync, writeFileSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join, resolve } = require('node:path');
const { fileURLToPath, pathToFileURL } = require('node:url');

const root = resolve(__dirname, '..');
const compiled = mkdtempSync(join(tmpdir(), 'koyori-icon-picker-'));
process.on('exit', () => rmSync(compiled, { recursive: true, force: true }));
// icon-picker.ts は import.meta.url を使うので ES モジュールとして出し、データを隣に置く。
execFileSync(process.execPath, [require.resolve('typescript/bin/tsc'), '--ignoreConfig',
  '--module', 'esnext', '--target', 'ES2022', '--lib', 'ES2022,DOM', '--skipLibCheck', '--outDir', compiled,
  resolve(root, 'components/IconPicker/icon-picker.ts')], { stdio: 'inherit' });
writeFileSync(join(compiled, 'package.json'), '{"type":"module"}');
copyFileSync(resolve(root, 'components/IconPicker/emoji-data.json'), join(compiled, 'emoji-data.json'));
const EMOJI_DATA = JSON.parse(readFileSync(resolve(root, 'components/IconPicker/emoji-data.json'), 'utf8'));
const response = (status, json) => ({ ok: status >= 200 && status < 300, status, json: async () => json() });

(async () => {
  const {
    uniqueEmojis, emojiKey, normalizeEmojiQuery, buildEmojiCatalog, createEmojiLoader, fetchEmojiData, loadEmojiCatalog, emojiCatalog,
    emojiName, recommendedEntries, searchEmojis, pickerSections, nextCell, currentCell,
  } = await import(pathToFileURL(join(compiled, 'icon-picker.js')).href);

  // データ: 1,238 個を 7 つのカテゴリに。人と体・コンポーネント・旗は含めない。
  assert.deepEqual(EMOJI_DATA.map(([label]) => label), ['物と道具', '乗り物と場所', '活動', '動物と自然', '食べ物と飲み物', '記号', '顔と気持ち']);
  assert.deepEqual(EMOJI_DATA.map(([, rows]) => rows.length), [261, 218, 85, 157, 128, 223, 166]);
  const rows = EMOJI_DATA.flatMap(([, entries]) => entries);
  assert.equal(rows.length, 1238);
  assert.deepEqual(rows.filter(([, name]) => !name.trim()), [], '名前の無い絵文字は無い');
  assert.equal(new Set(rows.map(([emoji]) => emojiKey(emoji))).size, 1238, 'U+FE0F を除いても重複しない');
  assert.equal(rows.find(([emoji]) => emoji === '🚀')?.[1], 'ロケット');
  assert.equal(EMOJI_DATA[0][1][0][0], '👓', '「物と道具」は Unicode の並び（衣類の 👓）から');
  execFileSync(process.execPath, [resolve(root, 'scripts/build-emoji-data.mjs'), '--check'], { stdio: 'inherit' });

  assert.deepEqual(uniqueEmojis(['🌱', '📘', '🌱']), ['🌱', '📘'], '重複は最初の位置を残して除く');
  assert.deepEqual(uniqueEmojis(undefined), [], '未指定は空の一覧');
  assert.equal(emojiKey('🛠️'), '🛠', 'U+FE0F を除く');
  assert.equal(normalizeEmojiQuery(' ろけっと '), 'ロケット');
  assert.equal(normalizeEmojiQuery('ﾛｹｯﾄ'), 'ロケット');
  assert.equal(normalizeEmojiQuery('ＡＢＣ'), 'abc');

  // 読み込み前は名前を持たない。読み込み後は日本語の名前。
  assert.equal(emojiCatalog(), null);
  assert.equal(emojiName('🚀'), '🚀', '読み込み前は絵文字そのもの');
  // Node は file: を fetch できないので、fetch を差し替えて icon-picker.js の隣の emoji-data.json を読ませる。
  const fetched = [];
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    fetched.push(String(url));
    return response(200, () => JSON.parse(readFileSync(fileURLToPath(url), 'utf8')));
  };
  const catalog = await loadEmojiCatalog();
  assert.equal(emojiCatalog(), catalog, '成功した結果は残す');
  assert.equal(await loadEmojiCatalog(), catalog, '2 回目は同じ結果');
  globalThis.fetch = realFetch;
  assert.deepEqual(fetched, [pathToFileURL(join(compiled, 'emoji-data.json')).href], 'モジュールの隣の emoji-data.json を 1 回だけ取りに行く');
  assert.equal(emojiName('🚀'), 'ロケット');
  assert.equal(emojiName('🛠'), 'ハンマーとレンチ', 'U+FE0F の有無が違っても名前を引ける');

  const search = (query) => searchEmojis(catalog.sections, query).map((item) => item.emoji);
  for (const query of ['ロケット', 'ろけっと', 'ﾛｹｯﾄ']) assert(search(query).includes('🚀'), `「${query}」で 🚀 が出る`);
  assert(search('宇宙').includes('🚀'), 'タグでも出る');
  assert.deepEqual(search(''), [], '空は 0 件');
  assert.deepEqual(search('   '), [], '空白だけは 0 件');
  assert.deepEqual(search('存在しない語ぴよ'), [], '無い語は 0 件');

  const recommended = recommendedEntries(['🚀', '🛠', '🛠️', '🧑‍🚀', '🇯🇵', '🚀']);
  assert.deepEqual(recommended.map((item) => item.emoji), ['🚀', '🛠', '🧑‍🚀', '🇯🇵'], '重複を除く（U+FE0F の有無も同じとみなす）');
  assert.deepEqual(recommended.map((item) => item.name), ['ロケット', 'ハンマーとレンチ', '🧑‍🚀', '🇯🇵'], 'データに無い絵文字は名前が絵文字そのもの');
  assert.deepEqual(recommendedEntries(undefined), []);

  // 節の組み立て。検索中は 1 節にまとめ、おすすめとカテゴリの重複を除く。
  const sections = pickerSections(['🚀', '📘'], '', catalog);
  assert.deepEqual(sections.slice(0, 2).map((section) => [section.label, section.start]), [['おすすめ', 0], ['物と道具', 2]]);
  assert.equal(sections.length, 8);
  assert.deepEqual(pickerSections(undefined, '', null), [], '候補も読み込みも無ければ節は無い');
  const found = pickerSections(['🚀'], 'ろけっと', catalog);
  assert.deepEqual(found.map((section) => section.label), ['検索結果']);
  assert.deepEqual(found[0].entries.map((item) => item.emoji), ['🚀'], 'おすすめとカテゴリの両方にあっても 1 つ');
  assert.deepEqual(pickerSections(['🚀'], 'ぴよぴよ', catalog), [], '0 件なら節を出さない');
  // 同じ配列をその場で書き換えても、おすすめに反映する。
  const mutable = ['🚀'];
  assert.deepEqual(pickerSections(mutable, '', catalog)[0].entries.map((item) => item.emoji), ['🚀']);
  mutable.unshift('📘');
  assert.deepEqual(pickerSections(mutable, '', catalog)[0].entries.map((item) => item.emoji), ['📘', '🚀'], '同じ配列への追加を反映する');

  // 失敗を持ち越さない。同時の呼び出しは 1 回の読み込みを共有する。
  let calls = 0;
  let fail = true;
  const loader = createEmojiLoader(async () => {
    calls++;
    if (fail) throw new Error('offline');
    return EMOJI_DATA;
  });
  await assert.rejects(loader.load(), /offline/);
  assert.equal(loader.current(), null);
  fail = false;
  const [first, second] = await Promise.all([loader.load(), loader.load()]);
  assert.equal(first, second);
  assert.equal(calls, 2, '失敗の次は読み直し、同時の 2 回は 1 回だけ読む');
  assert.equal(first.sections.reduce((sum, section) => sum + section.entries.length, 0), 1238);
  assert.equal(buildEmojiCatalog([['a', [['🚀', 'ロケット', '宇宙 発射']]]]).byKey.get('🚀').search, 'ロケット\n宇宙\n発射');

  // fetch は 404 や HTML（SPA の fallback）でも解決するので、どれも失敗にする。
  const html = () => { throw new SyntaxError("Unexpected token '<'"); };
  await assert.rejects(fetchEmojiData('x.json', async () => response(404, () => EMOJI_DATA)), /HTTP 404/, '404 は失敗');
  await assert.rejects(fetchEmojiData('x.json', async () => response(500, () => EMOJI_DATA)), /HTTP 500/, '500 は失敗');
  await assert.rejects(fetchEmojiData('x.json', async () => response(200, html)), SyntaxError, 'JSON でない本文は失敗');
  await assert.rejects(fetchEmojiData('x.json', async () => response(200, () => ({ data: EMOJI_DATA }))), /形が違います/, '配列でない JSON は失敗');
  assert.equal(await fetchEmojiData('x.json', async () => response(200, () => EMOJI_DATA)), EMOJI_DATA, '正常なら配列を返す');
  // 失敗の次の呼び出しは、新しい要求を出して読み直す。
  const statuses = [404, 200];
  const requested = [];
  const fetchLoader = createEmojiLoader(() => fetchEmojiData('emoji-data.json', async (url) => {
    requested.push(url);
    return response(statuses.shift(), () => EMOJI_DATA);
  }));
  await assert.rejects(fetchLoader.load(), /HTTP 404/);
  assert.equal(fetchLoader.current(), null, '失敗は持ち越さない');
  assert.equal((await fetchLoader.load()).sections.reduce((sum, section) => sum + section.entries.length, 0), 1238);
  assert.deepEqual(requested, ['emoji-data.json', 'emoji-data.json'], '再試行で fetch をもう一度呼ぶ');

  // 節が [8, 20, 3]・8 列: 0-7 / 8-15 16-23 24-27 / 28-30
  const sizes = [8, 20, 3];
  assert.equal(nextCell(sizes, 0, 'ArrowRight', 8), 1);
  assert.equal(nextCell(sizes, 7, 'ArrowRight', 8), 8, '節をまたいで次へ');
  assert.equal(nextCell(sizes, 8, 'ArrowLeft', 8), 7, '節をまたいで前へ');
  assert.equal(nextCell(sizes, 0, 'ArrowLeft', 8), 0, '先頭で止まる');
  assert.equal(nextCell(sizes, 30, 'ArrowRight', 8), 30, '末尾で止まる');
  assert.equal(nextCell(sizes, 3, 'ArrowDown', 8), 11, '下の行が無ければ次の節の最初の行の同じ列');
  assert.equal(nextCell(sizes, 11, 'ArrowUp', 8), 3, '上の行が無ければ前の節の最後の行の同じ列');
  assert.equal(nextCell(sizes, 9, 'ArrowDown', 8), 17);
  assert.equal(nextCell(sizes, 22, 'ArrowDown', 8), 27, '下の行が短ければその行の末尾');
  assert.equal(nextCell(sizes, 21, 'ArrowDown', 8), 27);
  assert.equal(nextCell(sizes, 26, 'ArrowDown', 8), 30, '次の節の列が足りなければ末尾');
  assert.equal(nextCell(sizes, 29, 'ArrowUp', 8), 25, '前の節の最後の行（短い行）の同じ列');
  assert.equal(nextCell(sizes, 30, 'ArrowDown', 8), 30, '次の節が無ければ止まる');
  assert.equal(nextCell(sizes, 2, 'ArrowUp', 8), 2, '前の節が無ければ止まる');
  assert.equal(nextCell(sizes, 19, 'Home', 8), 16, 'Home はその行の先頭');
  assert.equal(nextCell(sizes, 25, 'End', 8), 27, 'End はその行の末尾（短い行）');
  assert.equal(nextCell(sizes, 19, 'Home', 8, true), 0, 'Ctrl+Home は全体の先頭');
  assert.equal(nextCell(sizes, 3, 'End', 8, true), 30, 'Ctrl+End は全体の末尾');
  assert.equal(nextCell(sizes, 5, 'Enter', 8), 5, '扱わないキーは動かさない');
  assert.equal(nextCell([0, 0], 0, 'ArrowRight', 8), -1, 'セルが無ければ -1');
  assert.equal(nextCell([], 0, 'ArrowDown', 8), -1);
  assert.equal(nextCell([6], 2, 'ArrowDown', 0), 3, '列数が取れなければ 1 列');
  assert.equal(nextCell([3, 0, 2], 1, 'ArrowDown', 4), 4, '空の節は飛ばす');

  // 突き合わせ: 節ごとに行を並べた 2 次元の表から求めた答えと一致する。
  const reference = (sizes, index, key, columns, toEdge) => {
    const step = columns >= 1 ? Math.floor(columns) : 1;
    const table = [];
    let offset = 0;
    for (const size of sizes) {
      const rowsOfSection = [];
      for (let i = 0; i < size; i += step) rowsOfSection.push(Array.from({ length: Math.min(step, size - i) }, (_, k) => offset + i + k));
      table.push(rowsOfSection);
      offset += size;
    }
    if (offset === 0) return -1;
    const current = Math.min(Math.max(index, 0), offset - 1);
    let s = 0; let r = 0; let c = 0;
    table.forEach((section, si) => section.forEach((row, ri) => { const ci = row.indexOf(current); if (ci >= 0) { s = si; r = ri; c = ci; } }));
    const pick = (row, column) => row[Math.min(column, row.length - 1)];
    if (key === 'ArrowLeft') return Math.max(current - 1, 0);
    if (key === 'ArrowRight') return Math.min(current + 1, offset - 1);
    if (key === 'Home') return toEdge ? 0 : table[s][r][0];
    if (key === 'End') return toEdge ? offset - 1 : table[s][r].at(-1);
    if (key === 'ArrowDown') {
      if (table[s][r + 1]) return pick(table[s][r + 1], c);
      const next = table.slice(s + 1).find((section) => section.length);
      return next ? pick(next[0], c) : current;
    }
    if (key === 'ArrowUp') {
      if (r > 0) return pick(table[s][r - 1], c);
      const previous = table.slice(0, s).reverse().find((section) => section.length);
      return previous ? pick(previous.at(-1), c) : current;
    }
    return index;
  };
  let seed = 20260601;
  const random = (n) => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed % n; };
  const keys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'];
  for (let i = 0; i < 2000; i++) {
    const randomSizes = Array.from({ length: 1 + random(6) }, () => random(31));
    const total = randomSizes.reduce((a, b) => a + b, 0);
    const columns = 1 + random(10);
    const index = total ? random(total) : 0;
    const key = keys[random(keys.length)];
    const toEdge = random(4) === 0;
    assert.equal(nextCell(randomSizes, index, key, columns, toEdge), reference(randomSizes, index, key, columns, toEdge),
      `nextCell(${JSON.stringify(randomSizes)}, ${index}, ${key}, ${columns}, ${toEdge})`);
  }

  // Tab で届くセル。移動していなければ現在の絵文字が最初に出る位置、移動後はその位置。
  const items = ['🌱', '📘', '🛠️'].map((emoji) => ({ emoji }));
  assert.equal(currentCell(-1, items, '📘', undefined), 1, '現在の絵文字が入口');
  assert.equal(currentCell(-1, items, '🛠', undefined), 2, 'U+FE0F の有無が違っても同じ絵文字');
  assert.equal(currentCell(-1, items, '🍎', undefined), 0, '並びに無い絵文字なら先頭');
  assert.equal(currentCell(-1, items, '📘', 'icon.png'), 0, '画像のときは先頭');
  assert.equal(currentCell(2, items, '📘', undefined), 2, '移動したあとはその位置');
  assert.equal(currentCell(5, items, '📘', undefined), 2, 'セルが減ったら末尾に寄せ、入口を残す');
  assert.equal(currentCell(5, [], undefined, undefined), -1, 'セルが無ければ入口も無い');

  const read = (path) => readFileSync(resolve(root, path), 'utf8');
  for (const [name, path] of [['Vue', 'packages/vue/src/generated/components/IconPicker/IconPicker.vue'], ['React', 'packages/react/src/generated/components/IconPicker/IconPicker.tsx']]) {
    const source = read(path);
    assert.match(source, /aria-haspopup="dialog"/, `${name} 版のトリガーはダイアログを開く`);
    assert.match(source, /role="dialog"/, `${name} 版のパネルはダイアログ`);
    assert.match(source, /aria-pressed/, `${name} 版は選択中のセルを伝える`);
    assert.match(source, /type="file"/, `${name} 版に画像の入力欄がある`);
    assert.match(source, /nextCell/, `${name} 版も同じ移動の計算を通す`);
  }
  for (const framework of ['vue', 'react']) {
    const generated = `packages/${framework}/src/generated/components/IconPicker`;
    assert(read(`${generated}/icon-picker.ts`).includes("new URL('./emoji-data.json', import.meta.url)"), `${framework} 版はデータを fetch で遅延読み込みする`);
    assert.equal(read(`${generated}/emoji-data.json`), read('components/IconPicker/emoji-data.json'), `${framework} 版の隣にデータがある`);
    // 配布物: 式は利用側のバンドラーが解決するので、そのまま 1 つだけ残し、データは埋め込まず別のファイルで出す。
    assert(existsSync(resolve(root, `packages/${framework}/dist/index.js`)), `packages/${framework}/dist が無い。pnpm --filter './packages/*' build の後に回す`);
    const bundle = read(`packages/${framework}/dist/index.js`);
    assert.equal(bundle.split('new URL("./emoji-data.json", import.meta.url)').length - 1, 1, `${framework} の index.js に式がそのまま 1 つ`);
    assert(!bundle.includes('data:application/json'), `${framework} の index.js にデータを埋め込まない`);
    const shipped = JSON.parse(read(`packages/${framework}/dist/emoji-data.json`));
    assert.equal(shipped.flatMap(([, entries]) => entries).length, 1238, `${framework} の dist/emoji-data.json は 1,238 個`);
  }
  console.log('IconPicker のデータ・検索・読み込み・キー移動、生成物を確認しました。');

  const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
  const port = process.env.ICON_PICKER_TEST_PORT || '16328';
  const base = `http://127.0.0.1:${port}`;
  const server = spawn('python3', ['-u', '-m', 'http.server', port, '--bind', '127.0.0.1', '--directory', root], { stdio: ['ignore', 'pipe', 'pipe'] });
  let browser;
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

    const frameworks = ['react', 'vue'].filter((name) => !process.env.ICON_PICKER_TEST_FRAMEWORK || name === process.env.ICON_PICKER_TEST_FRAMEWORK);
    assert(frameworks.length, 'ICON_PICKER_TEST_FRAMEWORK は vue か react');
    for (const framework of frameworks) {
      const page = await browser.newPage({ viewport: { width: 800, height: 700 } });
      const errors = [];
      let failing = false;
      page.on('pageerror', (error) => errors.push(error.message));
      page.on('console', (message) => {
        // 読み込み失敗の Story はわざと 404 を起こす。失敗の検査でわざと落とした要求も数えない。
        if (message.type() !== 'error' || message.location()?.url?.includes('koyori-missing-icon') || failing) return;
        errors.push(message.text());
      });
      const trigger = page.getByRole('button', { name: /^プロジェクトのアイコン: / });
      const dialog = page.getByRole('dialog', { name: 'プロジェクトのアイコン' });
      const cells = dialog.locator('[data-cell]');
      const scroll = dialog.locator('[data-hover-group]:has([data-cell])');
      const story = async (name) => {
        await page.goto(`${base}/packages/${framework}/storybook-static/iframe.html?id=components-iconpicker--${name}&viewMode=story`);
        await trigger.waitFor();
      };
      const a11y = async () => {
        // Keep our instance separate from the addon, which may replace window.axe.
        await page.addScriptTag({ content: `${axeSource}\nwindow.iconPickerAxe = window.axe;` });
        const violations = await page.evaluate(async () => (await window.iconPickerAxe.run(document.querySelector('#storybook-root'))).violations.map((v) => ({ id: v.id, targets: v.nodes.map((n) => n.target) })));
        assert.deepEqual(violations, []);
      };
      const triggerName = () => trigger.getAttribute('aria-label');
      const focused = () => page.evaluate(() => document.activeElement?.getAttribute('aria-label') ?? document.activeElement?.textContent?.trim());
      const focusedCell = () => page.evaluate(() => Array.from(document.querySelectorAll('[data-cell]')).indexOf(document.activeElement));
      const open = async (count = 6 + 1238) => {
        await trigger.click();
        await dialog.waitFor();
        await page.waitForFunction((expected) => document.querySelectorAll('[data-cell]').length === expected, count, { timeout: 5000 })
          .catch(async () => { throw new Error(`${framework}: セルが ${count} 個にならない（${await cells.count()} 個）`); });
      };
      const closed = async (message) => {
        await dialog.waitFor({ state: 'hidden', timeout: 2000 }).catch(() => { throw new Error(`${framework}: ${message}`); });
        assert.equal(await trigger.getAttribute('aria-expanded'), 'false');
      };
      const waitHighlight = (value, message) => page.waitForFunction(
        (expected) => [...document.querySelectorAll('[data-hover-group]')].find((el) => el.querySelector('[data-cell]'))?.style.getPropertyValue('--highlight-opacity') === expected,
        value, { timeout: 2000 },
      ).catch(() => { throw new Error(`${framework}: ${message}`); });

      // 閉じているときは 40px のボタンだけ。名前は読み込み前なので絵文字そのもの。
      await story('default');
      const box = await trigger.boundingBox();
      assert.deepEqual([box.width, box.height], [40, 40]);
      assert.equal(await triggerName(), 'プロジェクトのアイコン: 📘');
      assert.equal(await trigger.getAttribute('aria-haspopup'), 'dialog');
      assert.equal(await trigger.getAttribute('aria-expanded'), 'false');
      assert.equal(await dialog.count(), 0, '閉じている間はパネルを出さない');
      await a11y();

      // 開くと「おすすめ」6 個と 1,238 個が並び、検索欄にフォーカスが移る。
      await open();
      assert.equal(await trigger.getAttribute('aria-expanded'), 'true');
      assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('aria-label')), '絵文字を検索');
      assert.deepEqual(await dialog.getByRole('group').evaluateAll((groups) => groups.slice(0, 3).map((group) => group.getAttribute('aria-labelledby') && document.getElementById(group.getAttribute('aria-labelledby')).textContent)), ['おすすめ', '物と道具', '乗り物と場所']);
      assert.equal(await dialog.getByRole('button', { name: 'ロケット', exact: true }).count(), 2, 'おすすめとカテゴリの両方に日本語の名前で出る');
      assert.deepEqual(await cells.evaluateAll((buttons) => buttons.filter((button) => button.getAttribute('aria-pressed') === 'true').map((button) => button.getAttribute('aria-label'))), ['青の本', '青の本'], '選択中の絵文字');
      assert.equal(await cells.evaluateAll((buttons) => buttons.filter((button) => button.tabIndex === 0).length), 1, 'Tab で届くセルは 1 つ');
      assert.equal(await scroll.evaluate((el) => getComputedStyle(el.querySelector('[data-grid]')).gridTemplateColumns.split(' ').length), 8, '8 列');
      await a11y();
      await dialog.getByRole('button', { name: 'ロケット', exact: true }).first().click();
      await closed('選ぶと閉じる');
      assert.equal(await focused(), 'プロジェクトのアイコン: ロケット', '閉じたらトリガーへフォーカスを戻し、名前は日本語になる');

      // 検索。ひらがなでもカタカナの名前に当たり、件数を知らせる。Enter で先頭を選ぶ。
      await trigger.click();
      await dialog.waitFor();
      await page.keyboard.type('ろけっと');
      await page.waitForFunction(() => document.querySelectorAll('[data-cell]').length === 1);
      assert.equal(await cells.first().getAttribute('aria-label'), 'ロケット');
      assert.equal(await dialog.locator('[aria-live="polite"]').textContent(), '検索結果 1 件');
      await page.keyboard.press('Enter');
      await closed('Enter で先頭を選ぶと閉じる');
      assert.equal(await triggerName(), 'プロジェクトのアイコン: ロケット');
      await trigger.click();
      await dialog.waitFor();
      assert.equal(await dialog.getByRole('searchbox').inputValue(), '', '閉じたら検索語を戻す');
      await page.keyboard.type('ぴよぴよぴよ');
      await dialog.getByText('見つかりませんでした').waitFor();
      assert.equal(await dialog.locator('[aria-live="polite"]').textContent(), '検索結果 0 件');
      await page.keyboard.press('Escape');
      await closed('Escape で閉じる');
      assert.equal(await focused(), 'プロジェクトのアイコン: ロケット', 'Escape はトリガーへ戻す');

      // キー操作。検索欄の ↓ で選択中のセルへ入り、節をまたいで動く。
      await open();
      await page.keyboard.press('ArrowDown');
      assert.equal(await focusedCell(), 4, '選択中の 🚀（おすすめの 5 番目）へ入る');
      await page.keyboard.press('ArrowRight');
      assert.equal(await focused(), '試験管');
      await page.keyboard.press('ArrowRight');
      assert.equal(await focusedCell(), 6, '節をまたいで次へ');
      await page.keyboard.press('ArrowLeft');
      await page.keyboard.press('Home');
      assert.equal(await focusedCell(), 0);
      await page.keyboard.press('End');
      assert.equal(await focusedCell(), 5, 'End は行の末尾（短い行）');
      await page.keyboard.press('ArrowDown');
      assert.equal(await focusedCell(), 11, '↓ で次の節の最初の行の同じ列へ');
      await page.keyboard.press('ArrowDown');
      assert.equal(await focusedCell(), 19);
      await page.keyboard.press('ArrowUp');
      await page.keyboard.press('ArrowUp');
      assert.equal(await focusedCell(), 5, '↑ で前の節の最後の行へ');
      await page.keyboard.press('Control+End');
      assert.equal(await focusedCell(), 6 + 1238 - 1);
      await page.keyboard.press('Control+Home');
      assert.equal(await focusedCell(), 0);
      assert.equal(await cells.evaluateAll((buttons) => buttons.filter((button) => button.tabIndex === 0).length), 1, '移動しても Tab で届くのは 1 つ');
      assert.equal(await cells.first().getAttribute('tabindex'), '0', '移動先が Tab の入口');

      // ハイライト: スクロールした後のセルにホバーして、帯がセルと重なる。外へ出ると消える。
      // キーボードで動かしたセルにも帯が付くので、フォーカスは検索欄へ戻しておく。
      await dialog.getByRole('searchbox').focus();
      await scroll.evaluate((el) => { el.scrollTop = 600; });
      const target = cells.nth(120);
      await target.scrollIntoViewIfNeeded();
      await target.hover();
      await waitHighlight('1', 'ホバーしたセルにハイライトが付く');
      await page.waitForFunction((index) => {
        const cell = document.querySelectorAll('[data-cell]')[index].getBoundingClientRect();
        const band = cell && document.querySelectorAll('[data-cell]')[index].closest('[data-hover-group]').querySelector('[data-hover-highlight]').getBoundingClientRect();
        return Math.abs(band.top - cell.top) < 1 && Math.abs(band.left - cell.left) < 1 && Math.abs(band.width - cell.width) < 1;
      }, 120, { timeout: 2000 }).catch(() => { throw new Error(`${framework}: スクロール後もハイライトの帯がセルと重なる`); });
      await page.mouse.move(790, 10);
      await waitHighlight('0', 'セルの外へ出たらハイライトを消す');

      // 外側を押すと閉じ、フォーカスは戻さない。
      await page.mouse.click(790, 690);
      await closed('外側を押すと閉じる');
      assert.notEqual(await focused(), 'プロジェクトのアイコン: ロケット', '外側の押下ではトリガーへ戻さない');

      // なしにする: 閉じて onClear を呼び、トリガーは「未設定」。値が無ければ押せない。
      await open();
      await dialog.getByRole('button', { name: 'なしにする', exact: true }).click();
      await closed('なしにすると閉じる');
      assert.equal(await focused(), 'プロジェクトのアイコン: 未設定');
      assert.equal(await trigger.innerText(), '＋');
      await open(6 + 1238);
      assert(await dialog.getByRole('button', { name: 'なしにする', exact: true }).isDisabled(), '値が無ければ押せない');
      await page.keyboard.press('Escape');
      await closed('Escape で閉じる');
      assert.equal(await page.getByText('なしにする').count(), 0, '閉じたらパネルの中身を描かない');

      await story('unset');
      assert.equal(await triggerName(), 'プロジェクトのアイコン: 未設定');
      assert.equal(await trigger.innerText(), '＋');
      await open();
      assert(await dialog.getByRole('button', { name: 'なしにする', exact: true }).isDisabled());
      assert.equal(await cells.evaluateAll((buttons) => buttons.findIndex((button) => button.tabIndex === 0)), 0, '選択が無ければ先頭が入口');
      await a11y();

      // 読み込みの失敗: おすすめは選べる。「もう一度読み込む」で読み直す。
      failing = true;
      let dataRequests = 0;
      const countData = (request) => { if (/emoji-data/.test(request.url())) dataRequests++; };
      page.on('request', countData);
      await page.route(/emoji-data/, (route) => route.abort());
      await story('default');
      await trigger.click();
      await dialog.getByRole('alert').waitFor();
      assert.equal(await dialog.getByRole('alert').getByText('絵文字を読み込めませんでした').count(), 1);
      assert.equal(await cells.count(), 6, 'おすすめは出たまま');
      await a11y();
      // 検索中も失敗を伝え、カタログを探せていないので 0 件とは言わない。
      const search = dialog.getByRole('searchbox', { name: '絵文字を検索' });
      await search.fill('ねこ');
      await page.waitForFunction(() => document.querySelectorAll('[data-cell]').length === 0);
      assert.equal(await dialog.getByRole('alert').getByText('絵文字を読み込めませんでした').count(), 1, '検索中も失敗を出す');
      assert.equal(await dialog.getByText('見つかりませんでした').count(), 0);
      assert.equal(await dialog.locator('[aria-live="polite"]').textContent(), '', '件数を読み上げない');
      await search.fill('');
      await page.waitForFunction(() => document.querySelectorAll('[data-cell]').length === 6);
      // 再試行は新しい要求を出す。同じ文書のまま読み込め、パネルは閉じず、フォーカスもパネルの中に残る。
      assert.equal(dataRequests, 1);
      await page.unroute(/emoji-data/);
      await dialog.getByRole('button', { name: 'もう一度読み込む', exact: true }).click();
      assert.equal(await focused(), '絵文字を検索', 'ボタンが消える前に検索欄へ移す');
      await page.waitForFunction(() => document.querySelectorAll('[data-cell]').length === 6 + 1238, null, { timeout: 5000 })
        .catch(async () => { throw new Error(`${framework}: 再試行で読み込めない（${await cells.count()} 個）`); });
      assert.equal(await dialog.getByRole('alert').count(), 0, '読み込めたら失敗の表示を消す');
      assert.equal(await dialog.isVisible(), true, '再試行でパネルは閉じない');
      assert.equal(dataRequests, 2, '再試行でデータをもう一度取りに行く');
      await page.keyboard.press('Escape');
      await closed('Escape で閉じる');

      // 再試行を押さず、閉じて開き直しても読み直す。
      dataRequests = 0;
      await page.route(/emoji-data/, (route) => route.abort());
      await story('default');
      await trigger.click();
      await dialog.getByRole('alert').waitFor();
      await page.unroute(/emoji-data/);
      await page.keyboard.press('Escape');
      await closed('Escape で閉じる');
      await open();
      assert.equal(dataRequests, 2, '開き直すとデータをもう一度取りに行く');
      await page.keyboard.press('Escape');
      await closed('Escape で閉じる');

      // fetch は 404 でも解決する。本文が読める JSON でも、HTTP のエラーは失敗として伝える。
      await page.route(/emoji-data/, (route) => route.fulfill({ status: 404, contentType: 'application/json', body: '[]' }));
      await story('default');
      await trigger.click();
      await dialog.getByRole('alert').waitFor();
      assert.equal(await cells.count(), 6, '404 でもおすすめは出たまま');
      await page.unroute(/emoji-data/);
      page.off('request', countData);
      failing = false;

      // 画像があるときは画像タブで開く。外すと絵文字の表示に戻り、パネルは開いたまま。
      await story('with-image');
      assert.equal(await triggerName(), 'プロジェクトのアイコン: 画像');
      assert.equal(await trigger.locator('img').count(), 1);
      await trigger.click();
      await dialog.waitFor();
      assert.equal(await dialog.getByRole('tab', { name: '画像', exact: true }).getAttribute('aria-selected'), 'true');
      assert.equal(await focused(), '画像を変更', '画像タブでは最初のボタンへ');
      assert.equal(await dialog.getByText('PNG か JPEG で、正方形に切り抜いて表示します').count(), 1);
      await a11y();
      // タブは ← → でフォーカスだけ移り、Enter で切り替える。
      await dialog.getByRole('tab', { name: '画像', exact: true }).focus();
      await page.keyboard.press('ArrowLeft');
      assert.equal(await focused(), '絵文字');
      assert.equal(await dialog.getByRole('tab', { name: '絵文字', exact: true }).getAttribute('aria-selected'), 'false');
      await page.keyboard.press('Enter');
      assert.equal(await dialog.getByRole('tab', { name: '絵文字', exact: true }).getAttribute('aria-selected'), 'true');
      assert.equal(await dialog.getByRole('searchbox').isVisible(), true);
      await dialog.getByRole('tab', { name: '画像', exact: true }).click();
      await dialog.getByRole('button', { name: '画像を外す', exact: true }).click();
      await page.waitForFunction(() => !document.querySelector('[aria-haspopup="dialog"] img'));
      assert.equal(await triggerName(), 'プロジェクトのアイコン: 青の本', '外すと絵文字の表示に戻る');
      assert.equal(await dialog.isVisible(), true, '外してもパネルは開いたまま');
      assert.equal(await focused(), '画像を選ぶ', 'フォーカスは「画像を選ぶ」へ');
      assert.equal(await dialog.getByRole('button', { name: '画像を外す', exact: true }).count(), 0);

      // ファイルはボタンから選ぶ。入力欄は Tab にも読み上げにも出さず、通知の後に値を空へ戻す。
      const file = page.locator('input[type="file"]');
      assert.equal(await file.getAttribute('accept'), 'image/*');
      assert.equal(await file.getAttribute('aria-hidden'), 'true');
      assert.equal(await file.evaluate((el) => el.tabIndex), -1);
      await file.setInputFiles({ name: 'icon.png', mimeType: 'image/png', buffer: Buffer.from('89504e470d0a1a0a', 'hex') });
      await page.waitForFunction(() => document.querySelector('output')?.textContent === 'icon.png / image/png');
      assert.equal(await file.inputValue(), '', '同じファイルをもう一度選べるよう値を戻す');
      assert.equal(await triggerName(), 'プロジェクトのアイコン: 画像');

      // 壊れた URL では status で知らせ、トリガーは絵文字へ戻す。
      await story('image-error');
      await page.waitForFunction(() => document.querySelector('[role="status"]')?.textContent === '画像を読み込めませんでした');
      assert.equal(await triggerName(), 'プロジェクトのアイコン: 📘');
      assert.equal(await trigger.locator('img').count(), 0);
      assert.equal(await trigger.innerText(), '📘');
      await a11y();

      await story('disabled');
      assert(await trigger.isDisabled());
      await trigger.click({ force: true });
      assert.equal(await dialog.count(), 0, '無効なら開かない');
      await a11y();

      // 画像を受け取らない利用側にはタブも入力欄も画像のボタンも出さず、絵文字は選べる。
      await story('emoji-only');
      assert.equal(await page.locator('input[type="file"]').count(), 0);
      await open();
      assert.equal(await dialog.getByRole('tablist').count(), 0);
      assert.equal(await dialog.getByRole('tabpanel').count(), 0);
      assert.equal(await dialog.getByRole('button', { name: /^画像を/ }).count(), 0);
      assert.equal(await dialog.getByRole('button', { name: 'なしにする', exact: true }).count(), 1);
      await a11y();
      await dialog.getByRole('button', { name: 'ハンマーとレンチ', exact: true }).first().click();
      await closed('選ぶと閉じる');
      assert.equal(await triggerName(), 'プロジェクトのアイコン: ハンマーとレンチ');

      assert.deepEqual(errors, []);
      await page.close();
      console.log(`${framework}: IconPicker の開閉、名前、検索、roving tabindex と矢印・Home/End、ハイライト、なしにする、読み込みの失敗と再試行、画像タブ、ファイル選択、画像の読み込み失敗、無効、axe を確認しました。`);
    }
  } finally {
    await browser?.close();
    server.kill();
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
