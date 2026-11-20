// ThemePicker の検査。
//   pnpm generate && pnpm --filter './packages/*' build
//   node scripts/check-theme-picker.cjs
// A（生成物）・B（配布物とサーバー描画）はブラウザー不要で、CI（.github/workflows/check.yml）でも走る。
// C（ブラウザー）は storybook-static が両方にあるときだけ走る（pnpm -r build-storybook のあと）。
//   PLAYWRIGHT_MODULE=<playwright の場所> node scripts/check-theme-picker.cjs
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const { existsSync, readFileSync, readdirSync } = require('node:fs');
const { spawn } = require('node:child_process');
const { resolve } = require('node:path');
const { pathToFileURL } = require('node:url');

const root = resolve(__dirname, '..');
const read = (path) => readFileSync(resolve(root, path), 'utf8');

// ---------- A. 生成物 ----------

for (const [name, path] of [['Vue', 'packages/vue/src/generated/components/ThemePicker/ThemePicker.vue'], ['React', 'packages/react/src/generated/components/ThemePicker/ThemePicker.tsx']]) {
  const source = read(path);
  assert.match(source, /from ['"]\.\.\/Picker\/Picker/, `${name} 版は Picker を合成する`);
  assert.match(source, /searchable(=\{false\}|="false"|=\{\s*false\s*\})/, `${name} 版は検索欄を出さない`);
  // state を theme と名付けると setter が setTheme になり、import した setTheme を覆い隠す。
  assert.doesNotMatch(source, /\[\s*\w+,\s*setTheme\s*\]/, `${name} 版で state の setter が setTheme を覆い隠さない`);
}

// ---------- B. 配布物（themeScript・setTheme・storedTheme・サーバー描画） ----------

const KEY = 'koyori-theme';
const LIGHT = '(prefers-color-scheme: light)';
const EVENT = 'koyori-theme-change';

// ブラウザーの代わり。保持（stored）と OS の配色（os）を差し替えられる。
function makeEnv({ stored, os, getThrows = false, setThrows = false }) {
  const env = { store: new Map(), os, listeners: [], dataset: {}, window: new EventTarget(), events: [] };
  env.window.addEventListener(EVENT, (event) => env.events.push(event.detail));
  if (stored !== undefined) env.store.set(KEY, stored);
  env.document = { documentElement: { dataset: env.dataset } };
  env.localStorage = {
    getItem(key) { if (getThrows) throw new Error('blocked'); return env.store.has(key) ? env.store.get(key) : null; },
    setItem(key, value) { if (setThrows) throw new Error('blocked'); env.store.set(key, String(value)); },
    removeItem(key) { if (setThrows) throw new Error('blocked'); env.store.delete(key); },
  };
  env.matchMedia = (query) => {
    assert.equal(query, LIGHT, 'OS の配色はライトかどうかで問い合わせる');
    return {
      get matches() { return env.os === 'light'; },
      addEventListener(type, listener) { assert.equal(type, 'change'); env.listeners.push(listener); },
    };
  };
  return env;
}

const GLOBALS = ['document', 'localStorage', 'matchMedia', 'window'];
function withGlobals(env, run) {
  const saved = GLOBALS.map((name) => Object.getOwnPropertyDescriptor(globalThis, name));
  GLOBALS.forEach((name) => Object.defineProperty(globalThis, name, { value: env[name], configurable: true, writable: true }));
  try { return run(); } finally {
    GLOBALS.forEach((name, i) => { if (saved[i]) Object.defineProperty(globalThis, name, saved[i]); else delete globalThis[name]; });
  }
}

const runScript = (themeScript, env) => vm.runInNewContext(themeScript, { document: env.document, localStorage: env.localStorage, matchMedia: env.matchMedia, window: env.window });

const combos = [];
for (const stored of [undefined, 'light', 'dark', 'bogus']) for (const os of ['light', 'dark']) combos.push({ stored, os });
const expected = ({ stored, os }) => (stored === 'light' || stored === 'dark' ? stored : os);

async function distChecks() {
  const requireVue = createRequire(resolve(root, 'packages/vue/package.json'));
  const { createSSRApp } = requireVue('vue');
  const { renderToString } = requireVue('vue/server-renderer');
  const requireReact = createRequire(resolve(root, 'packages/react/package.json'));
  const { createElement } = requireReact('react');
  const { renderToStaticMarkup } = requireReact('react-dom/server');

  const warnings = [];
  const warn = console.warn;
  console.warn = (...args) => { warnings.push(args.join(' ')); };
  try {
    for (const framework of ['vue', 'react']) {
      const ui = await import(pathToFileURL(resolve(root, `packages/${framework}/dist/index.js`)));
      const label = (text) => `${framework}: ${text}`;
      for (const name of ['ThemePicker', 'themeScript', 'setTheme', 'storedTheme']) assert.ok(ui[name], label(`${name} を export する`));
      assert.equal(ui.THEME_ITEMS, undefined, label('THEME_ITEMS は export しない'));

      for (const combo of combos) {
        const text = `保持 ${combo.stored ?? 'なし'} / OS ${combo.os}`;
        // themeScript
        const env = makeEnv(combo);
        runScript(ui.themeScript, env);
        assert.equal(env.dataset.theme, expected(combo), label(`themeScript（${text}）`));
        assert.equal(env.listeners.length, 1, label('themeScript は OS の変化を 1 つ聞く'));
        // OS が変わったとき。保持なしでは追従し、light / dark の保持があれば変わらない。
        env.os = combo.os === 'light' ? 'dark' : 'light';
        env.listeners[0]();
        assert.equal(env.dataset.theme, expected({ stored: combo.stored, os: env.os }), label(`themeScript は OS の変化に従う（${text}）`));

        // setTheme(storedTheme()) と themeScript の結果が一致する。
        const again = makeEnv(combo);
        const result = withGlobals(again, () => { ui.setTheme(ui.storedTheme()); return again.dataset.theme; });
        assert.equal(result, expected(combo), label(`setTheme(storedTheme())（${text}）は themeScript と一致する`));
      }

      // 保存・削除が失敗する環境でも、選んだ配色は OS の変化に負けない。ページ内の選択で判断するため。
      for (const [stored, choice] of [[undefined, 'light'], [undefined, 'dark'], ['light', 'system'], ['dark', 'system']]) {
        for (const os of ['light', 'dark']) {
          const env = makeEnv({ stored, os, setThrows: true });
          runScript(ui.themeScript, env);
          withGlobals(env, () => ui.setTheme(choice));
          const at = `保存が失敗する環境で ${choice} を選ぶ（保持 ${stored ?? 'なし'} / OS ${os}）`;
          for (const next of [os === 'light' ? 'dark' : 'light', os]) {
            env.os = next;
            env.listeners[0]();
            assert.equal(env.dataset.theme, choice === 'system' ? next : choice, label(`${at}→ OS が ${next} に変わる`));
          }
        }
      }
      // 別の選択でも、選んだあとの OS の変化はページ内の選択に従う（保持が読める環境でも）。
      {
        const env = makeEnv({ stored: 'dark', os: 'dark' });
        runScript(ui.themeScript, env);
        withGlobals(env, () => ui.setTheme('system'));
        env.os = 'light';
        env.listeners[0]();
        assert.equal(env.dataset.theme, 'light', label('システムを選んだあと OS の変化に追従する'));
      }

      // setTheme は現在の選択を window のイベントで知らせる（別の ThemePicker や themeScript が追従する）。
      {
        const env = makeEnv({ os: 'dark', setThrows: true });
        for (const choice of ['light', 'dark', 'system']) withGlobals(env, () => ui.setTheme(choice));
        assert.deepEqual(env.events, ['light', 'dark', 'system'], label(`setTheme は ${EVENT} で選択を知らせる（保存が失敗しても）`));
      }

      // 保存・削除が失敗しても、storedTheme はこのページで選んだ選択を返す（後からマウントした ThemePicker もそれを出す）。
      for (const [stored, choice] of [[undefined, 'light'], ['dark', 'light'], ['dark', 'system']]) {
        const env = makeEnv({ stored, os: 'dark', setThrows: true });
        const result = withGlobals(env, () => { ui.setTheme(choice); return ui.storedTheme(); });
        assert.equal(result, choice, label(`保存が失敗する環境で ${choice} を選ぶと storedTheme は ${choice}（保持 ${stored ?? 'なし'}）`));
      }

      // 保持が読めなくても落ちず、OS に従う。
      for (const os of ['light', 'dark']) {
        const env = makeEnv({ os, getThrows: true });
        runScript(ui.themeScript, env);
        assert.equal(env.dataset.theme, os, label('getItem が例外でも themeScript は OS に従う'));
        assert.equal(withGlobals(env, () => ui.storedTheme()), 'system', label('getItem が例外なら storedTheme は system'));
      }
      for (const stored of ['bogus', '', 'system']) {
        assert.equal(withGlobals(makeEnv({ stored, os: 'dark' }), () => ui.storedTheme()), 'system', label(`storedTheme は知らない値（${JSON.stringify(stored)}）で system`));
      }
      assert.equal(withGlobals(makeEnv({ stored: 'light', os: 'dark' }), () => ui.storedTheme()), 'light');
      assert.equal(withGlobals(makeEnv({ stored: 'dark', os: 'light' }), () => ui.storedTheme()), 'dark');

      // setTheme
      for (const os of ['light', 'dark']) {
        const env = makeEnv({ stored: 'dark', os });
        withGlobals(env, () => ui.setTheme('light'));
        assert.equal(env.store.get(KEY), 'light', label('setTheme(light) は light を保持する'));
        assert.equal(env.dataset.theme, 'light');
        withGlobals(env, () => ui.setTheme('dark'));
        assert.equal(env.store.get(KEY), 'dark');
        assert.equal(env.dataset.theme, 'dark');
        withGlobals(env, () => ui.setTheme('system'));
        assert.equal(env.store.has(KEY), false, label('setTheme(system) は保持を消す'));
        assert.equal(env.dataset.theme, os, label('setTheme(system) は OS の配色に合わせる'));
        const blocked = makeEnv({ os, setThrows: true });
        withGlobals(blocked, () => ui.setTheme('light'));
        assert.equal(blocked.dataset.theme, 'light', label('保持できなくても data-theme は変わる'));
        withGlobals(blocked, () => ui.setTheme('system'));
        assert.equal(blocked.dataset.theme, os);
      }
    }

    // サーバー描画。document などのスタブは外した状態で行う。
    for (const name of ['document', 'matchMedia', 'window']) assert.ok(!(name in globalThis), `サーバー描画の前に ${name} のスタブが残っていない`);
    const vueUi = await import(pathToFileURL(resolve(root, 'packages/vue/dist/index.js')));
    const reactUi = await import(pathToFileURL(resolve(root, 'packages/react/dist/index.js')));
    const props = { label: 'テーマ' };
    const vue = await renderToString(createSSRApp(vueUi.ThemePicker, props));
    const react = renderToStaticMarkup(createElement(reactUi.ThemePicker, props));
    assert.match(vue, /aria-label="テーマ: システム"/, 'Vue: サーバー描画はトリガーを「テーマ: システム」で出す');
    assert.match(react, /aria-label="テーマ: システム"/, 'React: サーバー描画はトリガーを「テーマ: システム」で出す');
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
  const port = process.env.THEME_PICKER_TEST_PORT || '16345';
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
    const SURFACE = { light: 'rgb(255, 255, 255)', dark: 'rgb(12, 12, 14)' };
    const NAMES = { light: 'ライト', dark: 'ダーク', system: 'システム' };

    for (const framework of ['react', 'vue']) {
      for (const colorScheme of ['light', 'dark']) {
        const context = await browser.newContext({ viewport: { width: 800, height: 700 }, colorScheme });
        const page = await context.newPage();
        const errors = [];
        page.on('pageerror', (error) => errors.push(error.message));
        page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
        const at = `${framework} / OS ${colorScheme}`;
        const trigger = (name) => page.getByRole('button', { name: `テーマ: ${name}`, exact: true });
        const theme = () => page.evaluate(() => document.documentElement.dataset.theme);
        const kept = () => page.evaluate(() => localStorage.getItem('koyori-theme'));
        const story = async (name, wanted) => {
          await page.goto(`${base}/packages/${framework}/storybook-static/iframe.html?id=components-themepicker--${name}&viewMode=story`);
          await trigger(wanted).waitFor();
        };
        const surface = () => page.evaluate(() => getComputedStyle(document.querySelector('#storybook-root > *')).backgroundColor);
        const a11y = async () => {
          await page.addScriptTag({ content: `${axeSource}\nwindow.themeAxe = window.axe;` });
          const violations = await page.evaluate(async () => (await window.themeAxe.run(document.querySelector('#storybook-root'))).violations.map((v) => ({ id: v.id, targets: v.nodes.map((n) => n.target) })));
          assert.deepEqual(violations, [], `${at}: axe の違反が無い`);
        };

        await story('default', 'システム');
        assert.equal(await theme(), colorScheme, `${at}: Default は OS に従う`);
        assert.equal(await kept(), null, `${at}: Default は保持なし`);
        assert.equal(await surface(), SURFACE[colorScheme], `${at}: Default の面の色`);

        for (const chosen of ['light', 'dark']) {
          await story(chosen, NAMES[chosen]);
          assert.equal(await theme(), chosen, `${at}: ${chosen} story の data-theme`);
          assert.equal(await kept(), chosen, `${at}: ${chosen} story の保持`);
          assert.equal(await surface(), SURFACE[chosen], `${at}: ${chosen} story の面の色`);
          await a11y();
        }

        // 操作。ライトを選ぶ → 同じ項目を押し直す → システムに戻す。
        await story('dark', 'ダーク');
        await trigger('ダーク').click();
        await page.getByRole('option', { name: 'ライト', exact: true }).click();
        await trigger('ライト').waitFor();
        assert.equal(await theme(), 'light', `${at}: ライトを選ぶと data-theme が light`);
        assert.equal(await kept(), 'light', `${at}: 保持が light`);
        assert.equal(await surface(), SURFACE.light, `${at}: 再読み込みなしで面が切り替わる`);

        await trigger('ライト').click();
        await page.getByRole('option', { name: 'ライト', exact: true }).click();
        assert.equal(await trigger('ライト').count(), 1, `${at}: 選択中の項目を押しても選択なしにならない`);
        assert.equal(await theme(), 'light');
        assert.equal(await kept(), 'light');

        // 項目を押した後に一覧が閉じていることも前提にしない。開いていなければ開く。
        if (!(await page.getByRole('option', { name: 'システム', exact: true }).isVisible())) await trigger('ライト').click();
        await page.getByRole('option', { name: 'システム', exact: true }).click();
        await trigger('システム').waitFor();
        assert.equal(await kept(), null, `${at}: システムを選ぶと保持が消える`);
        assert.equal(await theme(), colorScheme, `${at}: システムを選ぶと OS に戻る`);

        // 別の ThemePicker や setTheme の直接呼び出しは、イベントで表示に届く。部品で選んだ選択もイベントで知らせる。
        await story('default', 'システム');
        await page.evaluate((type) => window.dispatchEvent(new CustomEvent(type, { detail: 'dark' })), EVENT);
        await trigger('ダーク').waitFor();
        await page.evaluate((type) => { window.seen = []; window.addEventListener(type, (event) => window.seen.push(event.detail)); }, EVENT);
        await trigger('ダーク').click();
        await page.getByRole('option', { name: 'ライト', exact: true }).click();
        await trigger('ライト').waitFor();
        assert.deepEqual(await page.evaluate(() => window.seen), ['light'], `${at}: 部品で選ぶと ${EVENT} で知らせる`);

        assert.deepEqual(errors, [], `${at}: ページのエラーが無い`);
        await context.close();

        // 保存・削除が失敗する環境（Safari のプライベートなど）でも、選んだ配色が OS の変化に負けない。
        const blocked = await browser.newContext({ viewport: { width: 800, height: 700 }, colorScheme });
        await blocked.addInitScript(() => {
          Storage.prototype.setItem = () => { throw new Error('blocked'); };
          Storage.prototype.removeItem = () => { throw new Error('blocked'); };
        });
        const stuck = await blocked.newPage();
        const other = colorScheme === 'light' ? 'dark' : 'light';
        const follows = (wanted) => stuck.waitForFunction((value) => document.documentElement.dataset.theme === value, wanted);
        await stuck.goto(`${base}/packages/${framework}/storybook-static/iframe.html?id=components-themepicker--default&viewMode=story`);
        await stuck.getByRole('button', { name: 'テーマ: システム', exact: true }).waitFor();
        await stuck.addScriptTag({ content: themeScript }); // アプリでは <head> の themeScript がこの役をする。
        await stuck.getByRole('button', { name: 'テーマ: システム', exact: true }).click();
        await stuck.getByRole('option', { name: other === 'light' ? 'ライト' : 'ダーク', exact: true }).click();
        await follows(other);
        await stuck.emulateMedia({ colorScheme: other });
        await stuck.emulateMedia({ colorScheme });
        await stuck.waitForTimeout(100);
        assert.equal(await stuck.evaluate(() => document.documentElement.dataset.theme), other, `${at}: 保存が失敗しても選んだ配色が OS の変化で戻らない`);
        await stuck.getByRole('button', { name: `テーマ: ${NAMES[other]}`, exact: true }).click();
        await stuck.getByRole('option', { name: 'システム', exact: true }).click();
        await follows(colorScheme);
        await stuck.emulateMedia({ colorScheme: other });
        await follows(other);
        await blocked.close();
      }
      console.log(`${framework}: ThemePicker の story・切り替え・押し直し・システムへの復帰・面の色・axe を、OS のライト / ダークで確認しました。`);
    }
  } finally {
    await browser?.close();
    server.kill();
  }
}

(async () => {
  await distChecks();
  console.log('ThemePicker の生成物・themeScript・setTheme / storedTheme・サーバー描画を確認しました。');
  await browserChecks();
})().catch((error) => { console.error(error); process.exitCode = 1; });
