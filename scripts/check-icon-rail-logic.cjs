// No browser needed: node scripts/check-icon-rail-logic.cjs
// IconRailItem の長押しの判定（経過・移動量・ポインターの種類・click を捨てる回数）の境界を確かめる。
const assert = require('node:assert/strict');
const { mkdtempSync, rmSync } = require('node:fs');
const { execFileSync } = require('node:child_process');
const { tmpdir } = require('node:os');
const { join, resolve } = require('node:path');
const compiled = mkdtempSync(join(tmpdir(), 'koyori-icon-rail-logic-'));
let logic;
try {
  execFileSync(process.execPath, [require.resolve('typescript/bin/tsc'), '--ignoreConfig',
    '--module', 'commonjs', '--target', 'ES2022', '--skipLibCheck', '--lib', 'ES2022,DOM', '--outDir', compiled,
    resolve(__dirname, '../components/IconRailItem/icon-rail-item.ts')], { stdio: 'inherit' });
  logic = require(join(compiled, 'IconRailItem/icon-rail-item.js'));
} finally {
  rmSync(compiled, { recursive: true, force: true });
}
const { LONG_PRESS_DELAY, LONG_PRESS_TOLERANCE, longPressTracker, startsLongPress, longPressMoved, longPressElapsed } = logic;

assert.equal(LONG_PRESS_DELAY, 500);
assert.equal(LONG_PRESS_TOLERANCE, 10);

// 経過: 499ms では起きず、500ms で起きる。
assert.equal(longPressElapsed(1000, 1499), false);
assert.equal(longPressElapsed(1000, 1500), true);
{
  const press = longPressTracker();
  assert.equal(press.down('touch', 0, 0, 1000), true);
  assert.equal(press.tick(1499), false, '499ms では起きない');
  assert.equal(press.tick(1500), true, '500ms で起きる');
  assert.equal(press.tick(1600), false, '1 回の長押しで 1 回だけ');
}

// 移動: 10px ちょうどは続き、10px を超えると取り消す。
assert.equal(longPressMoved({ x: 0, y: 0 }, { x: 10, y: 0 }), false);
assert.equal(longPressMoved({ x: 0, y: 0 }, { x: 6, y: 8 }), false, '斜めの 10px ちょうど');
assert.equal(longPressMoved({ x: 0, y: 0 }, { x: 10.01, y: 0 }), true);
{
  const press = longPressTracker();
  press.down('touch', 100, 100, 0);
  press.move(110, 100);
  assert.equal(press.tick(500), true, '10px ちょうどの移動では続く');
}
{
  const press = longPressTracker();
  press.down('touch', 100, 100, 0);
  press.move(100, 111);
  assert.equal(press.tick(500), false, '10px を超えて動いたら取り消す');
  assert.equal(press.click(), false, '取り消した長押しのあとの click は捨てない');
}
{
  // 一度超えたら、戻ってきても取り消したまま。
  const press = longPressTracker();
  press.down('touch', 0, 0, 0);
  press.move(20, 0);
  press.move(0, 0);
  assert.equal(press.tick(600), false);
}

// ポインターの種類: マウスとペンでは起きない。
assert.equal(startsLongPress('touch'), true);
for (const type of ['mouse', 'pen', '']) {
  assert.equal(startsLongPress(type), false, type);
  const press = longPressTracker();
  assert.equal(press.down(type, 0, 0, 0), false, `${type} は長押しを数えない`);
  assert.equal(press.tick(10000), false, `${type} では起きない`);
  assert.equal(press.touching, false);
}

// 長押しのあとの click は 1 回だけ捨てる。
{
  const press = longPressTracker();
  press.down('touch', 0, 0, 0);
  assert.equal(press.touching, true, '押している間は Android の contextmenu を止める');
  press.tick(500);
  press.up();
  assert.equal(press.touching, true, '長押しの直後の contextmenu も止める');
  assert.equal(press.click(), true, '長押しのあとの click は捨てる');
  assert.equal(press.click(), false, '捨てるのは 1 回だけ');
  assert.equal(press.touching, false);
}
{
  // 指を離す前に時間に届かなければ、click は捨てない。
  const press = longPressTracker();
  press.down('touch', 0, 0, 0);
  press.tick(499);
  press.up();
  assert.equal(press.tick(500), false, '離したあとは起きない');
  assert.equal(press.click(), false);
}
{
  // 長押しのあと click が来ないまま次に押したら、捨てる予定を持ち越さない。キーボードの操作でも取り消す。
  const press = longPressTracker();
  press.down('touch', 0, 0, 0);
  press.tick(500);
  press.up();
  press.down('mouse', 0, 0, 1000);
  assert.equal(press.click(), false, '次の押下で取り消す');
  press.down('touch', 0, 0, 2000);
  press.tick(2500);
  press.reset();
  assert.equal(press.click(), false, 'reset で取り消す');
}

console.log('IconRailItem の長押しの判定（500ms・10px・タッチだけ・click を 1 回捨てる）を確認しました。');
