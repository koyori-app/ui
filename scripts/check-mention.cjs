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

// 規則の一覧。@media の中の規則は media に条件を持つ（外では null）。
function parseCss(css, media) {
  const result = [];
  let index = 0;
  while (index < css.length) {
    const open = css.indexOf('{', index);
    if (open < 0) {
      if (css.slice(index).trim()) fail(`mention.css を読めない（${css.slice(index).trim().slice(0, 40)}）`);
      break;
    }
    const prelude = css.slice(index, open).trim();
    let depth = 1;
    let cursor = open + 1;
    while (cursor < css.length && depth > 0) {
      if (css[cursor] === '{') depth += 1;
      else if (css[cursor] === '}') depth -= 1;
      cursor += 1;
    }
    if (depth !== 0) { fail('mention.css の波括弧が閉じていない'); break; }
    const body = css.slice(open + 1, cursor - 1);
    if (prelude.startsWith('@')) {
      if (!prelude.startsWith('@media ')) fail(`想定外の at 規則（${prelude}）。検査が読めない`);
      else result.push(...parseCss(body, [media, prelude.slice(7).trim()].filter(Boolean).join(' and ')));
    } else {
      const entries = body.split(';').map((declaration) => declaration.trim()).filter(Boolean).map((declaration) => {
        const colon = declaration.indexOf(':');
        return [declaration.slice(0, colon).trim(), declaration.slice(colon + 1).trim().replace(/\s+/g, ' ')];
      });
      // 同じ性質を 2 回書くと、下でまとめるときに前の宣言が消え、その !important などを見落とす。
      const seen = new Set();
      for (const [property] of entries) {
        if (seen.has(property)) fail(`${media ? `@media ${media} ` : ''}${prelude}: ${property} を 2 回宣言している。1 回にまとめる`);
        seen.add(property);
      }
      result.push({
        media,
        selectors: prelude.split(',').map((selector) => selector.trim().replace(/\s+/g, ' ')),
        declarations: Object.fromEntries(entries),
      });
    }
    index = cursor;
  }
  return result;
}
// CSS のエスケープ（`!\69mportant` など）は下の字面の判定をすり抜けるので、mention.css にはバックスラッシュを書かせない。
if (mentionCss.includes('\\')) fail('mention.css に \\ がある。エスケープは検査が読めないので使わない');
const rules = parseCss(mentionCss, null);
const ruleName = (rule) => `${rule.media ? `@media ${rule.media} ` : ''}${rule.selectors.join(', ')}`;
// !important は詳細度と宣言の順で勝ち負けを決める下の計算を覆す（負けるはずの宣言が描画では勝つ）ので、変数・普通の性質とも使わせない。
for (const rule of rules) {
  for (const [property, value] of Object.entries(rule.declarations)) {
    if (/!\s*important/i.test(value)) fail(`${ruleName(rule)}: ${property} に !important がある。勝ち負けの計算が描画と食い違う`);
  }
}

const FORCED = '(forced-colors: active)';
const knownMedia = [null, '(hover: hover) and (pointer: fine)', FORCED];
for (const rule of rules) {
  if (!knownMedia.includes(rule.media)) fail(`想定外の @media（${rule.media}）の規則 ${ruleName(rule)}。意図したものだけ許す`);
}

// (a) 塗る宣言は、変数に結び付けて固定で確かめる。変数の値（トークン）は下で明暗とも計算する。
const DECORATION = 'var(--koyori-mention-decoration-line) var(--koyori-mention-decoration-style) var(--koyori-mention-decoration-color)';
const bindings = [
  ['.koyori-mention', { color: 'var(--koyori-mention-color)', background: 'var(--koyori-mention-background)', 'text-decoration': DECORATION }],
  ['a.koyori-mention[href]', { color: 'var(--koyori-mention-color)', 'text-decoration': DECORATION }],
];
for (const [selector, expected] of bindings) {
  const found = rules.filter((rule) => rule.media === null && rule.selectors.length === 1 && rule.selectors[0] === selector);
  if (found.length === 0) fail(`${selector} の規則がない`);
  const merged = Object.assign({}, ...found.map((rule) => rule.declarations));
  for (const [property, value] of Object.entries(expected)) {
    if (merged[property] !== value) fail(`${selector}: ${property} は ${value} でなければならない（${merged[property] ?? '宣言なし'}）。塗る宣言を変数に結び付ける`);
  }
}

