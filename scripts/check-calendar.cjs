// No browser needed: node scripts/check-calendar.cjs（pnpm build のあとに実行する）
const assert = require('node:assert/strict');
const { mkdtempSync, rmSync, readFileSync } = require('node:fs');
const { execFileSync } = require('node:child_process');
const { tmpdir } = require('node:os');
const { join, resolve } = require('node:path');

const root = resolve(__dirname, '..');
const compiled = mkdtempSync(join(tmpdir(), 'koyori-calendar-'));
let calendar;
try {
  execFileSync(process.execPath, [require.resolve('typescript/bin/tsc'), '--ignoreConfig',
    '--module', 'commonjs', '--target', 'ES2022', '--skipLibCheck', '--outDir', compiled,
    resolve(root, 'components/Calendar/calendar.ts')], { stdio: 'inherit' });
  calendar = require(join(compiled, 'calendar.js'));
} finally {
  rmSync(compiled, { recursive: true, force: true });
}
const {
  parseDate, formatDate, daysInMonth, addDays, addMonths, clampDate, monthGrid, moveFocus,
  weekdayLabels, formatMonth, formatFullDate, today,
} = calendar;

assert.deepEqual(parseDate('2026-09-16'), { year: 2026, month: 9, day: 16 }, '暦日を読む');
for (const text of ['2024-02-30', '2023-02-29', '2024-13-01', '2024-2-3', '', undefined]) {
  assert.equal(parseDate(text), null, `${text} は日付として扱わない`);
}
assert.equal(formatDate(2026, 9, 1), '2026-09-01', 'ゼロ埋めする');
assert.equal(daysInMonth(2024, 2), 29, '閏年の 2 月');
assert.equal(daysInMonth(2023, 2), 28, '平年の 2 月');
assert.equal(daysInMonth(1900, 2), 28, '100 で割り切れる年は平年');
assert.equal(daysInMonth(2000, 2), 29, '400 で割り切れる年は閏年');

assert.equal(addDays('2024-02-28', 1), '2024-02-29', '閏日へ進む');
assert.equal(addDays('2024-03-01', -1), '2024-02-29', '閏日へ戻る');
assert.equal(addDays('2023-12-31', 1), '2024-01-01', '年をまたぐ');
assert.equal(addDays('2026-03-08', 1), '2026-03-09', '夏時間の切り替え日でもずれない');
assert.equal(addMonths('2024-01-31', 1), '2024-02-29', '月末は移動先の月末に丸める（閏年）');
assert.equal(addMonths('2023-01-31', 1), '2023-02-28', '月末は移動先の月末に丸める（平年）');
assert.equal(addMonths('2024-12-15', 1), '2025-01-15', '翌年の 1 月へ進む');
assert.equal(addMonths('2024-01-15', -1), '2023-12-15', '前年の 12 月へ戻る');
assert.equal(addMonths('2024-02-29', 12), '2025-02-28', '閏日の翌年は 2/28');
assert.equal(addDays('9999-12-31', 1), '9999-12-31', '扱える最後の日より先へは進まない');
assert.equal(addDays('0001-01-01', -1), '0001-01-01', '扱える最初の日より前へは戻らない');
assert.equal(addMonths('9999-12-31', 1), '9999-12-31', '扱える最後の月より先へは進まない');
assert.equal(addMonths('0001-01-15', -12), '0001-01-01', '扱える最初の月より前へは戻らない');

const september = monthGrid('2026-09-16', 0);
assert.equal(september.length, 6, '常に 6 週');
assert.ok(september.every((week) => week.length === 7), '各週は 7 日');
assert.deepEqual(september[0].slice(0, 3), [null, null, '2026-09-01'], '9/1 は火曜の列');
assert.deepEqual(monthGrid('2026-09-16', 1)[0].slice(0, 2), [null, '2026-09-01'], '月曜始まりでは 2 列目');
assert.equal(monthGrid('2026-09-16', 6)[0][3], '2026-09-01', '土曜始まりでは 4 列目');
const february = monthGrid('2026-02-10', 0);
assert.equal(february[0][0], '2026-02-01', '2026/2/1 は日曜で先頭に入る');
assert.ok(february.slice(4).flat().every((date) => date === null), '4 週で埋まる月は残りが空');
assert.deepEqual(monthGrid('2024-03-10', 0)[5].filter(Boolean), ['2024-03-31'], '6 週目に 31 日だけ入る');

assert.equal(clampDate('2026-08-31', '2026-09-01', '2026-12-31'), '2026-09-01', 'min より前は min');
assert.equal(clampDate('2027-01-01', '2026-09-01', '2026-12-31'), '2026-12-31', 'max より後は max');
assert.equal(clampDate('2026-10-10', '2026-09-01', '2026-12-31'), '2026-10-10', '範囲内はそのまま');
assert.equal(clampDate('2026-10-10', '2026-09-01', '2026-09-01'), '2026-09-01', 'min と max が同じ日');
assert.equal(clampDate('2026-08-01', 'invalid'), '2026-08-01', '不正な min は無視する');
assert.equal(clampDate('2026-10-10', '2026-12-01', '2026-11-01'), '2026-12-01', 'min > max なら min を優先する');

