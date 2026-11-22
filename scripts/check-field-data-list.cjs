// Field の requiredMark・descriptionPosition と、DataList の hideHeading の検査。
//   pnpm generate && pnpm --filter './packages/*' build
//   node scripts/check-field-data-list.cjs
// A（サーバー描画）はブラウザー不要で、CI（.github/workflows/check.yml）でも走る。
// B（ブラウザー）は storybook-static が両方にあるときだけ走る（pnpm build-storybook のあと）。
//   PLAYWRIGHT_MODULE=<playwright の場所> node scripts/check-field-data-list.cjs
// check-components.cjs と check-data-list.cjs は手前の既存の失敗で止まるので、足した props の検査はここに分けて置く。
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { createRequire } = require('node:module');
const { existsSync, readFileSync, readdirSync } = require('node:fs');
const { resolve } = require('node:path');
const { pathToFileURL } = require('node:url');

const root = resolve(__dirname, '..');

// ---------- A. サーバー描画（配布物を読む） ----------

// Vue の v-if が残すコメントを除いて、Vue と React の出力を同じ形で比べる。
const normalize = html => html.replace(/<!--[\s\S]*?-->/g, '').replace(/=""/g, '').replace(/\s*\/>/g, '>').replace(/;"/g, '"');
const count = (html, pattern) => (html.match(pattern) || []).length;
// id の付いた要素の開始タグと中身（入れ子の無い要素だけを読む）。
const element = (html, id) => new RegExp(`<(\\w+)([^>]*\\sid="${id}"[^>]*)>([^<]*)</\\1>`).exec(html);

async function serverRender() {
  const requireVue = createRequire(resolve(root, 'packages/vue/package.json'));
  const { createSSRApp, h } = requireVue('vue');
  const { renderToString } = requireVue('vue/server-renderer');
  const requireReact = createRequire(resolve(root, 'packages/react/package.json'));
  const { createElement } = requireReact('react');
  const { renderToStaticMarkup } = requireReact('react-dom/server');
  const vueUi = await import(pathToFileURL(resolve(root, 'packages/vue/dist/index.js')));
  const reactUi = await import(pathToFileURL(resolve(root, 'packages/react/dist/index.js')));

  const renders = {
    Vue: {
      field: props => renderToString(createSSRApp({ render: () => h(vueUi.Field, props, { default: () => h(vueUi.Input) }) })),
      dataList: props => renderToString(createSSRApp(vueUi.DataList, props)),
    },
    React: {
      field: async props => renderToStaticMarkup(createElement(reactUi.Field, props, createElement(reactUi.Input))),
      dataList: async props => renderToStaticMarkup(createElement(reactUi.DataList, props)),
    },
  };
  const field = { id: 'title', label: 'タイトル', description: '一覧に表示される名前です。', required: true };
  const list = { id: 'list', label: '進行中', columns: [{ id: 'title', label: 'タイトル' }], count: 2 };
  const outputs = {};

  for (const [name, render] of Object.entries(renders)) {
    const css = readFileSync(resolve(root, `packages/${name.toLowerCase()}/dist/style.css`), 'utf8');
    const hidden = className => {
      const rule = new RegExp(`\\.${className}\\s*\\{([^}]*)\\}`).exec(css)?.[1] ?? '';
      return /position:\s*absolute/.test(rule) && /clip/.test(rule);
    };

    // requiredMark。省くと text と同じ出力で、${id}-required が見える文言（読み上げからは外す）。
    const text = normalize(await render.field(field));
    assert.equal(normalize(await render.field({ ...field, requiredMark: 'text' })), text, `${name}: requiredMark を省くと text と同じ`);
    const textMark = element(text, 'title-required');
    assert(textMark, `${name}: text の印に title-required がある`);
    assert.equal(textMark[3], '必須', `${name}: text の印は requiredText`);
    assert.match(textMark[2], /aria-hidden="true"/, `${name}: text の印は読み上げから外す`);
    assert.doesNotMatch(textMark[2], /_srOnly_/, `${name}: text の印は見える`);
    assert.equal(count(text, />\*</g), 0, `${name}: text では * を出さない`);

    // asterisk。見える * は読み上げから外し、${id}-required は見た目だけ隠した requiredText（Picker が aria-labelledby で読む）。
    const asterisk = normalize(await render.field({ ...field, requiredMark: 'asterisk', requiredText: 'Required' }));
    const star = /<span([^>]*)>\*<\/span>/.exec(asterisk);
    assert(star, `${name}: asterisk では * を出す`);
    assert.match(star[1], /aria-hidden="true"/, `${name}: * は読み上げから外す`);
    assert.doesNotMatch(star[1], /\sid=/, `${name}: * に id を付けない`);
    const srMark = element(asterisk, 'title-required');
    assert(srMark, `${name}: asterisk でも title-required がある`);
    assert.equal(srMark[3], 'Required', `${name}: asterisk の title-required は requiredText`);
    assert.match(srMark[2], /aria-hidden="true"/, `${name}: title-required は aria-labelledby で参照するだけで、label の名前に混ぜない`);
    const srClass = /class="[^"]*\b(_srOnly_[\w-]+)/.exec(srMark[2])?.[1];
    assert(srClass && hidden(srClass), `${name}: title-required は見た目だけ隠す（${srClass}）`);
    assert.equal(count(asterisk, /\sid="title-required"/g), 1, `${name}: title-required は 1 つ`);
    assert.equal(count(normalize(await render.field({ ...field, required: false, requiredMark: 'asterisk' })), /_required_|\sid="title-required"/g), 0, `${name}: 必須でなければ印を出さない`);

    // descriptionPosition。省くと top と同じで、説明文は入力欄の前。bottom では入力欄とエラーの間。id は同じ。
    const top = normalize(await render.field(field));
    assert.equal(normalize(await render.field({ ...field, descriptionPosition: 'top' })), top, `${name}: descriptionPosition を省くと top と同じ`);
    assert(top.indexOf('id="title-description"') < top.indexOf('<input'), `${name}: 既定では説明文が入力欄の前`);
    const bottom = normalize(await render.field({ ...field, descriptionPosition: 'bottom' }));
    assert.equal(count(bottom, /\sid="title-description"/g), 1, `${name}: bottom でも説明文は 1 つ`);
    assert(bottom.indexOf('<input') < bottom.indexOf('id="title-description"'), `${name}: bottom では説明文が入力欄の後`);
    assert(bottom.indexOf('id="title-description"') < bottom.indexOf('id="title-error"'), `${name}: エラーは最後のまま`);
    assert.match(bottom, /<input[^>]*aria-describedby="title-description"/, `${name}: bottom でも aria-describedby は同じ`);

    // hideHeading。collapsible でないときだけ見出しを見た目だけ隠す。role="heading" と aria-labelledby の参照先は残す。
    const heading = html => /<div([^>]*\sid="list-heading"[^>]*)>/.exec(html)?.[1] ?? '';
    const plain = normalize(await render.dataList({ ...list, collapsible: false }));
    assert.doesNotMatch(heading(plain), /_srOnly_/, `${name}: 既定では見出しは見える`);
    const hiddenList = normalize(await render.dataList({ ...list, collapsible: false, hideHeading: true }));
    const hiddenHeading = heading(hiddenList);
    assert.match(hiddenHeading, /role="heading"/, `${name}: 隠しても見出しのまま`);
    const headingClass = /class="[^"]*\b(_srOnly_[\w-]+)/.exec(hiddenHeading)?.[1];
    assert(headingClass && hidden(headingClass), `${name}: hideHeading で見出しを見た目だけ隠す（${headingClass}）`);
    assert.match(hiddenList, /<section[^>]*aria-labelledby="list-heading"/, `${name}: 区画の名前は見出しから取ったまま`);
    assert.equal(hiddenList.replace(` ${headingClass}`, ''), plain, `${name}: 違いは見出しの class だけ`);
    const collapsible = normalize(await render.dataList({ ...list, collapsible: true }));
    assert.equal(normalize(await render.dataList({ ...list, collapsible: true, hideHeading: true })), collapsible, `${name}: collapsible では hideHeading は効かない`);

    outputs[name] = { text, asterisk, top, bottom, plain, hiddenList, collapsible };
  }
  for (const key of Object.keys(outputs.Vue)) assert.equal(outputs.React[key], outputs.Vue[key], `Vue と React の出力が同じ（${key}）`);
}

