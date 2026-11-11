// Mention の検査。
//   pnpm generate && pnpm --filter './packages/*' build
//   node scripts/check-mention.cjs
// A（対比）・B（配布物）・C（サーバー描画）はブラウザー不要で、CI（.github/workflows/check.yml）でも走る。
// A は tokens.css と mention.css を読むだけなので、ビルド前でも動く。
// D（ブラウザー）は storybook-static が両方にあるときだけ走る（pnpm build-storybook のあと）。
//   PLAYWRIGHT_MODULE=<playwright の場所> node scripts/check-mention.cjs
const assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const { existsSync, readFileSync, readdirSync } = require('node:fs');
const { resolve } = require('node:path');
const { pathToFileURL } = require('node:url');

const root = resolve(__dirname, '..');
const read = (path) => readFileSync(resolve(root, path), 'utf8');
const failures = [];
const fail = (message) => { if (!failures.includes(message)) failures.push(message); };

// ---------- A. 対比（tokens.css と mention.css を読む） ----------

const hexToRgb = (hex) => [1, 3, 5].map((index) => parseInt(hex.slice(index, index + 2), 16));
const linear = (channel) => {
  const value = channel / 255;
  return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
};
const luminance = ([red, green, blue]) => 0.2126 * linear(red) + 0.7152 * linear(green) + 0.0722 * linear(blue);
const contrastRgb = (a, b) => {
  const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (high + 0.05) / (low + 0.05);
};
const contrast = (a, b) => contrastRgb(hexToRgb(a), hexToRgb(b));

// 計算式の自己検査。境界（4.5）をまたぐ 2 点。
assert(contrast('#767676', '#ffffff') >= 4.5, '#767676 と白は 4.5:1 以上');
assert(contrast('#777777', '#ffffff') < 4.5, '#777777 と白は 4.5:1 未満');
assert(Math.abs(contrast('#000000', '#ffffff') - 21) < 1e-9, '黒と白は 21:1');

const stripComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '');

const tokensCss = stripComments(read('components/tokens.css'));
const lightStart = tokensCss.indexOf("[data-theme='light']");
assert(lightStart > 0, "tokens.css に [data-theme='light'] がある");
const colorTokens = (css) => Object.fromEntries([...css.matchAll(/--koyori-color-([a-z-]+):\s*([^;]+);/g)].map((match) => [match[1], match[2].trim()]));
const darkTokens = colorTokens(tokensCss.slice(0, lightStart));
const lightTokens = { ...darkTokens, ...colorTokens(tokensCss.slice(lightStart)) };
const themes = [['墨', darkTokens], ['ライト', lightTokens]];

const mentionPath = 'components/Mention/mention.css';
if (!existsSync(resolve(root, mentionPath))) {
  console.error(`${mentionPath} がありません。`);
  process.exit(1);
}
const mentionCss = stripComments(read(mentionPath)).replace(/@import[^;]*;/g, '');

