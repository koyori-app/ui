// After pnpm build-storybook. Reuses an installed Playwright via PLAYWRIGHT_MODULE.
// COMBOBOX_TEST_PORT（既定 16312）、COMBOBOX_TEST_FRAMEWORK（react / vue のどちらか片方だけ回す）。
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { resolve } = require('node:path');
const { readdirSync } = require('node:fs');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = resolve(__dirname, '..');
const port = process.env.COMBOBOX_TEST_PORT || '16312';
const base = `http://127.0.0.1:${port}`;
const frameworks = process.env.COMBOBOX_TEST_FRAMEWORK ? [process.env.COMBOBOX_TEST_FRAMEWORK] : ['react', 'vue'];
const server = spawn('python3', ['-m', 'http.server', port, '--bind', '127.0.0.1', '--directory', root], { stdio: 'ignore' });
let browser;
(async () => {
  try {
    for (let i = 0; i < 40; i++) {
      try { if ((await fetch(base)).ok) break; } catch {}
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    browser = await chromium.launch({ headless: true });
    for (const framework of frameworks) {
      const page = await browser.newPage({ viewport: { width: 800, height: 700 } });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
      const at = text => `${framework}: ${text}`;
      const settle = (ms = 150) => page.waitForTimeout(ms);
      const input = page.getByRole('combobox');
      const fieldRoot = input.locator('xpath=../../..');
      const listbox = page.locator('[role="listbox"]');
      const panel = listbox.locator('xpath=..');
      const selected = page.locator('[role="option"][aria-selected="true"]');
      const tagRemovers = fieldRoot.locator('button[aria-label$="を外す"]');
      const log = page.locator('output[aria-label="記録"]');
      const caretOutput = page.locator('output[aria-label="位置"]');
      const next = page.getByRole('button', { name: '次の項目' });
      const helpButton = page.getByRole('button', { name: '書き方の早見表' });
      const option = name => page.getByRole('option', { name });
      const story = async (name, width = 800) => {
        await page.setViewportSize({ width, height: 700 });
        await page.goto(`${base}/packages/${framework}/storybook-static/iframe.html?id=components-combobox--${name}&viewMode=story`);
        await input.waitFor({ state: 'attached' });
        await page.waitForFunction(() => document.querySelector('[role="combobox"]')?.getAttribute('aria-controls'));
        // React の Storybook にはテーマの切り替えと地の色が無い。Vue の preview と同じ墨の地にそろえる（axe の対比の確認のため）。
        await page.evaluate(() => {
          document.documentElement.dataset.theme ||= 'dark';
          document.body.style.setProperty('background', 'var(--koyori-color-surface)', 'important');
        });
        await settle();
      };
      const expanded = () => input.getAttribute('aria-expanded');
      const focused = () => input.evaluate(el => el === document.activeElement);
      const tagCount = () => tagRemovers.count();
      const type = async text => { await input.pressSequentially(text); await settle(); };
      const snapshot = async () => ({
        log: await log.innerText(), expanded: await expanded(), active: await input.getAttribute('aria-activedescendant'),
        tags: await tagCount(), value: await input.inputValue(),
      });
      const axeCheck = async label => {
        const axe = readdirSync(`${root}/node_modules/.pnpm`).find(name => name.startsWith('axe-core@'));
        if (!await page.evaluate(() => typeof window.axe !== 'undefined')) {
          await page.addScriptTag({ path: `${root}/node_modules/.pnpm/${axe}/node_modules/axe-core/axe.min.js` });
        }
        assert.deepEqual(await page.evaluate(async () => (await axe.run(document.querySelector('#storybook-root'))).violations.map(v => `${v.id}: ${v.nodes.map(n => n.html).join(' | ')}`)), [], at(`axe (${label})`));
      };
      const assertSingleSelected = async expectedText => {
        assert.equal(await selected.count(), 1, at('選択中の候補は 1 件だけ'));
        const id = await selected.getAttribute('id');
        assert(id, at('候補に id がある'));
        assert.equal(await input.getAttribute('aria-activedescendant'), id, at('aria-activedescendant が選択中の候補を指す'));
        if (expectedText) assert((await selected.innerText()).includes(expectedText), at(`選択中は ${expectedText}: ${await selected.innerText()}`));
      };
      const assertHighlightOnSelected = async () => {
        await settle(400);
        const bar = await page.locator('[data-hover-highlight]').evaluate(el => ({ rect: el.getBoundingClientRect().toJSON(), opacity: getComputedStyle(el).opacity }));
        const row = await selected.boundingBox();
        assert(Math.abs(bar.rect.top - row.y) < 1 && Math.abs(bar.rect.height - row.height) < 1, at(`帯が選択中の行と重なる ${JSON.stringify([bar.rect.top, bar.rect.height, row])}`));
        assert.equal(bar.opacity, '1', at('帯が見えている'));
      };

      const regressionFailures = [];
      const regression = async (name, run) => { try { await run(); } catch (e) { regressionFailures.push(`${name}: ${e.message}`); } };
      const notices = async () => JSON.parse(await page.locator('output[aria-label="通知"]').innerText());
      await regression('in-place options / open notification', async () => {
        await story('regression'); await input.focus(); await settle();
        await page.getByRole('button', { name: '候補を追加' }).evaluate(el => el.click()); await settle();
        assert.equal(await expanded(), 'true'); assert(await panel.getAttribute('data-side'));
        assert.equal((await notices()).filter(v => v === 'open:true').length, 1);
        await input.press('Escape'); await settle();
        assert.equal((await notices()).filter(v => v === 'open:false').length, 1);
      });
      const prepareRegression = async () => {
        await story('regression'); await page.getByRole('button', { name: '候補を追加' }).evaluate(el => el.click()); await input.focus(); await settle();
      };
      await regression('empty value', async () => {
        await prepareRegression(); assert.equal(await selected.count(), 0);
        await input.press('ArrowDown'); await settle(); await assertSingleSelected('候補0');
        await input.press('Enter'); await settle(); assert((await notices()).includes('select:'));
      });
      await regression('Enter repeat', async () => {
        await prepareRegression();
        await input.dispatchEvent('keydown', { key: 'Enter', repeat: true, bubbles: true }); await settle();
        assert.equal((await notices()).filter(v => /^(select|commit):/.test(v)).length, 0);
        await input.press('ArrowDown'); await settle();
        await input.dispatchEvent('keydown', { key: 'Enter', repeat: true, bubbles: true }); await settle();
        assert.equal((await notices()).filter(v => /^(select|commit):/.test(v)).length, 0);
      });
      await regression('caret notification', async () => {
        await prepareRegression(); await input.press('End'); await input.press('ArrowLeft'); await settle();
        assert((await notices()).includes('caret:0'));
        await input.press('End'); await input.press('Home'); await settle();
        assert.equal((await notices()).at(-1), 'caret:0');
      });
      await regression('reopen padding', async () => {
        await prepareRegression(); await input.press('Escape');
        await fieldRoot.click({ position: { x: 2, y: 2 } }); await settle(); assert.equal(await expanded(), 'true');
      });
      await regression('wheel / resize preserve scroll', async () => {
        await prepareRegression(); await input.press('ArrowDown'); await settle();
        const box = await listbox.boundingBox(); await page.mouse.move(box.x + box.width - 5, box.y + 50);
        await page.mouse.wheel(0, 160); await settle(400);
        const scroll = await listbox.evaluate(el => el.scrollTop); assert(scroll > 50);
        await page.evaluate(() => window.dispatchEvent(new Event('resize'))); await settle();
        assert.equal(await listbox.evaluate(el => el.scrollTop), scroll);
        await page.mouse.move(750, 600); await page.mouse.wheel(0, 80); await settle(400);
        const pageScroll = await page.evaluate(() => window.scrollY); assert(pageScroll > 50);
        await page.evaluate(() => window.dispatchEvent(new Event('resize'))); await settle();
        assert.equal(await page.evaluate(() => window.scrollY), pageScroll);
        assert.equal(await listbox.evaluate(el => el.scrollTop), scroll);
      });
      await regression('wrapped tags top gap', async () => {
        await story('many-tags');
        await page.evaluate(() => { const input = document.querySelector('[role="combobox"]'); const root = input.parentElement.parentElement.parentElement; root.style.marginTop = '450px'; });
        await input.focus(); await settle(); assert.equal(await panel.getAttribute('data-side'), 'top');
        const r = await fieldRoot.boundingBox(); const p = await panel.boundingBox();
        const gap = await panel.evaluate(el => parseFloat(getComputedStyle(el).getPropertyValue('--menu-resolved-gap')));
        assert(Math.abs(r.y - p.y - p.height - gap) < 1.5);
        await input.press('Escape');
        await fieldRoot.getByText('とても長いラベルの名前 1', { exact: true }).click(); await settle();
        assert.equal(await expanded(), 'true');
      });
      assert.deepEqual(regressionFailures, [], at('review regressions'));
      // ---- default ----
      await story('default');
      assert.equal(await input.getAttribute('role'), 'combobox');
      assert.equal(await expanded(), 'false', at('初期は閉じている'));
      assert.equal(await input.getAttribute('aria-autocomplete'), 'list');
      assert(await page.evaluate(() => document.getElementById(document.querySelector('[role="combobox"]').getAttribute('aria-controls')) !== null), at('aria-controls の先がある'));
      assert.equal(await listbox.getAttribute('aria-label'), '候補');
      assert.equal(await input.getAttribute('aria-activedescendant'), null);
      await axeCheck('閉じた状態');

      await input.focus();
      await settle();
      assert.equal(await expanded(), 'true', at('フォーカスで開く'));
      assert.equal(await selected.count(), 0, at('autoHighlight なしでは選択中の候補が無い'));
      assert.equal(await input.getAttribute('aria-activedescendant'), null);
      assert(await listbox.isVisible());
      await axeCheck('開いた状態');

      // 3. ↓ ↓ ↓ ↑: 無効な候補を飛ばし、端で回る。
      for (const [key, label] of [['ArrowDown', 'status:'], ['ArrowDown', 'label:'], ['ArrowDown', 'status:'], ['ArrowUp', 'label:']]) {
        await input.press(key);
        await settle();
        await assertSingleSelected(label);
        assert.equal(await focused(), true, at('フォーカスは入力欄のまま'));
      }
      assert(!(await selected.innerText()).startsWith('sort:'), at('無効な候補は選ばれない'));
      assert.equal(await option(/^sort:/).getAttribute('aria-disabled'), 'true');
      await assertHighlightOnSelected();

      // 4. Esc
      await story('default');
      await input.focus();
      await input.press('ArrowDown');
      await input.press('Escape');
      await settle();
      assert.equal(await expanded(), 'false', at('Esc で閉じる'));
      assert.equal(await input.getAttribute('aria-activedescendant'), null);
      const afterEsc = await snapshot();
      await input.press('Escape');
      await settle();
      assert.deepEqual(await snapshot(), afterEsc, at('閉じているときの Esc は何もしない'));
      await input.press('Enter');
      await settle();
      assert.equal(await log.innerText(), 'commit:', at('閉じているときの Enter は確定（空の字）'));

      // 5. 候補が出ていて選んでいない状態の Enter
      await story('default');
      await input.click();
      await type('la');
      assert.equal(await page.getByRole('option').count(), 1, at('la で label: だけに絞られる'));
      assert.equal(await selected.count(), 0);
      await input.press('Enter');
      await settle();
      assert.equal(await log.innerText(), 'commit:la', at('選んでいない Enter は語として確定'));
      assert.equal(await tagCount(), 1);
      assert.equal(await input.inputValue(), '');

      // 6. label:b
      await type('label:b');
      await assertSingleSelected('bug');
      assert.equal(await page.locator('[role="option"] span').evaluateAll(spans => spans.filter(span => Number(getComputedStyle(span).fontWeight) >= 700).map(span => span.textContent)).then(list => list.join(',')), 'b,b', at('強調は b の 2 か所'));
      assert.equal(await caretOutput.innerText(), '7', at('キャレット位置'));
      assert.equal(await panel.getAttribute('data-side'), 'bottom');
      const inputBox = await input.boundingBox();
      const rootBox = await fieldRoot.boundingBox();
      const panelBox = await panel.boundingBox();
      assert(Math.abs(panelBox.x - inputBox.x) < 1, at(`パネルの左端が入力欄の左端と同じ ${panelBox.x} / ${inputBox.x}`));
      const gap = await page.evaluate(() => { const probe = document.createElement('div'); probe.style.width = 'var(--koyori-menu-gap)'; document.body.append(probe); const width = probe.getBoundingClientRect().width; probe.remove(); return width; });
      assert(Math.abs(panelBox.y - (rootBox.y + rootBox.height) - gap) < 1.5, at(`欄の枠の下との間が menu-gap ${panelBox.y - (rootBox.y + rootBox.height)} / ${gap}`));
      assert.equal(await page.getByRole('option').count(), 3, at('bug・backend と no:label'));
      assert.equal(await page.getByRole('group').count(), 2, at('節が 2 つ'));

      // 7. IME
      await input.press('Home');
      await settle();
      const before = await snapshot();
      assert.equal(before.tags, 1);
      await input.dispatchEvent('compositionstart');
      for (const key of ['Enter', 'Escape', 'ArrowDown', 'Backspace']) {
        await input.dispatchEvent('keydown', { key, bubbles: true, cancelable: true });
        await settle(50);
        assert.deepEqual(await snapshot(), before, at(`変換中の ${key} は無視`));
      }
      await input.dispatchEvent('compositionend');
      await input.dispatchEvent('keydown', { key: 'Enter', keyCode: 229, bubbles: true, cancelable: true });
      await input.dispatchEvent('keydown', { key: 'Enter', isComposing: true, bubbles: true, cancelable: true });
      await settle(50);
      assert.deepEqual(await snapshot(), before, at('compositionend の後の keyCode 229 と isComposing の Enter も無視'));
      await input.press('Enter');
      await settle();
      assert.equal(await log.innerText(), 'select:label:bug', at('普通の Enter で選ぶ'));
      assert.equal(await tagCount(), 2, at('札が 1 つ増える'));
      assert.equal(await input.inputValue(), '', at('欄が空になる'));

      // 8. Backspace
      await story('default');
      await input.click();
      for (const text of ['a', 'b']) { await type(text); await input.press('Enter'); await settle(); }
      assert.equal(await tagCount(), 2);
      await input.press('Backspace');
      await settle();
      assert.equal(await log.innerText(), 'remove:1', at('空欄の Backspace で最後の札'));
      assert.equal(await tagCount(), 1);
      await type('abc');
      await input.press('Home');
      await input.press('Backspace');
      await settle();
      assert.equal(await log.innerText(), 'remove:0', at('先頭の Backspace でも外す'));
      assert.equal(await tagCount(), 0);
      assert.equal(await input.inputValue(), 'abc', at('字は残る'));
      await input.press('End');
      await input.press('Backspace');
      await settle();
      assert.equal(await input.inputValue(), 'ab', at('キャレットが先頭でなければ字を消す'));
      await input.fill('');
      await input.press('Enter');
      await settle();
      assert.equal(await log.innerText(), 'commit:');
      await input.press('Backspace');
      await settle();
      assert.equal(await log.innerText(), 'commit:', at('札が 0 のときの Backspace は何も呼ばない'));
      await type('c');
      await input.press('Enter');
      await settle();
      assert.equal(await tagCount(), 1);
      await input.dispatchEvent('keydown', { key: 'Backspace', repeat: true, bubbles: true, cancelable: true });
      await settle();
      assert.equal(await tagCount(), 1, at('repeat の Backspace は外さない'));
      assert.equal(await log.innerText(), 'commit:c');

      // 9. 候補のクリック
      await story('default');
      await input.click();
      await option(/^sort:/).click({ force: true });
      await settle();
      assert.equal(await log.innerText(), '', at('無効な候補のクリックは何も呼ばない'));
      await option(/^status:/).click();
      await settle();
      assert.equal(await log.innerText(), 'select:status:');
      assert.equal(await focused(), true, at('クリック後もフォーカスは入力欄'));

      // 10. 札の ×
      await story('default');
      await input.click();
      await type('la');
      await input.press('Enter');
      await settle();
      await page.getByRole('button', { name: 'laを外す' }).click();
      await settle();
      assert.equal(await log.innerText(), 'remove:0');
      assert.equal(await focused(), true, at('× の後は入力欄にフォーカス'));
      assert.equal(await expanded(), 'false', at('× の後は閉じたまま'));
      await type('l');
      assert.equal(await expanded(), 'true', at('文字を打つと開く'));
      await input.fill('');
      await type('b');
      await input.press('Enter');
      await settle();
      await input.press('Shift+Tab');
      await settle();
      assert.equal(await page.getByRole('button', { name: 'bを外す' }).evaluate(el => el === document.activeElement), true, at('Shift+Tab で札の × へ'));
      await page.keyboard.press('Enter');
      await settle();
      assert.equal(await log.innerText(), 'remove:0');
      assert.equal(await tagCount(), 0);
      assert.equal(await focused(), true);
      assert.equal(await expanded(), 'false');
      await input.press('ArrowDown');
      assert.equal(await expanded(), 'true', at('↓ で開く'));

      // 11. ポインター
      await story('default');
      await input.click();
      await settle();
      const second = await option(/^label:/).boundingBox();
      await page.mouse.move(second.x + 20, second.y + second.height / 2, { steps: 4 });
      await settle();
      await assertSingleSelected('label:');
      await page.mouse.move(700, 650, { steps: 4 });
      await settle();
      assert.equal(await selected.count(), 0, at('一覧から出るとポインターの選択が消える'));
      assert.equal(await input.getAttribute('aria-activedescendant'), null);
      const first = await option(/^status:/).boundingBox();
      await page.mouse.move(first.x + 20, first.y + first.height / 2, { steps: 4 });
      await settle();
      await assertSingleSelected('status:');
      await input.press('ArrowDown');
      await settle(400);
      await assertSingleSelected('label:');
      await settle(400);
      await assertSingleSelected('label:');
      await page.mouse.move(700, 650, { steps: 4 });
      await settle();
      await assertSingleSelected('label:');
      // 一覧がポインターの下に現れただけでは選択が変わらない
      await input.press('Escape');
      await page.mouse.move(second.x + 20, second.y + second.height / 2, { steps: 4 });
      await input.evaluate(el => { el.blur(); el.focus(); });
      await settle(400);
      assert.equal(await expanded(), 'true');
      assert.equal(await selected.count(), 0, at('一覧がポインターの下に現れただけでは選ばれない'));

      // 12. 外側
      await story('default');
      await input.click();
      assert.equal(await expanded(), 'true');
      await next.click();
      await settle();
      assert.equal(await expanded(), 'false', at('外側のクリックで閉じる'));
      await input.focus();
      await settle();
      assert.equal(await expanded(), 'true');
      await input.press('Tab');
      await settle();
      assert.equal(await helpButton.evaluate(el => el === document.activeElement), true, at('Tab で suffix のボタンへ'));
      assert.equal(await expanded(), 'false', at('suffix のボタンへ移ると閉じる'));
      await next.click();
      await fieldRoot.click({ position: { x: 3, y: 3 } });
      await settle();
      assert.equal(await focused(), true, at('欄の余白のクリックで入力欄にフォーカス'));

      // 13. Tab の順
      await story('default');
      await input.click();
      await type('la');
      await input.press('Enter');
      await settle();
      const remove = page.getByRole('button', { name: 'laを外す' });
      await remove.focus();
      await page.keyboard.press('Tab');
      assert.equal(await focused(), true, at('札の × の次は入力欄'));
      await page.keyboard.press('Tab');
      assert.equal(await helpButton.evaluate(el => el === document.activeElement), true, at('入力欄の次は suffix のボタン'));
      await page.keyboard.press('Tab');
      assert.equal(await next.evaluate(el => el === document.activeElement), true, at('suffix の次は「次の項目」'));

      // ---- with-tags ----
      await story('with-tags');
      assert.equal(Math.round((await fieldRoot.boundingBox()).height), 32, at('札があっても欄の高さは control-height-sm'));
      assert.equal(await tagCount(), 2);
      assert.equal(await input.inputValue(), '通知');
      await axeCheck('with-tags');

      // ---- suggesting ----
      await story('suggesting');
      assert.equal(await expanded(), 'true', at('defaultOpen で開いて描かれる'));
      assert(await panel.getAttribute('data-side'), at('位置が決まっている'));
      assert.equal(await focused(), false, at('フォーカスは入力欄に無い'));
      await assertSingleSelected('bug');
      assert(await listbox.locator('xpath=..').innerText().then(text => text.includes('Esc')), at('下端の案内'));
      await axeCheck('suggesting ダーク');
      await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'light'));
      await settle();
      await axeCheck('suggesting ライト');

      // ---- key-list ----
      await story('key-list');
      assert.equal(await expanded(), 'true');
      assert.equal(await page.getByRole('option').count(), 4);
      assert.equal(await page.getByRole('option', { disabled: true }).count(), 1, at('無効な 1 行'));
      await axeCheck('key-list');

      // ---- many-tags ----
      await story('many-tags');
      assert.equal(await tagCount(), 8);
      assert((await fieldRoot.boundingBox()).height > 40, at('札が折り返して欄が伸びる'));
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), at('横スクロールが出ない'));
      await axeCheck('many-tags');

      // ---- narrow ----
      await story('narrow', 390);
      assert.equal(await expanded(), 'true');
      await settle(300);
      const narrow = await panel.boundingBox();
      const margin = await page.evaluate(() => { const probe = document.createElement('div'); probe.style.width = 'var(--koyori-menu-viewport-margin)'; document.body.append(probe); const width = probe.getBoundingClientRect().width; probe.remove(); return width; });
      assert(narrow.x >= margin - 0.5 && narrow.x + narrow.width <= 390 - margin + 0.5, at(`幅の狭い画面でもパネルが収まる ${JSON.stringify(narrow)}`));
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), at('横スクロールが出ない'));

      // ---- disabled ----
      await story('disabled');
      assert.equal(await input.isDisabled(), true);
      assert.equal(await tagRemovers.first().isDisabled(), true, at('札の × も無効'));
      await fieldRoot.click({ force: true });
      await input.focus().catch(() => {});
      await settle();
      assert.equal(await expanded(), 'false', at('無効のときは開かない'));
      assert.equal(await listbox.isVisible(), false);
      await axeCheck('disabled');

      // ---- in-field ----
      await story('in-field');
      assert(await page.getByRole('combobox', { name: '検索条件' }).count() === 1, at('Field のラベルが入力欄の名前になる'));
      assert.equal(await input.getAttribute('aria-invalid'), 'true');
      assert(await input.getAttribute('aria-describedby'), at('aria-describedby がある'));
      assert(await page.evaluate(() => document.querySelector('[role="combobox"]').getAttribute('aria-describedby').split(' ').every(id => document.getElementById(id))), at('aria-describedby の先がある'));
      await axeCheck('in-field');

      // ---- in-dialog ----
      await story('in-dialog');
      const state = page.locator('output');
      assert.equal(await state.innerText(), '開いています');
      await input.click();
      await settle();
      assert.equal(await expanded(), 'true');
      assert(await listbox.isVisible(), at('Dialog の中で一覧が見える'));
      await input.press('Escape');
      await settle();
      assert.equal(await expanded(), 'false', at('Esc で一覧だけ閉じる'));
      assert.equal(await state.innerText(), '開いています', at('Dialog は開いたまま'));
      await input.press('Escape');
      await settle(300);
      assert.equal(await state.innerText(), '閉じています', at('もう一度の Esc で Dialog が閉じる'));

      assert.deepEqual(errors, [], at('pageerror / console error'));
      await page.close();
    }
    console.log(`Combobox: ${frameworks.join(' / ')} の操作・ARIA・IME・axe を確認しました。`);
  } finally {
    await browser?.close();
    server.kill();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
