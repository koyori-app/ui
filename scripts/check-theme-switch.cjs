// ThemeSwitch（太陽と月のスイッチ）の検査。
//   pnpm generate && pnpm --filter './packages/*' build
//   node scripts/check-theme-switch.cjs
// A（生成物とソースの CSS）・B（配布物とサーバー描画）はブラウザー不要で、CI（.github/workflows/check.yml）でも走る。
// C（ブラウザー）は storybook-static が両方にあるときだけ走る（pnpm -r build-storybook のあと）。
//   PLAYWRIGHT_MODULE=<playwright の場所> node scripts/check-theme-switch.cjs
const assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const { existsSync, readFileSync, readdirSync } = require('node:fs');
const { spawn } = require('node:child_process');
const { resolve } = require('node:path');
const { pathToFileURL } = require('node:url');

const root = resolve(__dirname, '..');
const read = (path) => readFileSync(resolve(root, path), 'utf8');

// ---------- A. 生成物とソースの CSS ----------

for (const [name, path] of [['Vue', 'packages/vue/src/generated/components/ThemeSwitch/ThemeSwitch.vue'], ['React', 'packages/react/src/generated/components/ThemeSwitch/ThemeSwitch.tsx']]) {
  const source = read(path);
  assert.match(source, /role="switch"/, `${name} 版はスイッチとして読み上げられる`);
  assert.match(source, /aria-checked/, `${name} 版は入切を伝える`);
  assert.match(source, /aria-label/, `${name} 版は読み上げ名を受け取る`);
  assert.match(source, /from ["']\.\.\/ThemePicker\/theme["']/, `${name} 版は ThemePicker の setTheme で書き込む`);
  assert.match(source, /setTheme/, `${name} 版は setTheme を呼ぶ`);
  assert.match(source, /MutationObserver/, `${name} 版は html[data-theme] の変化を追う`);
  // state を theme と名付けると setter が setTheme になり、import した setTheme を覆い隠す。
  assert.doesNotMatch(source, /\[\s*\w+,\s*setTheme\s*\]/, `${name} 版で state の setter が setTheme を覆い隠さない`);
}

const css = read('components/ThemeSwitch/theme-switch.module.css');
// 状態の変化は transition だけで動かす（押し直しても途中から戻る）。キーフレームは星の瞬きだけ。
assert.equal((css.match(/@keyframes/g) ?? []).length, 1, 'キーフレームは星の瞬きの 1 つだけ');

const hexToRgb = (hex) => [1, 3, 5].map((index) => parseInt(hex.slice(index, index + 2), 16));
const linear = (channel) => {
  const value = channel / 255;
  return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
};
const luminance = ([red, green, blue]) => 0.2126 * linear(red) + 0.7152 * linear(green) + 0.0722 * linear(blue);
const contrast = (a, b) => {
  const [high, low] = [luminance(hexToRgb(a)), luminance(hexToRgb(b))].sort((x, y) => y - x);
  return (high + 0.05) / (low + 0.05);
};
const color = (name) => {
  const match = css.match(new RegExp(`--theme-switch-${name}:\\s*(#[0-9a-fA-F]{6})\\s*;`));
  assert(match, `--theme-switch-${name} を 6 桁の 16 進数で定義する`);
  return match[1];
};
// 太陽の黄は昼空の青に埋もれるので、濃い橙の縁取りで輪郭を出す。縁取りと昼空の両端が 3:1 以上。
for (const sky of ['day-top', 'day-bottom']) {
  assert.ok(contrast(color('sun-rim'), color(sky)) >= 3, `太陽の縁取りと昼空（${sky}）は 3:1 以上`);
}
for (const sky of ['night-top', 'night-bottom']) {
  assert.ok(contrast(color('moon'), color(sky)) >= 3, `月と夜空（${sky}）は 3:1 以上`);
}
// 縁取りは 1px。太いと太陽の周りが強く見える（UI-39）。夜は同じ太さの透明にして、遷移で線が太らないようにする。
assert.match(css, /box-shadow:\s*0 0 0 1px var\(--theme-switch-sun-rim\)/, '太陽の縁取りは昼のつまみの外側の 1px の線');
assert.match(css, /box-shadow:\s*0 0 0 1px transparent/, '夜のつまみは同じ太さの透明な線を持つ');
// トラックの枠（border-strong）と、置かれる面（surface / surface-raised）の対比。明暗の両方。
assert.match(css, /border: 1px solid var\(--koyori-color-border-strong\)/, 'トラックは 1px の border-strong の枠を持つ');
const tokens = read('components/tokens.css');
const [darkTokens, lightTokens] = [tokens.slice(0, tokens.indexOf("[data-theme='light']")), tokens.slice(tokens.indexOf("[data-theme='light']"))];
const token = (block, name) => {
  const match = block.match(new RegExp(`--koyori-color-${name}:\\s*(#[0-9a-fA-F]{6})\\s*;`));
  assert(match, `--koyori-color-${name} を tokens.css から読める`);
  return match[1];
};
for (const [scheme, block] of [['ダーク', darkTokens], ['ライト', lightTokens]]) {
  for (const surface of ['surface', 'surface-raised']) {
    assert.ok(contrast(token(block, 'border-strong'), token(block, surface)) >= 3, `トラックの枠と面（${scheme} / ${surface}）は 3:1 以上`);
  }
}

// ---------- B. 配布物（style.css・export・サーバー描画） ----------

const ssr = {};

async function distChecks() {
  const requireVue = createRequire(resolve(root, 'packages/vue/package.json'));
  const { createSSRApp } = requireVue('vue');
  const { renderToString } = requireVue('vue/server-renderer');
  const requireReact = createRequire(resolve(root, 'packages/react/package.json'));
  const { createElement } = requireReact('react');
  const { renderToStaticMarkup } = requireReact('react-dom/server');

  for (const name of ['document', 'window', 'matchMedia', 'localStorage']) assert.ok(!(name in globalThis), `サーバー描画の前に ${name} が無い`);
  const warnings = [];
  const warn = console.warn;
  console.warn = (...args) => { warnings.push(args.join(' ')); };
  try {
    for (const framework of ['vue', 'react']) {
      const ui = await import(pathToFileURL(resolve(root, `packages/${framework}/dist/index.js`)));
      const label = (text) => `${framework}: ${text}`;
      assert.ok(ui.ThemeSwitch, label('ThemeSwitch を export する'));

      const dist = read(`packages/${framework}/dist/style.css`);
      // 最小化で translateX(40px) は translate(40px) に書き換わる。どちらでも X 方向の移動だけ。
      assert.match(dist, /transform:translate(X)?\(40px\)/, label('つまみは transform だけで動く'));
      assert.match(dist, /\[data-theme=["']?light["']?\][^{}]*_thumb_[^{},]*\{[^}]*transform:none/, label('ライトではつまみが元の位置に戻る'));
      assert.match(dist, /prefers-reduced-motion[^@]*?_thumb_[^{]*\{[^}]*transition:none/i, label('動きを減らす設定で止める'));
      assert.match(dist, /forced-colors[^@]*?canvas/i, label('強制配色に対応する'));

      const props = { label: 'ダークテーマ' };
      ssr[framework] = framework === 'vue'
        ? await renderToString(createSSRApp(ui.ThemeSwitch, props))
        : renderToStaticMarkup(createElement(ui.ThemeSwitch, props));
      assert.match(ssr[framework], /role="switch"/, label('サーバー描画はスイッチを出す'));
      assert.match(ssr[framework], /aria-checked="true"/, label('サーバー描画は既定のダーク（入）で出す'));
      assert.match(ssr[framework], /aria-label="ダークテーマ"/, label('サーバー描画は読み上げ名を出す'));
    }
  } finally {
    console.warn = warn;
  }
  assert.deepEqual(warnings, [], 'サーバー描画で警告が出ない');
}

// ---------- C. ブラウザー ----------

async function browserChecks() {
  if (!['vue', 'react'].every((framework) => existsSync(resolve(root, `packages/${framework}/storybook-static/iframe.html`)))) {
    console.log('storybook-static がないため、ブラウザー検証は省きました（pnpm -r build-storybook のあとに再実行してください）。');
    return;
  }

  const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
  const port = process.env.THEME_SWITCH_TEST_PORT || '16346';
  const base = `http://127.0.0.1:${port}`;
  const server = spawn('python3', ['-u', '-m', 'http.server', port, '--bind', '127.0.0.1', '--directory', root], { stdio: ['ignore', 'pipe', 'pipe'] });
  let browser;
  try {
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

    const { themeScript } = await import(pathToFileURL(resolve(root, 'packages/vue/dist/index.js')));
    const NAMES = { light: 'ライト', dark: 'ダーク', system: 'システム' };
    const SPAN = 40; // つまみの移動量（px）

    for (const framework of ['react', 'vue']) {
      for (const colorScheme of ['light', 'dark']) {
        const other = colorScheme === 'light' ? 'dark' : 'light';
        const context = await browser.newContext({ viewport: { width: 800, height: 700 }, colorScheme });
        const page = await context.newPage();
        const errors = [];
        page.on('pageerror', (error) => errors.push(error.message));
        page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
        const at = `${framework} / OS ${colorScheme}`;
        const track = page.getByRole('switch', { name: 'ダークテーマ', exact: true });
        const picker = (name) => page.getByRole('button', { name: `テーマ: ${name}`, exact: true });
        const theme = () => page.evaluate(() => document.documentElement.dataset.theme);
        const kept = () => page.evaluate(() => localStorage.getItem('koyori-theme'));
        const checked = () => track.getAttribute('aria-checked');
        const story = async (name) => {
          await page.goto(`${base}/packages/${framework}/storybook-static/iframe.html?id=components-themeswitch--${name}&viewMode=story`);
          await track.waitFor();
        };
        // つまみの位置。遷移が終わるのを待ってから、枠と余白（4px）を除いた移動量を測る。
        const thumbX = async () => {
          await page.evaluate(() => Promise.all(document.getAnimations().filter((a) => a instanceof CSSTransition).map((a) => a.finished)));
          return page.evaluate(() => {
            const button = document.querySelector('[role="switch"]');
            return button.lastElementChild.getBoundingClientRect().left - button.getBoundingClientRect().left - 4;
          });
        };
        const atX = async (expected, text) => assert.ok(Math.abs((await thumbX()) - expected) < 0.5, `${at}: ${text}（つまみ x = ${expected}）`);
        const side = (value) => (value === 'dark' ? 'true' : 'false');
        const a11y = async () => {
          await page.addScriptTag({ content: `${axeSource}\nwindow.themeAxe = window.axe;` });
          const violations = await page.evaluate(async () => (await window.themeAxe.run(document.querySelector('#storybook-root'))).violations.map((v) => ({ id: v.id, targets: v.nodes.map((n) => n.target) })));
          assert.deepEqual(violations, [], `${at}: axe の違反が無い`);
        };
        const becomes = (value) => page.waitForFunction((expected) => document.querySelector('[role="switch"]').getAttribute('aria-checked') === expected, value);

        // story の表示。
        await story('light');
        assert.equal(await checked(), 'false', `${at}: Light は aria-checked=false`);
        await atX(0, 'Light は太陽（左）');
        const rim = () => track.evaluate((el) => ({ border: getComputedStyle(el).borderTopWidth, shadow: getComputedStyle(el.lastElementChild).boxShadow.split(') ')[0] }));
        assert.deepEqual(await rim(), { border: '1px', shadow: 'rgb(124, 52, 0' }, `${at}: 昼はトラックに 1px の枠、太陽に濃い橙の縁取り`);
        await a11y();
        await story('dark');
        assert.equal(await checked(), 'true', `${at}: Dark は aria-checked=true`);
        await atX(SPAN, 'Dark は月（右）');
        assert.deepEqual(await rim(), { border: '1px', shadow: 'rgba(0, 0, 0, 0' }, `${at}: 夜は月に縁取りが付かない`);
        await a11y();
        await story('default');
        assert.equal(await checked(), side(colorScheme), `${at}: Default は OS と同じ側`);
        await atX(colorScheme === 'dark' ? SPAN : 0, 'Default は OS と同じ側');
        assert.equal(await kept(), null, `${at}: Default は保持なし`);

        // 押す。
        await story('dark');
        await track.click();
        await becomes('false');
        assert.equal(await theme(), 'light', `${at}: 押すと data-theme が light`);
        assert.equal(await kept(), 'light', `${at}: 保持が light`);
        await picker('ライト').waitFor();
        await atX(0, '押すと太陽に移る');
        await track.click();
        await becomes('true');
        assert.equal(await theme(), 'dark', `${at}: もう一度押すと dark に戻る`);
        assert.equal(await kept(), 'dark', `${at}: 保持が dark`);
        await atX(SPAN, '押し直すと月に戻る');

        // キーボード。
        await story('dark');
        await page.keyboard.press('Tab');
        assert.ok(await track.evaluate((el) => el === document.activeElement), `${at}: Tab でスイッチに届く`);
        const outline = await track.evaluate((el) => { const s = getComputedStyle(el); return [s.outlineStyle, s.outlineWidth]; });
        assert.deepEqual(outline, ['solid', '2px'], `${at}: フォーカス中は 2px の輪が出る`);
        await page.keyboard.press('Space');
        await becomes('false');
        assert.equal(await theme(), 'light', `${at}: Space で切り替わる`);
        await page.keyboard.press('Enter');
        await becomes('true');
        assert.equal(await theme(), 'dark', `${at}: Enter で戻る`);

        // ThemePicker からの選択に追従する。
        await story('dark');
        await picker('ダーク').click();
        await page.getByRole('option', { name: 'ライト', exact: true }).click();
        await becomes('false');
        await atX(0, 'ThemePicker のライトで太陽に移る');
        await picker('ライト').click();
        await page.getByRole('option', { name: 'システム', exact: true }).click();
        await picker('システム').waitFor();
        await becomes(side(colorScheme));
        assert.equal(await kept(), null, `${at}: システムを選ぶと保持が消える`);

        // 外からの書き換え（Storybook のツールバーや Starlight と同じ経路）。
        await story('light');
        await page.evaluate(() => { document.documentElement.dataset.theme = 'dark'; });
        await becomes('true');
        await atX(SPAN, '外から dark に書くと月に移る');
        await page.evaluate(() => { document.documentElement.dataset.theme = 'light'; });
        await becomes('false');

        // OS の変化。themeScript が data-theme を付け直し、スイッチが追従する。押すと反対側に固定する。
        await story('default');
        await page.addScriptTag({ content: themeScript }); // アプリでは <head> の themeScript がこの役をする。
        await page.emulateMedia({ colorScheme: other });
        await becomes(side(other));
        await atX(other === 'dark' ? SPAN : 0, 'OS の変化に追従する');
        await track.click();
        await becomes(side(colorScheme));
        assert.equal(await kept(), colorScheme, `${at}: 押すと反対側に固定され保持される`);

        // 押し直し。途中で押し直しても、元の側に収まる。
        await page.emulateMedia({ colorScheme });
        await story('dark');
        await track.click();
        await page.waitForTimeout(100);
        await track.click();
        await page.waitForTimeout(700);
        assert.equal(await checked(), 'true', `${at}: 押し直しの後の aria-checked`);
        assert.equal(await theme(), 'dark', `${at}: 押し直しの後の data-theme`);
        await atX(SPAN, '押し直しの後の位置');

        // 動きを減らす。
        await story('dark');
        const motion = () => track.evaluate((el) => ({
          duration: getComputedStyle(el.lastElementChild).transitionDuration,
          twinkle: getComputedStyle(el.querySelector('i')).animationName,
        }));
        assert.notEqual((await motion()).twinkle, 'none', `${at}: ダークでは星が瞬く`);
        await page.emulateMedia({ reducedMotion: 'reduce' });
        assert.deepEqual(await motion(), { duration: '0s', twinkle: 'none' }, `${at}: 動きを減らす設定で遷移も瞬きも止まる`);
        await page.emulateMedia({ reducedMotion: 'no-preference' });

        assert.deepEqual(errors, [], `${at}: ページのエラーが無い`);
        await context.close();

        // マウント前の位置。JS なしのサーバー描画の markup と配布 CSS だけで、data-theme から位置が決まる。
        const bare = await browser.newContext({ viewport: { width: 400, height: 200 }, colorScheme, javaScriptEnabled: true });
        const plain = await bare.newPage();
        const style = read(`packages/${framework}/dist/style.css`);
        for (const [attribute, expected] of [['data-theme="light"', 0], ['data-theme="dark"', SPAN], ['', SPAN]]) {
          await plain.setContent(`<!doctype html><html ${attribute}><head><style>${style}</style></head><body>${ssr[framework]}</body></html>`);
          assert.equal(await plain.evaluate(() => document.documentElement.dataset.theme ?? ''), attribute.slice(12, -1), `${at}: マウント前のページの data-theme`);
          const x = await plain.evaluate(() => {
            const button = document.querySelector('[role="switch"]');
            return button.lastElementChild.getBoundingClientRect().left - button.getBoundingClientRect().left - 4;
          });
          assert.ok(Math.abs(x - expected) < 0.5, `${at}: マウント前（${attribute || '属性なし'}）のつまみ x = ${expected}（実際 ${x}）`);
        }
        await bare.close();
      }
      console.log(`${framework}: ThemeSwitch の story・押下・キーボード・ThemePicker との同期・外からの書き換え・OS の変化・押し直し・動きを減らす設定・マウント前の位置・axe を、OS のライト / ダークで確認しました。`);
    }
  } finally {
    await browser?.close();
    server.kill();
  }
}

(async () => {
  console.log('ThemeSwitch の生成物と CSS の規則を確認しました。');
  await distChecks();
  console.log('ThemeSwitch の配布 CSS・export・サーバー描画を確認しました。');
  await browserChecks();
})().catch((error) => { console.error(error); process.exitCode = 1; });