// ---------- B. ブラウザー（storybook-static と playwright があるときだけ。CI では走らない） ----------

async function browserChecks() {
  if (!['vue', 'react'].every(framework => existsSync(resolve(root, `packages/${framework}/storybook-static/iframe.html`)))) {
    console.log('B: storybook-static がないため、ブラウザー検証は省きました（pnpm build-storybook のあとに再実行してください）。');
    return;
  }
  const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
  const port = process.env.FIELD_DATA_LIST_TEST_PORT || '6291';
  const base = `http://127.0.0.1:${port}`;
  const server = spawn('python3', ['-m', 'http.server', port, '--bind', '127.0.0.1', '--directory', root], { stdio: 'ignore' });
  const axe = readdirSync(`${root}/node_modules/.pnpm`).find(name => name.startsWith('axe-core@'));
  const axeSource = readFileSync(`${root}/node_modules/.pnpm/${axe}/node_modules/axe-core/axe.min.js`, 'utf8');
  let browser;
  try {
    for (let i = 0; i < 40; i++) {
      try { if ((await fetch(base)).ok) break; } catch {}
      await new Promise(done => setTimeout(done, 100));
    }
    browser = await chromium.launch({ headless: true });
    for (const framework of ['react', 'vue']) {
      const page = await browser.newPage({ viewport: { width: 900, height: 760 } });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      page.on('console', message => { if (['error', 'warning'].includes(message.type())) errors.push(message.text()); });
      const open = async (component, name, args = '') => {
        await page.goto(`${base}/packages/${framework}/storybook-static/iframe.html?id=components-${component}--${name}${args}&viewMode=story`);
        await page.locator('#storybook-root > *').first().waitFor();
        // ライブラリは地を塗らない。React の Storybook には地を塗る preview.css が無いため、利用側と同じく面の色を敷く。
        await page.addStyleTag({ content: 'body { background: var(--koyori-color-surface); color: var(--koyori-color-text); }' });
        await page.waitForTimeout(100);
      };
      const accessibility = async () => {
        await page.addScriptTag({ content: `${axeSource}\nwindow.fieldAxe = window.axe;` });
        const violations = await page.evaluate(async () => (await window.fieldAxe.run(document.querySelector('#storybook-root'))).violations.map(v => ({ id: v.id, targets: v.nodes.map(n => n.target) })));
        assert.deepEqual(violations, [], `${framework}: axe`);
      };
      const follows = (a, b) => a.evaluate((el, other) => !!(el.compareDocumentPosition(other) & Node.DOCUMENT_POSITION_FOLLOWING), b);

      // requiredMark の既定は text。印の文言が見える。
      await open('field', 'required');
      assert(await page.locator('#title-required').isVisible(), `${framework}: the text mark is the default`);
      // requiredMark="asterisk": 見えるのは * だけ。${id}-required は見た目だけ隠した requiredText で、* は読み上げから外す。
      await open('field', 'required-asterisk');
      const asterisk = page.locator('label').getByText('*', { exact: true });
      assert(await asterisk.isVisible());
      assert.equal(await asterisk.getAttribute('aria-hidden'), 'true');
      assert.equal(await page.locator('#title-required').textContent(), '必須');
      const requiredBox = await page.locator('#title-required').boundingBox();
      assert(requiredBox.width <= 1 && requiredBox.height <= 1, `${framework}: requiredText is visually hidden`);
      assert.equal(await page.getByRole('textbox', { name: 'タイトル', exact: true }).count(), 1, `${framework}: no * in the input name`);
      assert(await page.getByRole('textbox').evaluate(el => el.required));
      await accessibility();
      await open('field', 'required-asterisk-picker');
      assert(await page.getByRole('button', { name: '担当チーム 選んでください 必須', exact: true }).isVisible(), `${framework}: Picker reads requiredText, not *`);
      await accessibility();

      // descriptionPosition="bottom": 説明文は入力欄の下。aria-describedby は同じ。
      await open('field', 'description-bottom');
      const input = page.getByRole('textbox');
      const description = page.locator('#title-description');
      assert.equal(await input.getAttribute('aria-describedby'), 'title-description title-error');
      assert((await description.boundingBox()).y > (await input.boundingBox()).y, `${framework}: description below the control`);
      assert(await follows(input, await description.elementHandle()), `${framework}: description follows the control in DOM order`);
      assert(await follows(description, await page.locator('#title-error').elementHandle()), `${framework}: the error stays last`);
      await accessibility();
      await open('field', 'default');
      assert(await follows(page.locator('#title-description'), await page.getByRole('textbox').elementHandle()), `${framework}: description above the control by default`);

      // hideHeading: 見出しは見た目だけ隠し、区画の名前（aria-labelledby の参照先）と見出しの読み上げは残す。
      const table = page.getByRole('table', { name: '進行中', exact: true });
      const trigger = page.locator('#list-default-heading button');
      await open('datalist', 'plain');
      const plainTableTop = (await table.boundingBox()).y;
      await open('datalist', 'hidden-heading');
      const hiddenHeading = page.locator('#list-default-heading');
      assert.equal(await hiddenHeading.getAttribute('role'), 'heading');
      assert.equal(await page.getByRole('heading', { name: /^進行中\s*2\s*件$/ }).count(), 1, `${framework}: the heading is still announced`);
      assert.equal(await page.getByRole('region', { name: /^進行中\s*2\s*件$/ }).count(), 1, `${framework}: the section keeps its name`);
      const headingBox = await hiddenHeading.boundingBox();
      assert(headingBox.width <= 1 && headingBox.height <= 1, `${framework}: the heading takes no space: ${JSON.stringify(headingBox)}`);
      assert((await table.boundingBox()).y < plainTableTop, `${framework}: the table moves up into the heading space`);
      await accessibility();
      // collapsible では開閉のボタンが見出しにあるので隠さない。
      await open('datalist', 'default', '&args=hideHeading:!true');
      assert(await trigger.isVisible(), `${framework}: hideHeading is ignored while collapsible`);
      assert((await page.locator('#list-default-heading').boundingBox()).height > 1);

      assert.deepEqual(errors, []);
      await page.close();
      console.log(`B（${framework}）: Field の requiredMark・descriptionPosition と DataList の hideHeading の見た目・読み上げ・axe を確認しました。`);
    }
  } finally {
    await browser?.close();
    server.kill();
  }
}

serverRender().then(() => {
  console.log('A: Vue・React のサーバー描画で、Field の requiredMark・descriptionPosition と DataList の hideHeading の DOM を確認しました。');
  return browserChecks();
}).catch(error => {
  console.error(error);
  process.exitCode = 1;
});