assert.equal(moveFocus('2026-09-16', 'ArrowRight', false, 0), '2026-09-17', '→ で翌日');
assert.equal(moveFocus('2026-09-16', 'ArrowLeft', false, 0), '2026-09-15', '← で前日');
assert.equal(moveFocus('2026-09-16', 'ArrowDown', false, 0), '2026-09-23', '↓ で翌週');
assert.equal(moveFocus('2026-09-03', 'ArrowUp', false, 0), '2026-08-27', '↑ で前月の前週');
assert.equal(moveFocus('2026-09-16', 'Home', false, 0), '2026-09-13', 'Home で週の先頭');
assert.equal(moveFocus('2026-09-16', 'End', false, 0), '2026-09-19', 'End で週の末尾');
assert.equal(moveFocus('2026-09-13', 'Home', false, 1), '2026-09-07', '月曜始まりでは日曜の週の先頭は前の月曜');
assert.equal(moveFocus('2026-09-13', 'Home', false, 0), '2026-09-13', '日曜始まりでは日曜が先頭');
assert.equal(moveFocus('2026-01-31', 'PageDown', false, 0), '2026-02-28', 'PageDown で翌月の同じ日（月末は丸める）');
assert.equal(moveFocus('2024-02-29', 'PageUp', true, 0), '2023-02-28', 'Shift+PageUp で前年');
assert.equal(moveFocus('2024-02-29', 'PageDown', true, 0), '2025-02-28', 'Shift+PageDown で翌年');
assert.equal(moveFocus('2026-09-01', 'ArrowLeft', false, 0, '2026-09-01'), '2026-09-01', 'min で止まる');
assert.equal(moveFocus('2026-09-02', 'ArrowLeft', false, 0, '2026-09-01'), '2026-09-01', 'min ちょうどには入れる');
assert.equal(moveFocus('2026-12-20', 'PageDown', false, 0, undefined, '2026-12-31'), '2026-12-31', 'max を越える月送りは max で止まる');
assert.equal(moveFocus('2026-09-16', 'Enter', false, 0), null, '移動しないキーは null');
assert.equal(moveFocus('9999-12-31', 'ArrowRight', false, 0, undefined, '9999-12-31'), '9999-12-31', '最終日から先へは動かない');
assert.equal(moveFocus('0001-01-01', 'ArrowUp', false, 0, '0001-01-01'), '0001-01-01', '最初の日より前へは動かない');

assert.deepEqual(weekdayLabels('ja-JP', 1)[0], { short: '月', long: '月曜日' }, '月曜始まりの曜日');
assert.equal(weekdayLabels('en-US', 0)[0].short, 'Sun', '日曜始まりの曜日');
assert.equal(weekdayLabels('en-US', 6)[6].short, 'Fri', '土曜始まりの末尾は金曜');
assert.equal(formatMonth('2026-09-16', 'ja-JP'), '2026年9月', '月見出し（日本語）');
assert.equal(formatMonth('2026-09-16', 'en-US'), 'September 2026', '月見出し（英語）');
assert.equal(formatFullDate('2026-09-16', 'ja-JP'), '2026年9月16日水曜日', 'セルの読み上げ名');
/* セルの数字はグレゴリオ暦なので、既定が別の暦のロケールでも読み上げと食い違わせない。 */
assert.match(formatFullDate('2026-09-18', 'th-TH'), /18.*2026/, '既定が仏暦のロケールでもグレゴリオ暦で読み上げる');
assert.match(formatMonth('2026-09-18', 'th-TH'), /2026/, '既定が仏暦のロケールでも月見出しはグレゴリオ暦');
const now = new Date();
assert.equal(today(), formatDate(now.getFullYear(), now.getMonth() + 1, now.getDate()), '今日は端末のローカル日付');

const read = (path) => readFileSync(resolve(root, path), 'utf8');

for (const [name, path] of [['Vue', 'packages/vue/src/generated/components/Calendar/Calendar.vue'], ['React', 'packages/react/src/generated/components/Calendar/Calendar.tsx']]) {
  const source = read(path);
  assert.match(source, /role="grid"/, `${name} 版がグリッドとして読み上げられる`);
  assert.match(source, /aria-selected/, `${name} 版が選択状態を伝える`);
  assert.match(source, /aria-current/, `${name} 版が今日を伝える`);
  assert.match(source, /aria-live="polite"/, `${name} 版が月の変化を伝える`);
  assert.match(source, /tabIndex/, `${name} 版がフォーカスをひとつのセルに絞る`);
  assert.match(source, /data-date/, `${name} 版がセルを日付で引ける`);
  assert.match(source, /aria-disabled="?\{?\s*(view|previousDisabled|nextDisabled)/, `${name} 版が月送りを aria-disabled で止める`);
  assert.doesNotMatch(source, /[^-]\bdisabled=/, `${name} 版が disabled 属性でフォーカスを失わせない`);
}

for (const framework of ['vue', 'react']) {
  const css = read(`packages/${framework}/dist/style.css`);
  assert.match(css, /prefers-reduced-motion:reduce\)[^{]*\{\._highlight_\w+\{transition:none/, `${framework}: 動きを減らす設定でハイライトを止める（共有ルールの hover 条件併記も許容）`);
  assert.match(css, /forced-colors[^@]*_day_\w+\[aria-selected=(?:"|')?true(?:"|')?\]\{[^}]*background:\s*Highlight/i, `${framework}: 強制配色で選択日を強調色にする`);
  assert.match(css, /forced-colors[^@]*_day_\w+\[aria-current=(?:"|')?date(?:"|')?\]\{[^}]*canvastext/i, `${framework}: 強制配色で今日に枠線を引く`);
}

console.log('Calendar の日付計算、生成物、配布 CSS の規則を確認しました。');