// (b) 許可リスト。ここに無い性質を書いた規則は失敗にする（拒否リストでは box-shadow・mask・text-shadow などの塗る性質を取りこぼす）。
//   perRule: 規則ごとに許す性質。null は別の所で値を確かめる（上の (a)）。文字列はその値だけを許す。
//   余白・角丸・太さ・行の高さ・下線の位置のような塗らない性質も、規則ごとに値を固定する（行の高さや見た目の寸法を黙って変えさせない）。
const FORCED_SELF = '.koyori-mention-member.koyori-mention-self';
const perRule = new Map([
  // display: none や inline-block で行の高さが変わらないよう、inline だけを許す。
  // line-height: 1 は、札の字の書体が本文と違うフォールバックでも、札のある行を本文の行の高さより伸ばさないための指定（inline の行の高さは札の line-height でも決まる）。
  ['.koyori-mention', {
    display: 'inline', color: null, background: null, 'text-decoration': null,
    padding: '0 3px', 'border-radius': '4px', 'font-weight': '500', 'line-height': '1', 'text-underline-offset': '0.2em', 'white-space': 'nowrap',
  }],
  // 本人は太さだけを 600 にする。
  [FORCED_SELF, { 'font-weight': '600' }],
  // 灰色の状態の破線の下線は、モックの位置（0.25em）に置く。
  ['.koyori-mention-outside, .koyori-mention-gone, .koyori-mention-unknown', { 'text-underline-offset': '0.25em' }],
  ['a.koyori-mention[href]', { color: null, 'text-decoration': null, cursor: 'pointer', '-webkit-tap-highlight-color': 'transparent' }],
  // ホバーで線の種類・色・太さを変えさせない（灰色のリンクは破線のまま）。
  [`@media (hover: hover) and (pointer: fine) a.koyori-mention[href]:hover`, { 'text-decoration-line': 'underline' }],
  // 輪の位置は固定する。負の値にすると輪が札の内側（札の地の上）に入り、本人の札では地と同じ色になって見えなくなる。
  ['a.koyori-mention[href]:focus-visible', { outline: 'var(--koyori-focus-width) solid var(--koyori-focus-color)', 'outline-offset': 'var(--koyori-focus-offset)' }],
  [`@media ${FORCED} ${FORCED_SELF}`, { 'forced-color-adjust': 'none' }],
]);
for (const rule of rules) {
  if (!rule.selectors.some((selector) => selector.includes('.koyori-mention'))) fail(`${ruleName(rule)}: mention.css に Mention と関係ないセレクターの規則がある`);
  const allowed = perRule.get(ruleName(rule)) ?? {};
  for (const [property, value] of Object.entries(rule.declarations)) {
    if (property.startsWith('--')) continue; // 変数は (c)・(d) で確かめる。
    if (/\b(?:url|image-set|image|element|paint)\(/.test(value)) fail(`${ruleName(rule)}: ${property} が画像を参照している（${value}）`);
    if (Object.hasOwn(allowed, property)) {
      if (allowed[property] !== null && allowed[property] !== value) fail(`${ruleName(rule)}: ${property} は ${allowed[property]} でなければならない（${value}）`);
    } else {
      fail(`${ruleName(rule)}: ${property} は許可リストにない。塗る宣言は --koyori-mention-* の変数を通し、余白・太さ・下線の位置などはこの規則に書いてよい値だけを perRule で固定している（意図した変更なら check-mention.cjs の perRule に足す）`);
    }
  }
}

// 固定した値は、書いてあること自体も確かめる（消えると、行の高さや見た目の寸法が既定に戻る）。
for (const [name, expected] of [
  ['.koyori-mention', ['padding', 'border-radius', 'font-weight', 'line-height', 'text-underline-offset', 'white-space']],
  [FORCED_SELF, ['font-weight']],
  ['.koyori-mention-outside, .koyori-mention-gone, .koyori-mention-unknown', ['text-underline-offset']],
]) {
  const found = rules.filter((rule) => rule.media === null && ruleName(rule) === name);
  if (found.length === 0) fail(`${name} の規則がない`);
  const merged = Object.assign({}, ...found.map((rule) => rule.declarations));
  for (const property of expected) {
    if (merged[property] === undefined) fail(`${name}: ${property} がない（${perRule.get(name)[property]} でなければならない）`);
  }
}

// (c) 状態の変数。札の class の組に当たる単純なセレクター（class だけの複合）を、詳細度（class の数）・順に重ねる。
const elementClasses = {
  member: ['koyori-mention', 'koyori-mention-member'],
  self: ['koyori-mention', 'koyori-mention-member', 'koyori-mention-self'],
  outside: ['koyori-mention', 'koyori-mention-outside'],
  gone: ['koyori-mention', 'koyori-mention-gone'],
  unknown: ['koyori-mention', 'koyori-mention-unknown'],
};
const statuses = Object.keys(elementClasses);
const MENTION_CUSTOMS = ['color', 'background', 'decoration-line', 'decoration-style', 'decoration-color'].map((name) => `--koyori-mention-${name}`);
// 強制配色の本人が使う固定値（d）。輪の色は、本人が forced-color-adjust: none で系統色に替わらないので自分で決める。
const FORCED_CUSTOMS = { '--koyori-mention-color': 'HighlightText', '--koyori-mention-background': 'Highlight', '--koyori-focus-color': 'CanvasText' };
// class だけのセレクターで、どれかの状態の札の class の部分集合になるものだけを返す（そうでなければ null）。
const stateClasses = (selector) => {
  if (!/^(?:\.[a-z-]+)+$/.test(selector)) return null;
  const classes = selector.slice(1).split('.');
  return statuses.some((status) => classes.every((name) => elementClasses[status].includes(name))) ? classes : null;
};
// 変数（--）の宣言は、状態の札の class だけのセレクター（@media の外）で、--koyori-mention-* に限る。
// 札でない要素のセレクターや、--koyori-color-* などのトークンの再定義は、描画に効くのに状態の計算に入らないので失敗にする。
// 例外は強制配色の本人（d）だけ。
for (const rule of rules) {
  const names = Object.keys(rule.declarations).filter((name) => name.startsWith('--'));
  if (names.length === 0) continue;
  if (rule.media !== null) {
    const intended = rule.media === FORCED && rule.selectors.length === 1 && rule.selectors[0] === FORCED_SELF
      && names.every((name) => Object.hasOwn(FORCED_CUSTOMS, name) && rule.declarations[name] === FORCED_CUSTOMS[name]);
    if (!intended) fail(`${ruleName(rule)}: @media の中で変数（${names.join('・')}）を変えてよいのは、強制配色の本人（${Object.entries(FORCED_CUSTOMS).map(([name, value]) => `${name}: ${value}`).join(' / ')}）だけ`);
    continue;
  }
  for (const selector of rule.selectors) {
    if (!stateClasses(selector)) fail(`${ruleName(rule)}: 変数（${names.join('・')}）を、状態の札の class だけのセレクターでない規則（${selector}）で宣言している。札でない要素への宣言は、検査が計算しないまま描画に効く`);
  }
  for (const name of names) {
    if (!MENTION_CUSTOMS.includes(name)) fail(`${ruleName(rule)}: 変数 ${name} を宣言している。宣言してよいのは ${MENTION_CUSTOMS.join('・')} だけ（トークンの再定義は不可）`);
  }
}
const customOf = (status, withForced = false) => {
  const applied = [];
  rules.forEach((rule, order) => {
    const entries = Object.entries(rule.declarations).filter(([name]) => name.startsWith('--'));
    if (entries.length === 0 || !(rule.media === null || (withForced && rule.media === FORCED))) return;
    for (const selector of rule.selectors) {
      const classes = stateClasses(selector);
      if (classes && classes.every((name) => elementClasses[status].includes(name))) applied.push({ specificity: classes.length, order, entries });
    }
  });
  applied.sort((a, b) => a.specificity - b.specificity || a.order - b.order);
  return Object.fromEntries(applied.flatMap((item) => item.entries));
};
const declared = Object.fromEntries(statuses.map((status) => [status, customOf(status)]));

// (d) 強制配色の本人。規則・宣言が必ずあること（宣言が消えても forced-color-adjust: none だけが残ると、系統色を使わない札になる）。
{
  const forcedSelf = rules.filter((rule) => rule.media === FORCED && rule.selectors.length === 1 && rule.selectors[0] === FORCED_SELF);
  if (forcedSelf.length === 0) fail(`強制配色の本人の規則（@media ${FORCED} ${FORCED_SELF}）がない`);
  const merged = Object.assign({}, ...forcedSelf.map((rule) => rule.declarations));
  for (const [name, value] of Object.entries({ 'forced-color-adjust': 'none', ...FORCED_CUSTOMS })) {
    if (merged[name] !== value) fail(`強制配色の本人: ${name}: ${value} がない（${merged[name] ?? '宣言なし'}）`);
  }
  for (const property of ['color', 'background']) {
    if (property in merged) fail(`強制配色の本人: ${property} を直に書かない。リンクの札の color（a.koyori-mention[href]）に負ける。--koyori-mention-${property} で上書きする`);
  }
  // 強制配色の規則が、同じ詳細度の後ろの規則に上書きされないこと（宣言の順で負けると、本人の札が系統色を使わない）。
  const winner = customOf('self', true);
  for (const [name, value] of Object.entries(FORCED_CUSTOMS)) {
    if (winner[name] !== value) fail(`強制配色の本人: ${name} の効く値が ${winner[name] ?? '宣言なし'} になる（${value} でなければならない。詳細度か宣言の順で別の規則に負けている）`);
  }
}

const finite = (label, value) => {
  if (Number.isFinite(value)) return true;
  fail(`${label}: 値が数にならない（${value}）`);
  return false;
};
const tokenName = (value) => /^var\(--koyori-color-([a-z-]+)\)$/.exec(value ?? '')?.[1];
const over = (foreground, alpha, background) => foreground.map((channel, index) => alpha * channel + (1 - alpha) * background[index]);
const fixed = (value) => value.toFixed(2);

const GRAY = ['outside', 'gone', 'unknown'];
// 説明の地（surface）とカードの地（surface-raised）。地なしの状態は、この両方の上で測る。
const BACKDROPS = ['surface', 'surface-raised'];

const table = [];
for (const [themeName, tokens] of themes) {
  const hexOf = (status, label, name) => {
    const color = tokens[name];
    if (!/^#[0-9a-f]{6}$/.test(color ?? '')) {
      fail(`${status}（${themeName}）: ${label} の --koyori-color-${name} は不透明な 6 桁の hex でない（${color ?? '未定義'}）`);
      return undefined;
    }
    return color;
  };
  const resolveToken = (status, property) => {
    const value = declared[status][property];
    const name = tokenName(value);
    if (!name) {
      fail(`${status}（${themeName}）: ${property} は var(--koyori-color-…) だけを許す（${value ?? '宣言なし'}）。地は不透明なトークンにする`);
      return undefined;
    }
    return hexOf(status, property, name);
  };
  const backdropColors = BACKDROPS.map((name) => [name, hexOf('地', name, name)]);
  for (const status of statuses) {
    const gray = GRAY.includes(status);
    const color = resolveToken(status, '--koyori-mention-color');
    const line = declared[status]['--koyori-mention-decoration-line'];
    const style = declared[status]['--koyori-mention-decoration-style'];
    const decorationValue = declared[status]['--koyori-mention-decoration-color'];
    if (gray) {
      const background = declared[status]['--koyori-mention-background'];
      if (background !== 'transparent') fail(`${status}（${themeName}）: 地なしの状態に地がある（${background ?? '宣言なし'}）。外れた者・退会した者・名の引けぬ者は地を敷かない`);
      if (line !== 'underline') fail(`${status}（${themeName}）: decoration-line が underline でない（${line}）。色の薄さだけで分けない`);
      if (style !== 'dashed') fail(`${status}（${themeName}）: decoration-style が dashed でない（${style}）。色の薄さだけで分けない`);
      const decoration = tokenName(decorationValue) ? resolveToken(status, '--koyori-mention-decoration-color') : undefined;
      if (!tokenName(decorationValue)) fail(`${status}（${themeName}）: --koyori-mention-decoration-color は var(--koyori-color-…) だけを許す（${decorationValue ?? '宣言なし'}）`);
      for (const [backdropName, backdrop] of backdropColors) {
        const row = { theme: themeName, status, backdrop: backdropName };
        table.push(row);
        if (!backdrop) continue;
        if (color) {
          row.text = contrast(color, backdrop);
          if (finite(`${status}（${themeName}・${backdropName}）: 字と地の対比`, row.text) && !(row.text >= 4.5)) fail(`${status}（${themeName}・${backdropName}）: 字と地 ${fixed(row.text)}:1 < 4.5`);
        }
        if (decoration) {
          row.line = contrast(decoration, backdrop);
          if (finite(`${status}（${themeName}・${backdropName}）: 下線と地の対比`, row.line) && !(row.line >= 3)) fail(`${status}（${themeName}・${backdropName}）: 下線と地 ${fixed(row.line)}:1 < 3`);
        }
      }
    } else {
      const background = resolveToken(status, '--koyori-mention-background');
      const row = { theme: themeName, status, backgroundName: tokenName(declared[status]['--koyori-mention-background']) };
      table.push(row);
      if (line !== 'none') fail(`${status}（${themeName}）: decoration-line が none でない（${line}）`);
      if (style !== 'solid') fail(`${status}（${themeName}）: decoration-style が solid でない（${style}）`);
      if (decorationValue !== 'currentcolor') fail(`${status}（${themeName}）: decoration-color が currentcolor でない（${decorationValue}）`);
      if (color && background) {
        row.text = contrast(color, background);
        if (finite(`${status}（${themeName}）: 字と地の対比`, row.text) && !(row.text >= 4.5)) fail(`${status}（${themeName}）: 字と地 ${fixed(row.text)}:1 < 4.5`);
      }
    }
  }
  // self は member と地も字の色も違う（輝度だけでは分かれないので、色相と太さで分ける）。
  const memberBackground = resolveToken('member', '--koyori-mention-background');
  const selfBackground = resolveToken('self', '--koyori-mention-background');
  if (memberBackground && selfBackground && memberBackground === selfBackground) fail(`self（${themeName}）: 地が member と同じ（本人が member と分かれない）`);
  const memberColor = resolveToken('member', '--koyori-mention-color');
  const selfColor = resolveToken('self', '--koyori-mention-color');
  if (memberColor && selfColor && memberColor === selfColor) fail(`self（${themeName}）: 字の色が member と同じ（本人が member と分かれない）`);
}

console.log('| 面 | 状態 | 地 | 字 / 地 | 下線 / 地 |');
console.log('| --- | --- | --- | --- | --- |');
for (const row of table) {
  const cell = (value) => (value === undefined ? '—' : fixed(value));
  console.log(`| ${row.theme} | ${row.status} | ${row.backdrop ?? row.backgroundName ?? '—'} | ${cell(row.text)} | ${cell(row.line)} |`);
}

if (failures.length > 0) {
  console.error(`\n${failures.length} 件の失敗:\n${failures.map((message) => `- ${message}`).join('\n')}`);
  process.exit(1);
}
console.log('A: 明暗 2 面 × 5 状態の対比（字・下線。地なしの状態は surface と surface-raised の両方）と、地が不透明なトークンか地なしであることを確認しました。');

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
    [/a\.koyori-mention\[href\]\{/, 'リンクの札'],
    [/a\.koyori-mention\[href\]:hover\{/, 'ホバー'],
  ]) assert.match(css, pattern, `${framework}: dist/style.css に ${label} の規則がある`);
  assert.doesNotMatch(css, /koyori-mention-avatar/, `${framework}: dist/style.css に消した koyori-mention-avatar の規則が残っていない`);
  // メンション用のトークン 4 つが明暗の 2 回ずつ。--koyori-color-mention: は -mention-subtle: に当たらないよう、直後のコロンまで含めて数える。
  for (const token of ['--koyori-color-mention:', '--koyori-color-mention-subtle:', '--koyori-color-mention-self:', '--koyori-color-mention-self-subtle:']) {
    assert.equal(css.split(token).length - 1, 2, `${framework}: dist/style.css に ${token} が明暗の 2 回ある`);
  }
  assert.equal((css.match(/--koyori-font-family:/g) || []).length, 1, `${framework}: トークンは配布 CSS に 1 回だけ`);
  assert.match(read(indexPath), /^import '\.\/generated\/components\/Mention\/mention\.css';/m, `${framework}: 公開エントリーが mention.css を読み込む`);
}
console.log('B: 両方の dist/style.css に固定 class の規則とメンション用のトークン（明暗）があり、アバターの規則が残らず、トークンの重複がなく、index.ts が mention.css を読み込むことを確認しました。');

