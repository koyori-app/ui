// No browser needed: node scripts/check-sidebar-link.cjs（pnpm build のあとに実行する）
// SidebarLink は背景色の変化だけで応える。押したときに縮めず、選ばれたアイコンを跳ねさせない。
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');

const root = resolve(__dirname, '..');
for (const framework of ['vue', 'react']) {
  const css = readFileSync(resolve(root, `packages/${framework}/dist/style.css`), 'utf8');
  // CSS Modules のハッシュは、rail の SidebarLink だけが持つ規則から取る。
  const hash = css.match(/\[data-sidebar-rail=['"]?true['"]?\] \._link_(\w+?_)\d+:has\(\._icon_/)?.[1];
  assert.ok(hash, `${framework}: SidebarLink の配布 CSS が見つかる`);
  const rules = css.match(new RegExp(`[^{}]*\\._(link|icon)_${hash}\\d+[^{}]*\\{[^}]*\\}`, 'g')) ?? [];
  assert.ok(rules.length > 0, `${framework}: SidebarLink の規則を読める`);

  assert.ok(rules.every((rule) => !/:active[^{]*\{[^}]*\btransform:/.test(rule)), `${framework}: 押した SidebarLink の transform を変えない`);
  assert.ok(rules.every((rule) => !/\btransition:[^;}]*\btransform\b/.test(rule)), `${framework}: SidebarLink は transform を遷移させない`);
  assert.ok(rules.every((rule) => !/\._icon_[^{]*\{[^}]*\banimation:/.test(rule)), `${framework}: 選ばれた SidebarLink のアイコンに animation を掛けない`);
  assert.doesNotMatch(css, /link-icon-pop/, `${framework}: 使わないアイコンの跳ねの keyframes を残さない`);

  // 背景色の遷移・動きを減らす設定・rail から広げたときのラベルの動きは残す。
  assert.ok(rules.some((rule) => /^\._link_[^{]*\{[^}]*\btransition:background-color/.test(rule)), `${framework}: 背景色の遷移を残す`);
  assert.match(css, new RegExp(`prefers-reduced-motion:reduce\\)\\{\\._link_${hash}\\d+\\{transition:none\\}`), `${framework}: 動きを減らす設定で遷移を止める`);
  assert.match(css, new RegExp(`\\._label_${hash}\\d+\\{animation:_link-label-in_`), `${framework}: rail から広げたときのラベルの動きを残す`);
}

console.log('SidebarLink の押したときと選ばれたときの動きの規則を確認しました。');