// @media の中の規則も、内側の規則として取れる。
const rules = [...mentionCss.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((match) => ({
  selectors: match[1].split(',').map((selector) => selector.trim()),
  declarations: Object.fromEntries(match[2].split(';').map((declaration) => declaration.trim()).filter(Boolean).map((declaration) => {
    const index = declaration.indexOf(':');
    return [declaration.slice(0, index).trim(), declaration.slice(index + 1).trim()];
  })),
}));
const custom = (selector) => Object.fromEntries(rules.filter((rule) => rule.selectors.includes(selector)).flatMap((rule) => Object.entries(rule.declarations)).filter(([name]) => name.startsWith('--koyori-mention-')));

const base = custom('.koyori-mention');
const statuses = ['member', 'self', 'outside', 'gone', 'unknown'];
const declared = {
  member: base,
  self: { ...base, ...custom('.koyori-mention-member.koyori-mention-self') },
  outside: { ...base, ...custom('.koyori-mention-outside') },
  gone: { ...base, ...custom('.koyori-mention-gone') },
  unknown: { ...base, ...custom('.koyori-mention-unknown') },
};
const avatarOpacity = (status) => {
  const rule = rules.find((candidate) => candidate.selectors.includes(`.koyori-mention-${status} .koyori-mention-avatar`));
  return rule ? Number(rule.declarations.opacity ?? 1) : 1;
};
const avatarFilter = (status) => rules.find((candidate) => candidate.selectors.includes(`.koyori-mention-${status} .koyori-mention-avatar`))?.declarations.filter;

const tokenName = (value) => /^var\(--koyori-color-([a-z-]+)\)$/.exec(value ?? '')?.[1];
const grayscale = ([red, green, blue]) => {
  const gray = 0.2126 * red + 0.7152 * green + 0.0722 * blue;
  return [gray, gray, gray];
};
const over = (foreground, alpha, background) => foreground.map((channel, index) => alpha * channel + (1 - alpha) * background[index]);
const fixed = (value) => value.toFixed(2);

const table = [];
for (const [themeName, tokens] of themes) {
  const resolveToken = (status, property, allowTransparent = false) => {
    const value = declared[status][property];
    if (allowTransparent && value === 'transparent') return null;
    const name = tokenName(value);
    if (!name) {
      fail(`${status}（${themeName}）: ${property} は var(--koyori-color-…) だけを許す（${value ?? '宣言なし'}）。地は不透明なトークンにする`);
      return undefined;
    }
    const color = tokens[name];
    if (!/^#[0-9a-f]{6}$/.test(color ?? '')) {
      fail(`${status}（${themeName}）: ${property} の --koyori-color-${name} は不透明な 6 桁の hex でない（${color ?? '未定義'}）`);
      return undefined;
    }
    return color;
  };
  for (const status of statuses) {
    const color = resolveToken(status, '--koyori-mention-color');
    const background = resolveToken(status, '--koyori-mention-background');
    const avatarColor = resolveToken(status, '--koyori-mention-avatar-color');
    const avatarBackground = resolveToken(status, '--koyori-mention-avatar-background');
    const borderStyle = declared[status]['--koyori-mention-border-style'];
    const borderColor = resolveToken(status, '--koyori-mention-border-color', true);
    const row = { theme: themeName, status };
    table.push(row);
    if (!color || !background) continue;
    row.text = contrast(color, background);
    if (row.text < 4.5) fail(`${status}（${themeName}）: 字と地 ${fixed(row.text)}:1 < 4.5`);

    if (status === 'self') {
      const memberBackground = resolveToken('member', '--koyori-mention-background');
      if (memberBackground && memberBackground === background) fail(`self（${themeName}）: 地が member と同じ（反転で分かれない）`);
    }

    if (status === 'member' || status === 'self') {
      if (borderStyle !== 'solid') fail(`${status}（${themeName}）: border-style が solid でない（${borderStyle}）`);
    } else {
      if (borderStyle !== 'dashed') fail(`${status}（${themeName}）: border-style が dashed でない（${borderStyle}）。色の薄さだけで分けない`);
      if (borderColor) {
        row.border = contrast(borderColor, background);
        if (row.border < 3) fail(`${status}（${themeName}）: 縁と地 ${fixed(row.border)}:1 < 3`);
      } else fail(`${status}（${themeName}）: 縁の色が透明（破線が見えない）`);
    }

    if (avatarColor && avatarBackground) {
      const opacity = avatarOpacity(status);
      const filter = avatarFilter(status);
      if (filter !== undefined && filter !== 'grayscale(1)') fail(`${status}（${themeName}）: 想定外の filter（${filter}）。検査が計算できない`);
      const backdrop = hexToRgb(background);
      let foregroundRgb = over(hexToRgb(avatarColor), opacity, backdrop);
      let avatarBackgroundRgb = over(hexToRgb(avatarBackground), opacity, backdrop);
      // filter は要素ごと（不透明度の前）にかかる。灰色化したあとで札の地に重ねる。
      if (filter === 'grayscale(1)') {
        foregroundRgb = over(grayscale(hexToRgb(avatarColor)), opacity, backdrop);
        avatarBackgroundRgb = over(grayscale(hexToRgb(avatarBackground)), opacity, backdrop);
      }
      row.avatar = contrastRgb(foregroundRgb, avatarBackgroundRgb);
      if (row.avatar < 4.5) fail(`${status}（${themeName}）: アバターの頭文字と地 ${fixed(row.avatar)}:1 < 4.5`);
    }
  }
}

console.log('| 面 | 状態 | 字 / 地 | 縁 / 地 | アバターの頭文字 / 地 |');
console.log('| --- | --- | --- | --- | --- |');
for (const row of table) {
  const cell = (value) => (value === undefined ? '—' : fixed(value));
  console.log(`| ${row.theme} | ${row.status} | ${cell(row.text)} | ${cell(row.border)} | ${cell(row.avatar)} |`);
}

if (failures.length > 0) {
  console.error(`\n${failures.length} 件の失敗:\n${failures.map((message) => `- ${message}`).join('\n')}`);
  process.exit(1);
}
console.log('A: 明暗 2 面 × 5 状態の対比（字・縁・アバター）と、地が不透明なトークンであることを確認しました。');

// ---------- B. 配布物（dist） ----------

for (const framework of ['vue', 'react']) {
  const cssPath = `packages/${framework}/dist/style.css`;
  const indexPath = `packages/${framework}/src/index.ts`;
  assert(existsSync(resolve(root, cssPath)), `${cssPath} がありません（pnpm --filter './packages/*' build のあとに実行する）`);
  const css = read(cssPath);
  for (const [pattern, label] of [
    [/\.koyori-mention\{/, '札'],
    [/\.koyori-mention-member\.koyori-mention-self\{/, '本人'],
    [/\.koyori-mention-outside[,{]/, 'outside'],
    [/\.koyori-mention-gone[,{]/, 'gone'],
    [/\.koyori-mention-unknown[,{]/, 'unknown'],
    [/\.koyori-mention-avatar\{/, 'アバター'],
    [/a\.koyori-mention\[href\]/, 'リンクの札'],
  ]) assert.match(css, pattern, `${framework}: dist/style.css に ${label} の規則がある`);
  assert.equal((css.match(/--koyori-font-family:/g) || []).length, 1, `${framework}: トークンは配布 CSS に 1 回だけ`);
  assert.match(read(indexPath), /^import '\.\/generated\/components\/Mention\/mention\.css';/m, `${framework}: 公開エントリーが mention.css を読み込む`);
}
console.log('B: 両方の dist/style.css に固定 class の規則があり、トークンの重複がなく、index.ts が mention.css を読み込むことを確認しました。');

// ---------- C. サーバー描画（部品の出力 = 固定 class の HTML） ----------

// <!--…--> を消し、各開始タグの属性を名前順に並べる。React の `/>` は閉じタグなしの形に、
// Vue が `alt` と出す空値の属性は `alt=""` の形に揃える（HTML では同じ意味）。
function normalize(html) {
  return html.replace(/<!--[\s\S]*?-->/g, '').replace(/<([a-zA-Z][\w-]*)((?:\s+[^\s=>/]+(?:="[^"]*")?)*)\s*\/?>/g, (_tag, name, attributes) => {
    const list = [...attributes.matchAll(/([^\s=]+)(?:="([^"]*)")?/g)].map((match) => `${match[1]}="${match[2] ?? ''}"`).sort();
    return `<${name}${list.map((attribute) => ` ${attribute}`).join('')}>`;
  });
}

// 期待する HTML は 2.6 の形を文字列で書く（mentionClassNames・avatarInitials は使わない）。
const expectedHtml = ({ classes, tag = 'span', href, avatar, label }) => {
  const avatarHtml = avatar ? `<span class="koyori-mention-avatar" data-initials="${avatar.initials}" aria-hidden="true">${avatar.src ? `<img src="${avatar.src}" alt="">` : ''}</span>` : '';
  return `<${tag} class="${classes}"${href ? ` href="${href}"` : ''}>${avatarHtml}<span class="koyori-mention-label">${label}</span></${tag}>`;
};
const cases = [
  ['member + 頭文字', { label: '@aki', avatar: { name: 'aki' } },
    { classes: 'koyori-mention koyori-mention-member', avatar: { initials: 'a' }, label: '@aki' }],
  ['member + 画像 + href', { label: '@taro', href: '/acme/users/1', avatar: { name: 'taro', src: '/img/taro.png' } },
    { classes: 'koyori-mention koyori-mention-member', tag: 'a', href: '/acme/users/1', avatar: { initials: 't', src: '/img/taro.png' }, label: '@taro' }],
  ['member + self', { label: '@aki', self: true, avatar: { name: 'aki' } },
    { classes: 'koyori-mention koyori-mention-member koyori-mention-self', avatar: { initials: 'a' }, label: '@aki' }],
  ['outside + 頭文字', { label: '@hanako', status: 'outside', avatar: { name: 'hanako' } },
    { classes: 'koyori-mention koyori-mention-outside', avatar: { initials: 'h' }, label: '@hanako' }],
  ['gone + 画像', { label: '@jiro', status: 'gone', avatar: { name: 'jiro', src: '/img/jiro.png' } },
    { classes: 'koyori-mention koyori-mention-gone', avatar: { initials: 'j', src: '/img/jiro.png' }, label: '@jiro' }],
  ['unknown・アバターなし', { label: '@（不明な利用者）', status: 'unknown' },
    { classes: 'koyori-mention koyori-mention-unknown', label: '@（不明な利用者）' }],
  ['outside では self が付かない', { label: '@hanako', status: 'outside', self: true, avatar: { name: 'hanako' } },
    { classes: 'koyori-mention koyori-mention-outside', avatar: { initials: 'h' }, label: '@hanako' }],
  ['avatar: null', { label: '@aki', avatar: null },
    { classes: 'koyori-mention koyori-mention-member', label: '@aki' }],
  ['avatar.src: null（img なし）', { label: '@aki', avatar: { name: 'aki', src: null } },
    { classes: 'koyori-mention koyori-mention-member', avatar: { initials: 'a' }, label: '@aki' }],
];

async function serverRender() {
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
    const vueUi = await import(pathToFileURL(resolve(root, 'packages/vue/dist/index.js')));
    const reactUi = await import(pathToFileURL(resolve(root, 'packages/react/dist/index.js')));

    for (const [name, props, expected] of cases) {
      const want = normalize(expectedHtml(expected));
      const vue = normalize(await renderToString(createSSRApp(vueUi.Mention, props)));
      // React 19 は img の前に画像の preload の link を足す。部品の出力ではないので除く。
      const react = normalize(renderToStaticMarkup(createElement(reactUi.Mention, props)).replace(/<link rel="preload"[^>]*>/g, ''));
      assert.equal(vue, want, `Vue（${name}）: 部品の出力が固定 class の HTML と一致する`);
      assert.equal(react, want, `React（${name}）: 部品の出力が固定 class の HTML と一致する`);
      // label の前後に空白が入らない。
      const inner = /<span class="koyori-mention-label">([^<]*)<\/span>/.exec(vue)?.[1];
      assert.equal(inner, props.label, `Vue（${name}）: label の中身が label と完全一致する`);
      assert.equal(/<span class="koyori-mention-label">([^<]*)<\/span>/.exec(react)?.[1], props.label, `React（${name}）: label の中身が label と完全一致する`);
    }

    for (const [name, ui] of [['Vue', vueUi], ['React', reactUi]]) {
      const { mentionClassNames, MENTION_CLASS_NAMES, avatarInitials } = ui;
      assert.deepEqual(mentionClassNames(undefined), ['koyori-mention', 'koyori-mention-member'], `${name}: 省略は member`);
      assert.deepEqual(mentionClassNames(null), ['koyori-mention', 'koyori-mention-member'], `${name}: null は member`);
      assert.deepEqual(mentionClassNames('weird'), ['koyori-mention', 'koyori-mention-unknown'], `${name}: 知らない値は unknown`);
      assert.deepEqual(mentionClassNames('constructor'), ['koyori-mention', 'koyori-mention-unknown'], `${name}: Object の継承の名も unknown`);
      assert.deepEqual(mentionClassNames('__proto__'), ['koyori-mention', 'koyori-mention-unknown'], `${name}: __proto__ も unknown`);
      assert.deepEqual(mentionClassNames('gone', true), ['koyori-mention', 'koyori-mention-gone'], `${name}: member 以外に self を付けない`);
      assert.deepEqual(mentionClassNames('member', true), ['koyori-mention', 'koyori-mention-member', 'koyori-mention-self'], `${name}: member には self を付ける`);
      assert.equal(avatarInitials('aki'), 'a', `${name}: avatarInitials を公開している`);

      // CSS にある class と過不足なく一致する。label は構造のための class で、規則を持たない。
      const inCss = new Set([...mentionCss.matchAll(/\.(koyori-mention[a-z-]*)/g)].map((match) => match[1]));
      assert(!inCss.has('koyori-mention-label'), 'koyori-mention-label には規則を持たせない');
      assert(MENTION_CLASS_NAMES.includes('koyori-mention-label'), `${name}: MENTION_CLASS_NAMES に label を含める`);
      assert.deepEqual([...MENTION_CLASS_NAMES].filter((className) => className !== 'koyori-mention-label').sort(), [...inCss].sort(), `${name}: MENTION_CLASS_NAMES が CSS の class と過不足なく一致する`);
    }
    assert.deepEqual(warnings, [], 'Vue の警告が出ない');
  } finally {
    console.warn = warn;
  }
}

// ---------- D. ブラウザー（storybook-static と playwright があるときだけ。CI では走らない） ----------

async function browserChecks() {
  if (!['vue', 'react'].every((framework) => existsSync(resolve(root, `packages/${framework}/storybook-static/iframe.html`)))) {
    console.log('D: storybook-static がないため、ブラウザー検証は省きました（pnpm build-storybook のあとに再実行してください）。');
    return;
  }
  // playwright は D のときだけ読む。
  const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
  const { createServer } = require('node:http');
  const { extname, normalize: normalizePath } = require('node:path');
  const { readFile } = require('node:fs/promises');
  const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.woff': 'font/woff', '.png': 'image/png', '.ico': 'image/x-icon' };
  // python3 を使わず node:http で root を配る。自分が立てたサーバーだけを使う。
  const server = createServer(async (request, response) => {
    try {
      const path = normalizePath(decodeURIComponent(new URL(request.url, 'http://localhost').pathname));
      const file = resolve(root, '.' + path);
      if (!file.startsWith(root + '/')) { response.writeHead(403).end(); return; }
      const body = await readFile(file);
      response.writeHead(200, { 'content-type': types[extname(file)] ?? 'application/octet-stream' }).end(body);
    } catch {
      response.writeHead(404).end();
    }
  });
  const port = Number(process.env.MENTION_TEST_PORT || 16330);
  await new Promise((ready, reject) => { server.once('error', reject); server.listen(port, '127.0.0.1', ready); });
  const base = `http://127.0.0.1:${port}`;

  const axe = readdirSync(resolve(root, 'node_modules/.pnpm')).find((name) => name.startsWith('axe-core@'));
  assert(axe, 'Storybook が入れた axe-core を使う');
  const axeSource = readFileSync(resolve(root, `node_modules/.pnpm/${axe}/node_modules/axe-core/axe.min.js`), 'utf8');
  const browser = await chromium.launch({ headless: true });
  const parseRgb = (value) => {
    const match = /^rgba?\((\d+), (\d+), (\d+)(?:, ([\d.]+))?\)$/.exec(value);
    assert(match, `rgb() を読めない: ${value}`);
    assert(match[4] === undefined || Number(match[4]) === 1, `不透明でない色: ${value}`);
    return match.slice(1, 4).map(Number);
  };
  const stories = ['playground', 'states', 'states-light', 'fixed-class-html', 'fixed-class-html-light', 'link', 'in-text'];
  try {
    for (const framework of ['vue', 'react']) {
      const page = await browser.newPage({ viewport: { width: 900, height: 700 } });
      const errors = [];
      page.on('pageerror', (error) => errors.push(error.message));
      page.on('console', (message) => { if (['error', 'warning'].includes(message.type())) errors.push(message.text()); });
      const open = async (name) => {
        await page.goto(`${base}/packages/${framework}/storybook-static/iframe.html?id=components-mention--${name}&viewMode=story`);
        await page.locator('#storybook-root .koyori-mention').first().waitFor();
      };
      // 札とアバターの算出スタイル。[data-case] ごとに集める。
      const collect = () => page.evaluate(() => {
        const chipProperties = ['color', 'backgroundColor', 'borderTopStyle', 'borderRightStyle', 'borderBottomStyle', 'borderLeftStyle', 'borderTopColor', 'borderRightColor', 'borderBottomColor', 'borderLeftColor', 'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth', 'borderTopLeftRadius', 'borderBottomRightRadius', 'paddingLeft', 'paddingRight', 'height', 'fontWeight'];
        const avatarProperties = ['width', 'height', 'backgroundColor', 'opacity', 'filter'];
        const pick = (element, properties) => Object.fromEntries(properties.map((name) => [name, getComputedStyle(element)[name]]));
        return Object.fromEntries([...document.querySelectorAll('#storybook-root [data-case]')].map((item) => {
          const chip = item.querySelector('.koyori-mention');
          const avatar = chip.querySelector('.koyori-mention-avatar');
          return [item.getAttribute('data-case'), { chip: { ...pick(chip, chipProperties), width: chip.getBoundingClientRect().width }, avatar: avatar ? pick(avatar, avatarProperties) : null }];
        }));
      });
      const a11y = async (name) => {
        // addon が window.axe を差し替えることがあるので、自前の参照を持つ。
        await page.addScriptTag({ content: `${axeSource}\nwindow.mentionAxe = window.axe;` });
        const violations = await page.evaluate(async () => (await window.mentionAxe.run(document.querySelector('#storybook-root'))).violations.map((v) => ({ id: v.id, targets: v.nodes.map((n) => n.target) })));
        assert.deepEqual(violations, [], `${framework}/${name}: axe の違反`);
      };

      const ids = ['member', 'member-image', 'self', 'outside', 'gone', 'unknown'];
      for (const [part, html, theme] of [['states', 'fixed-class-html', '墨'], ['states-light', 'fixed-class-html-light', 'ライト']]) {
        await open(part);
        const component = await collect();
        await open(html);
        const fixedHtml = await collect();
        assert.deepEqual(Object.keys(component), ids, `${framework}（${theme}）: 札の並び`);
        assert.deepEqual(fixedHtml, component, `${framework}（${theme}）: 部品と固定 class の HTML の算出スタイルが一致する`);
        for (const id of ids) {
          const { chip } = component[id];
          const ratio = contrastRgb(parseRgb(chip.color), parseRgb(chip.backgroundColor));
          assert(ratio >= 4.5, `${framework}（${theme}）${id}: 算出色の字と地 ${fixed(ratio)}:1 < 4.5`);
          const dashed = ['outside', 'gone', 'unknown'].includes(id);
          assert.equal(chip.borderTopStyle, dashed ? 'dashed' : 'solid', `${framework}（${theme}）${id}: 縁の種類`);
        }
        assert.notEqual(component.self.chip.backgroundColor, component.member.chip.backgroundColor, `${framework}（${theme}）: self の地が member と違う`);
      }

      // 強制配色でも self が member と見分けられる。
      await open('states');
      await page.emulateMedia({ forcedColors: 'active' });
      const forced = await collect();
      assert.notEqual(forced.self.chip.backgroundColor, forced.member.chip.backgroundColor, `${framework}: 強制配色で self の地が member と違う`);
      await page.emulateMedia({ forcedColors: 'none' });

      // 札で行の高さを広げない。
      await open('in-text');
      const withMention = await page.getByTestId('with').boundingBox();
      const without = await page.getByTestId('without').boundingBox();
      assert.equal(withMention.height, without.height, `${framework}: 札のある行と無い行で段落の高さが同じ`);

      // リンクの札。フォーカスの輪・ホバーの下線・Enter での遷移。
      await open('link');
      const link = page.locator('#storybook-root a.koyori-mention').first();
      assert.equal(await link.evaluate((el) => getComputedStyle(el).textDecorationLine), 'none', `${framework}: ホバー前は下線なし`);
      await page.keyboard.press('Tab');
      assert(await link.evaluate((el) => el === document.activeElement), `${framework}: Tab で札にフォーカスが当たる`);
      const outline = await link.evaluate((el) => ({ style: getComputedStyle(el).outlineStyle, width: getComputedStyle(el).outlineWidth }));
      assert.deepEqual(outline, { style: 'solid', width: '2px' }, `${framework}: フォーカスの輪は 2px solid`);
      await page.keyboard.press('Enter');
      await page.waitForFunction(() => location.hash === '#mention-taro');
      await page.mouse.move(0, 0);
      await link.hover();
      assert.equal(await link.evaluate((el) => getComputedStyle(el).textDecorationLine), 'underline', `${framework}: ホバーで下線`);

      for (const name of stories) {
        await open(name);
        await a11y(name);
      }
      assert.deepEqual(errors, [], `${framework}: コンソールのエラー・警告`);
      await page.close();
      console.log(`D（${framework}）: 部品と固定 class の HTML の算出スタイル（明暗）・算出色の対比・強制配色・行の高さ・リンクの操作・axe を確認しました。`);
    }
  } finally {
    await browser.close();
    server.close();
  }
}

serverRender().then(() => {
  console.log('C: Vue・React のサーバー描画が固定 class の HTML と一致し、class の組み立てと公開する class 名が CSS と揃っていることを確認しました。');
  return browserChecks();
}).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