// ---------- C. サーバー描画（部品の出力 = 固定 class の HTML） ----------

// <!--…--> を消し、各開始タグの属性を名前順に並べる。React の `/>` は閉じタグなしの形に、
// Vue が `alt` と出す空値の属性は `alt=""` の形に揃える（HTML では同じ意味）。
function normalize(html) {
  return html.replace(/<!--[\s\S]*?-->/g, '').replace(/<([a-zA-Z][\w-]*)((?:\s+[^\s=>/]+(?:="[^"]*")?)*)\s*\/?>/g, (_tag, name, attributes) => {
    const list = [...attributes.matchAll(/([^\s=]+)(?:="([^"]*)")?/g)].map((match) => `${match[1]}="${match[2] ?? ''}"`).sort();
    return `<${name}${list.map((attribute) => ` ${attribute}`).join('')}>`;
  });
}

// 期待する HTML は文字列で書く（mentionClassNames は使わない）。
const expectedHtml = ({ classes, tag = 'span', href, label }) => `<${tag} class="${classes}"${href ? ` href="${href}"` : ''}><span class="koyori-mention-label">${label}</span></${tag}>`;
const cases = [
  ['member', { label: '@aki' },
    { classes: 'koyori-mention koyori-mention-member', label: '@aki' }],
  ['member + href', { label: '@taro', href: '/acme/users/1' },
    { classes: 'koyori-mention koyori-mention-member', tag: 'a', href: '/acme/users/1', label: '@taro' }],
  ['member + self', { label: '@aki', self: true },
    { classes: 'koyori-mention koyori-mention-member koyori-mention-self', label: '@aki' }],
  ['self + href', { label: '@aki', self: true, href: '/acme/users/2' },
    { classes: 'koyori-mention koyori-mention-member koyori-mention-self', tag: 'a', href: '/acme/users/2', label: '@aki' }],
  ['outside', { label: '@hanako', status: 'outside' },
    { classes: 'koyori-mention koyori-mention-outside', label: '@hanako' }],
  ['outside + href', { label: '@hanako', status: 'outside', href: '/acme/users/3' },
    { classes: 'koyori-mention koyori-mention-outside', tag: 'a', href: '/acme/users/3', label: '@hanako' }],
  ['gone', { label: '@（退会した利用者）', status: 'gone' },
    { classes: 'koyori-mention koyori-mention-gone', label: '@（退会した利用者）' }],
  ['unknown', { label: '@（不明な利用者）', status: 'unknown' },
    { classes: 'koyori-mention koyori-mention-unknown', label: '@（不明な利用者）' }],
  ['outside では self が付かない', { label: '@hanako', status: 'outside', self: true },
    { classes: 'koyori-mention koyori-mention-outside', label: '@hanako' }],
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
      const react = normalize(renderToStaticMarkup(createElement(reactUi.Mention, props)));
      assert.equal(vue, want, `Vue（${name}）: 部品の出力が固定 class の HTML と一致する`);
      assert.equal(react, want, `React（${name}）: 部品の出力が固定 class の HTML と一致する`);
      // label の前後に空白が入らない。
      const inner = /<span class="koyori-mention-label">([^<]*)<\/span>/.exec(vue)?.[1];
      assert.equal(inner, props.label, `Vue（${name}）: label の中身が label と完全一致する`);
      assert.equal(/<span class="koyori-mention-label">([^<]*)<\/span>/.exec(react)?.[1], props.label, `React（${name}）: label の中身が label と完全一致する`);
    }

    // class・data-*・title は根の要素に付く。根が fragment（v-if が 2 つ並ぶ形）だと、Vue は非 props 属性を落として警告する。
    // React の部品は宣言した props だけを描く（ほかの部品と同じ）ので、ここでは Vue だけを見る。
    for (const [name, props, tag] of [
      ['span', { label: '@aki' }, 'span'],
      ['a（href）', { label: '@taro', href: '/acme/users/1' }, 'a'],
      ['self', { label: '@aki', self: true }, 'span'],
    ]) {
      const html = await renderToString(createSSRApp(vueUi.Mention, { ...props, class: 'extra', 'data-case': 'x', title: '補足' }));
      const open = new RegExp(`^<${tag}\\s([^>]*)>`).exec(html)?.[1];
      assert(open, `Vue（${name}）: 根の要素が <${tag}> である（${html.slice(0, 60)}）`);
      assert.match(open, /class="koyori-mention [^"]*\bextra\b[^"]*"/, `Vue（${name}）: 渡した class が根の要素の class に足される`);
      assert.match(open, /data-case="x"/, `Vue（${name}）: 渡した data-* が根の要素に付く`);
      assert.match(open, /title="補足"/, `Vue（${name}）: 渡した title が根の要素に付く`);
    }

    for (const [name, ui] of [['Vue', vueUi], ['React', reactUi]]) {
      const { mentionClassNames, MENTION_CLASS_NAMES } = ui;
      assert.deepEqual(mentionClassNames(undefined), ['koyori-mention', 'koyori-mention-member'], `${name}: 省略は member`);
      assert.deepEqual(mentionClassNames(null), ['koyori-mention', 'koyori-mention-member'], `${name}: null は member`);
      assert.deepEqual(mentionClassNames('weird'), ['koyori-mention', 'koyori-mention-unknown'], `${name}: 知らない値は unknown`);
      assert.deepEqual(mentionClassNames('constructor'), ['koyori-mention', 'koyori-mention-unknown'], `${name}: Object の継承の名も unknown`);
      assert.deepEqual(mentionClassNames('__proto__'), ['koyori-mention', 'koyori-mention-unknown'], `${name}: __proto__ も unknown`);
      assert.deepEqual(mentionClassNames('gone', true), ['koyori-mention', 'koyori-mention-gone'], `${name}: member 以外に self を付けない`);
      assert.deepEqual(mentionClassNames('member', true), ['koyori-mention', 'koyori-mention-member', 'koyori-mention-self'], `${name}: member には self を付ける`);

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
  // 強制配色の Highlight は半透明のことがある（Chromium は α 0.8）。地は Canvas に重ねた実効色で対比を取る。
  const parseRgba = (value) => {
    const match = /^rgba?\((\d+), (\d+), (\d+)(?:, ([\d.]+))?\)$/.exec(value);
    assert(match, `rgb() を読めない: ${value}`);
    return { rgb: match.slice(1, 4).map(Number), alpha: match[4] === undefined ? 1 : Number(match[4]) };
  };
  const flatten = (value, canvas) => {
    const { rgb, alpha } = parseRgba(value);
    return over(rgb, alpha, parseRgba(canvas).rgb);
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
      // 札の算出スタイル。地を塗った枠（[data-backdrop]）ごとに、[data-case] の札を `${backdrop}/${case}` のキーで集める。
      const collect = () => page.evaluate(() => {
        const chipProperties = ['display', 'color', 'backgroundColor', 'textDecorationLine', 'textDecorationStyle', 'textDecorationColor', 'textUnderlineOffset', 'borderTopLeftRadius', 'borderBottomRightRadius', 'paddingTop', 'paddingLeft', 'paddingRight', 'fontWeight'];
        const pick = (element, properties) => Object.fromEntries(properties.map((name) => [name, getComputedStyle(element)[name]]));
        return Object.fromEntries([...document.querySelectorAll('#storybook-root [data-backdrop] [data-case]')].map((item) => {
          const chip = item.querySelector('.koyori-mention');
          const frame = item.closest('[data-backdrop]');
          const rect = chip.getBoundingClientRect();
          const key = `${frame.getAttribute('data-backdrop')}/${item.getAttribute('data-case')}`;
          return [key, { chip: { ...pick(chip, chipProperties), width: rect.width, height: rect.height }, backdrop: getComputedStyle(frame).backgroundColor }];
        }));
      });
      const a11y = async (name) => {
        // addon が window.axe を差し替えることがあるので、自前の参照を持つ。
        await page.addScriptTag({ content: `${axeSource}\nwindow.mentionAxe = window.axe;` });
        const violations = await page.evaluate(async () => (await window.mentionAxe.run(document.querySelector('#storybook-root'))).violations.map((v) => ({ id: v.id, targets: v.nodes.map((n) => n.target) })));
        assert.deepEqual(violations, [], `${framework}/${name}: axe の違反`);
      };

      const ids = ['member', 'self', 'outside', 'gone', 'unknown'];
      const backdrops = ['surface', 'surface-raised'];
      const keys = backdrops.flatMap((backdrop) => ids.map((id) => `${backdrop}/${id}`));
      const isGray = (id) => ['outside', 'gone', 'unknown'].includes(id);
      // 札の実効の地。地なし（α 0）なら枠の地、不透明（α 1）ならその色。半透明の地は対比が枠に左右されるので失敗にする。
      const effectiveBackground = (chip, backdrop, label) => {
        const { rgb, alpha } = parseRgba(chip.backgroundColor);
        if (alpha === 0) return parseRgba(backdrop).rgb;
        assert.equal(alpha, 1, `${label}: 半透明の地（${chip.backgroundColor}）`);
        return rgb;
      };
      for (const [part, html, theme] of [['states', 'fixed-class-html', '墨'], ['states-light', 'fixed-class-html-light', 'ライト']]) {
        await open(part);
        const component = await collect();
        await open(html);
        const fixedHtml = await collect();
        assert.deepEqual(Object.keys(component), keys, `${framework}（${theme}）: 札の並び`);
        assert.deepEqual(fixedHtml, component, `${framework}（${theme}）: 部品と固定 class の HTML の算出スタイルが一致する`);
        for (const key of keys) {
          const id = key.split('/')[1];
          const { chip, backdrop } = component[key];
          const label = `${framework}（${theme}）${key}`;
          assert.equal(chip.display, 'inline', `${label}: 札は inline`);
          assert.equal(chip.paddingTop, '0px', `${label}: 上下の padding を持たない`);
          assert.equal(chip.paddingLeft, '3px', `${label}: 左の padding`);
          assert.equal(chip.paddingRight, '3px', `${label}: 右の padding`);
          assert.equal(chip.borderTopLeftRadius, '4px', `${label}: 角丸 4px`);
          assert.equal(chip.fontWeight, id === 'self' ? '600' : id === 'member' ? '500' : chip.fontWeight, `${label}: 字の太さ`);
          const ratio = contrastRgb(parseRgb(chip.color), effectiveBackground(chip, backdrop, label));
          assert(ratio >= 4.5, `${label}: 算出色の字と実効の地 ${fixed(ratio)}:1 < 4.5`);
          if (isGray(id)) {
            assert.equal(chip.backgroundColor, 'rgba(0, 0, 0, 0)', `${label}: 地なし`);
            assert.equal(chip.textDecorationLine, 'underline', `${label}: 下線`);
            assert.equal(chip.textDecorationStyle, 'dashed', `${label}: 破線（色の薄さだけで分けない）`);
            const line = contrastRgb(parseRgb(chip.textDecorationColor), parseRgb(backdrop));
            assert(line >= 3, `${label}: 下線と枠の地 ${fixed(line)}:1 < 3`);
          } else {
            assert.equal(chip.textDecorationLine, 'none', `${label}: 下線なし`);
          }
        }
        for (const backdrop of backdrops) {
          const self = component[`${backdrop}/self`].chip;
          const member = component[`${backdrop}/member`].chip;
          assert.notEqual(self.backgroundColor, member.backgroundColor, `${framework}（${theme}・${backdrop}）: self の地が member と違う`);
          assert.notEqual(self.color, member.color, `${framework}（${theme}・${backdrop}）: self の字の色が member と違う`);
        }
      }

      // リンクの札の算出色。ストーリーの順に並べる。
      const collectLinks = () => page.evaluate(() => [...document.querySelectorAll('#storybook-root a.koyori-mention')].map((link) => ({
        kind: link.classList.contains('koyori-mention-self') ? 'self' : link.classList.contains('koyori-mention-outside') ? 'outside' : 'member',
        color: getComputedStyle(link).color,
        backgroundColor: getComputedStyle(link).backgroundColor,
        backdrop: getComputedStyle(link.closest('[data-backdrop]')).backgroundColor,
      })));
      // 強制配色の系統色の算出値。forced-color-adjust: none の要素で読む。
      const systemColors = () => page.evaluate(() => {
        const probe = document.createElement('div');
        probe.style.cssText = 'forced-color-adjust: none; color: HighlightText; background-color: Highlight';
        document.querySelector('#storybook-root').append(probe);
        const { color, backgroundColor } = getComputedStyle(probe);
        probe.style.backgroundColor = 'Canvas';
        probe.style.color = 'CanvasText';
        const canvas = getComputedStyle(probe).backgroundColor;
        const canvasText = getComputedStyle(probe).color;
        probe.remove();
        return { highlightText: color, highlight: backgroundColor, canvas, canvasText };
      });

      // リンクの札も、算出色の字と地が 4.5:1 以上（本人のリンクを含む）。地なしの札は枠の地で測る。
      await open('link');
      const links = await collectLinks();
      assert.deepEqual(links.map((item) => item.kind), ['member', 'self', 'outside'], `${framework}: リンクの札の並び（member・self・outside）`);
      for (const item of links) {
        const { rgb, alpha } = parseRgba(item.backgroundColor);
        const ratio = contrastRgb(parseRgb(item.color), alpha === 0 ? parseRgb(item.backdrop) : rgb);
        assert(ratio >= 4.5, `${framework}: リンクの札（${item.kind}）の算出色の字と実効の地 ${fixed(ratio)}:1 < 4.5`);
      }

      // 強制配色でも self が member と見分けられ、字が読める。リンクの札も同じ。フォーカスの輪は札の外（Canvas の上）に描かれるので、
      // forced-color-adjust: none の本人でも輪が Canvas と 3:1 以上で見えること。系統色は明暗で変わるので、両方の配色で確かめる。
      for (const scheme of ['light', 'dark']) {
        const tag = `${framework}（強制配色・${scheme === 'light' ? 'ライト系' : 'ダーク系'}）`;
        await open('states');
        await page.emulateMedia({ forcedColors: 'active', colorScheme: scheme });
        const system = await systemColors();
        const forced = await collect();
        for (const backdrop of backdrops) {
          const self = forced[`${backdrop}/self`].chip;
          assert.notEqual(self.backgroundColor, forced[`${backdrop}/member`].chip.backgroundColor, `${tag}・${backdrop}: self の地が member と違う`);
          assert.equal(self.color, system.highlightText, `${tag}・${backdrop}: self の字が HighlightText`);
          assert.equal(self.backgroundColor, system.highlight, `${tag}・${backdrop}: self の地が Highlight`);
        }
        for (const key of keys) {
          const id = key.split('/')[1];
          const { chip } = forced[key];
          const ratio = contrastRgb(flatten(chip.color, system.canvas), flatten(chip.backgroundColor, system.canvas));
          assert(ratio >= 4.5, `${tag}: ${key} の字と地 ${fixed(ratio)}:1 < 4.5`);
          if (isGray(id)) {
            assert.equal(chip.textDecorationLine, 'underline', `${tag}: ${key} の下線（色だけで分けない）`);
            assert.equal(chip.textDecorationStyle, 'dashed', `${tag}: ${key} の破線（色だけで分けない）`);
          }
        }
        await open('link');
        const forcedLinks = await collectLinks();
        for (const item of forcedLinks) {
          const ratio = contrastRgb(flatten(item.color, system.canvas), flatten(item.backgroundColor, system.canvas));
          assert(ratio >= 4.5, `${tag}: リンクの札（${item.kind}）の字と地 ${fixed(ratio)}:1 < 4.5`);
        }
        const selfLink = forcedLinks.find((item) => item.kind === 'self');
        assert.equal(selfLink.color, system.highlightText, `${tag}: self のリンクの札の字が HighlightText`);
        assert.equal(selfLink.backgroundColor, system.highlight, `${tag}: self のリンクの札の地が Highlight`);
        // Tab で 1 つ目（member）→ 2 つ目（self）→ 3 つ目（outside）の順にフォーカスし、輪の色を読む。
        for (const item of forcedLinks) {
          await page.keyboard.press('Tab');
          const ring = await page.evaluate(() => {
            const active = document.activeElement;
            const kind = active?.classList.contains('koyori-mention-self') ? 'self' : active?.classList.contains('koyori-mention-outside') ? 'outside' : 'member';
            return { kind, style: getComputedStyle(active).outlineStyle, color: getComputedStyle(active).outlineColor };
          });
          assert.equal(ring.kind, item.kind, `${tag}: Tab の順（${item.kind}）`);
          assert.equal(ring.style, 'solid', `${tag}: ${item.kind} のリンクの札に輪が出る`);
          // 本人は forced-color-adjust: none なので、輪の色を自分で CanvasText にしている。ほかはブラウザーが系統色に置き換える。
          if (item.kind === 'self') assert.equal(ring.color, system.canvasText, `${tag}: self のリンクの輪が CanvasText（${ring.color}）`);
          const ratio = contrastRgb(flatten(ring.color, system.canvas), flatten(system.canvas, system.canvas));
          assert(ratio >= 3, `${tag}: ${item.kind} のリンクの輪と Canvas ${fixed(ratio)}:1 < 3`);
        }
      }
      await page.emulateMedia({ forcedColors: 'none', colorScheme: null });

      // 札で行の高さを広げない。
      // Inter・Noto Sans JP は同梱しない Web フォントなので、入っていない環境では太さごとに別のフォールバックの書体
      // （上下の余白の違うもの）が選ばれる。既定の書体のままの測定（下の前半）で、そのフォールバックでも行が伸びないことを見て、
      // 後半では書体を 1 つに固めて、札の箱そのものが行を広げるかだけを見る。
      await open('in-text');
      // 書体を固めない既定の書体設定（--koyori-font-family）のままの測定。Inter・Noto Sans JP が無くフォールバックする環境でも、
      // 札の字の書体が行を伸ばさないこと（札の line-height が本文より大きいと、札のある行だけ高くなる）。
      // 本文 14px・行高 20px の段落に、全状態・本人・日本語の名の札を 1 つずつ入れ、札を入れない同じ字の段落と高さを比べる。
      const defaultFontRows = await page.evaluate(() => {
        const cases = [
          ['member', 'koyori-mention-member', '@aki'], ['self', 'koyori-mention-member koyori-mention-self', '@aki'],
          ['outside', 'koyori-mention-outside', '@aki'], ['gone', 'koyori-mention-gone', '@aki'], ['unknown', 'koyori-mention-unknown', '@aki'],
          ['member', 'koyori-mention-member', '@山田 太郎'], ['self', 'koyori-mention-member koyori-mention-self', '@山田 太郎'],
          ['gone', 'koyori-mention-gone', '@（退会した利用者）'], ['unknown', 'koyori-mention-unknown', '@（退会した利用者）'], ['outside', 'koyori-mention-outside', '@（退会した利用者）'],
        ];
        const frame = document.querySelector('#storybook-root [data-backdrop]');
        const wrap = document.createElement('div');
        wrap.style.cssText = 'width: 480px; font-family: var(--koyori-font-family); font-size: 14px; line-height: 20px';
        frame.append(wrap);
        const paragraph = (html) => {
          const p = document.createElement('p');
          p.style.margin = '0';
          p.innerHTML = html;
          wrap.append(p);
          return p;
        };
        const rows = cases.map(([status, classes, label]) => {
          const withChip = paragraph(`担当は <span class="koyori-mention ${classes}"><span class="koyori-mention-label">${label}</span></span> さんです。`);
          const plain = paragraph(`担当は ${label} さんです。`);
          return { status, label, withChip: withChip.getBoundingClientRect().height, plain: plain.getBoundingClientRect().height, chip: withChip.querySelector('.koyori-mention').getBoundingClientRect().height };
        });
        wrap.remove();
        return rows;
      });
      for (const row of defaultFontRows) {
        assert.equal(row.withChip, row.plain, `${framework}: 既定の書体で、札（${row.status}・${row.label}）のある行の高さ ${row.withChip}px が札の無い行 ${row.plain}px と違う`);
        assert.equal(row.plain, 20, `${framework}: 既定の書体で、本文の行の高さが 20px（${row.plain}px）`);
      }
      // 札の地は字の内容の高さに敷かれる（inline の地は line-height に左右されない）。line-height を替えても地の見える高さが変わらないこと。
      const chipHeightAt = (lineHeight) => page.evaluate((value) => {
        const wrap = document.createElement('div');
        wrap.style.cssText = `width: 480px; font-family: var(--koyori-font-family); font-size: 14px; line-height: ${value}`;
        wrap.innerHTML = '<p style="margin: 0">担当は <span class="koyori-mention koyori-mention-member"><span class="koyori-mention-label">@aki</span></span> さんです。</p>';
        document.querySelector('#storybook-root [data-backdrop]').append(wrap);
        const height = wrap.querySelector('.koyori-mention').getBoundingClientRect().height;
        wrap.remove();
        return height;
      }, lineHeight);
      assert.equal(await chipHeightAt('1'), await chipHeightAt('20px'), `${framework}: 札の地の高さが line-height で変わらない`);
      // 書体を 1 つに固めた測定。フォールバックの書体差を除いて、札の箱そのものが行を広げないことを見る。
      await page.addStyleTag({ content: '#storybook-root * { font-family: "Noto Sans CJK JP", "Noto Sans JP", sans-serif !important; }' });
      const withMention = await page.getByTestId('with').boundingBox();
      const without = await page.getByTestId('without').boundingBox();
      assert.equal(withMention.height, without.height, `${framework}: 書体を固めて、札のある行と無い行で段落の高さが同じ`);

      // リンクの札。フォーカスの輪・ホバーの下線・Enter での遷移。
      await open('link');
      const decoration = (locator) => locator.evaluate((el) => ({ line: getComputedStyle(el).textDecorationLine, style: getComputedStyle(el).textDecorationStyle }));
      const link = page.locator('#storybook-root a.koyori-mention-member').first();
      const outsideLink = page.locator('#storybook-root a.koyori-mention-outside').first();
      assert.deepEqual(await decoration(link), { line: 'none', style: 'solid' }, `${framework}: member はホバー前は下線なし`);
      assert.deepEqual(await decoration(outsideLink), { line: 'underline', style: 'dashed' }, `${framework}: outside はホバー前から破線の下線`);
      await page.keyboard.press('Tab');
      assert(await link.evaluate((el) => el === document.activeElement), `${framework}: Tab で札にフォーカスが当たる`);
      const outline = await link.evaluate((el) => ({ style: getComputedStyle(el).outlineStyle, width: getComputedStyle(el).outlineWidth }));
      assert.deepEqual(outline, { style: 'solid', width: '2px' }, `${framework}: フォーカスの輪は 2px solid`);
      await page.keyboard.press('Enter');
      await page.waitForFunction(() => location.hash === '#mention-taro');
      await page.mouse.move(0, 0);
      await link.hover();
      assert.deepEqual(await decoration(link), { line: 'underline', style: 'solid' }, `${framework}: member はホバーで実線の下線`);
      await page.mouse.move(0, 0);
      await outsideLink.hover();
      assert.deepEqual(await decoration(outsideLink), { line: 'underline', style: 'dashed' }, `${framework}: outside はホバーしても破線のまま`);

      for (const name of stories) {
        await open(name);
        await a11y(name);
      }
      assert.deepEqual(errors, [], `${framework}: コンソールのエラー・警告`);
      await page.close();
      console.log(`D（${framework}）: 部品と固定 class の HTML の算出スタイル（明暗・説明とコメントの地）・算出色の対比と下線（リンクの札を含む）・強制配色（明暗両方。リンクの札とフォーカスの輪を含む）・行の高さ（既定の書体と固めた書体の両方）・リンクの操作・axe を確認しました。`);
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
