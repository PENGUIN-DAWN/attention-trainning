const {
  APP: APP_PATH,
  VERSION
} = require('./support.cjs');
async function capture(page, options) {
  await page.waitForTimeout(250);
  const training = await page.evaluate(() => location.hash.startsWith('#train/'));
  return page.screenshot({
    ...options,
    fullPage: training ? false : options.fullPage
  });
}
const {
  chromium
} = require('./support.cjs').playwright;
const assert = require('node:assert/strict'),
  fs = require('node:fs'),
  path = require('node:path'),
  vm = require('node:vm'),
  crypto = require('node:crypto');
const {
  pathToFileURL
} = require('node:url');
const OUT = path.resolve(APP_PATH, '../安卓手机版'),
  HTML = path.resolve(APP_PATH, 'assets/index.html');
vm.runInThisContext(fs.readFileSync(path.join(APP_PATH, 'tool-rules.js'), 'utf8'));
const R = FocusToolRules,
  report = {
    version: `${VERSION}`,
    checks: [],
    timings: {},
    errors: [],
    html_sha256: crypto.createHash('sha256').update(fs.readFileSync(HTML)).digest('hex')
  };
for (const id of [7, 8, 9, 10])
  for (const preset of Object.keys(R.CONFIG[id].presets))
    for (let n = 0; n < 200; n++) {
      const c = R.condition(id, {
          preset
        }),
        q = R.generate(id, c);
      if (id === 7) {
        assert.equal(q.targets.length, c.targets);
        assert.equal(new Set(q.targets).size, c.targets);
        assert.equal(new Set(q.labels).size, c.balls);
        const ids = q.balls.map(b => b.id);
        for (let k = 0; k < 400; k++) R.step(q.balls, .025, c);
        assert.deepEqual(q.balls.map(b => b.id), ids);
        for (const b of q.balls) {
          assert.ok(b.x >= .043 && b.x <= .957 && b.y >= .043 && b.y <= .957);
        }
        for (let i = 0; i < q.balls.length; i++)
          for (let j = i + 1; j < q.balls.length; j++) assert.ok(Math.hypot(q.balls[i].x - q.balls[
            j].x, q.balls[i].y - q.balls[j].y) > .08);
        assert.equal(R.score(id, q, q.targets).correct, true);
      }
      if (id === 8) {
        assert.equal(q.values.length, 36);
        assert.equal(new Set(q.values).size, 35);
        const counts = q.values.reduce((m, v) => (m[v] = (m[v] || 0) + 1, m), {});
        assert.equal(Object.values(counts).filter(x => x === 2).length, 1);
        assert.ok(Math.max(...Object.values(counts)) === 2);
        assert.ok(q.values.every(v => v >= 10 && v <= 99));
        assert.equal(R.score(id, q, q.answer).correct, true);
        assert.equal(R.score(id, q, q.answer, true).correct, false);
      }
      if (id === 9) {
        assert.equal(new Set(q.items.map(x => x.id)).size, 12);
        assert.equal(q.missing.length, c.missing);
        assert.equal(q.remaining.length, 12 - c.missing);
        assert.ok(q.remaining.every(x => !q.missing.some(m => m.id === x.id)));
        assert.equal(R.score(id, q, q.missing.map(x => x.aliases.at(-1))).correct, true);
        if (c.missing === 2) {
          const s = R.score(id, q, [q.missing[0].name, q.missing[0].name]);
          assert.equal(s.hits, 1);
          assert.equal(s.correct, false);
        }
      }
      if (id === 10) {
        assert.equal(q.values.length, 30);
        assert.equal(q.values.filter(x => x === q.pair.target).length, 1);
        assert.equal(R.score(id, q, q.answer).correct, true);
      }
    }
report.checks.push(
  '1800 randomized preset cases: unique answers, duplicate counts, object aliases/missing counts, stable tracking identities, collision separation, correct/wrong/timeout scoring'
);
(async () => {
  const browser = await chromium.launch({
    executablePath: require('./support.cjs').browserExecutable,
    headless: true
  });
  try {
    const context = await browser.newContext({
      viewport: {
        width: 390,
        height: 844
      },
      isMobile: true,
      hasTouch: true
    });
    const old = [{
      module: 2,
      token: 'legacy-only-summary',
      at: Date.now() - 86400000,
      summary: '答对 16/20'
    }];
    await context.addInitScript(old => {
      if (!localStorage.getItem('qaSeed')) {
        localStorage.setItem('focus-universe-history-v1', JSON.stringify(old));
        localStorage.setItem('focus-universe-settings-v1', JSON.stringify({
          1: {
            mode: 'complete'
          },
          4: {
            category: 'mixed',
            speed: '1500'
          },
          5: {
            observationDuration: '1.6'
          }
        }));
        localStorage.setItem('focus-universe-arcade-v1', JSON.stringify({
          schema: 1,
          records: [],
          progress: {
            'signal-1': {
              ruleVersion: 1,
              stars: 3
            }
          },
          unlocked: ['signal-texture'],
          equipped: {
            signal: ['signal-texture'],
            gravity: []
          },
          seen: ['signal'],
          lastLevel: 'signal-1'
        }));
        localStorage.setItem('qaSeed', 'yes');
      }
    }, old);
    const page = await context.newPage();
    page.setDefaultTimeout(15000);
    page.on('pageerror', e => report.errors.push(e.message));
    const remote = [];
    page.on('request', r => {
      if (/^https?:/.test(r.url())) remote.push(r.url());
    });
    await page.goto(pathToFileURL(HTML).href);
    await page.waitForFunction(() => document.getElementById('orb10'));
    assert.equal(await page.locator('.orb-shell').count(), 16);
    assert.equal(await page.locator('#lobbyView').count(), 0);
    assert.equal(await page.locator('#arcadeView').count(), 0);
    const arcadeRaw = await page.evaluate(() => localStorage.getItem(
      'focus-universe-arcade-v1'));
    await capture(page, {
      path: path.join(OUT, `十项目录-${VERSION}.png`),
      fullPage: true,
      animations: 'disabled'
    });
    const storage = () => page.evaluate(() => JSON.parse(localStorage.getItem(STORAGE_KEY)));
    async function go(id, preset, grid) {
      await page.evaluate(id => location.hash = '#train/' + id, id);
      await page.waitForFunction(id => activeModule === id && settledModule === id &&
        frameReady.has(id), id);
      if (await page.locator('#guideDialog').evaluate(e => e.open)) await page.locator(
        '#skipGuide').click();
      const f = await (await page.locator('iframe[title^="第' + id + '项"]').elementHandle())
        .contentFrame();
      if (preset) await f.locator('#preset').selectOption(preset);
      if (grid) await f.locator('#gridSize').selectOption(grid);
      return f;
    }
    async function start(f) {
      await f.locator(await f.locator('#start').isVisible() ? '#start' : '#again').click();
      await f.waitForFunction(() => !['idle', 'result', 'aborted'].includes(toolState.phase));
    }
    async function answer(f, id, wrong = false) {
      await f.waitForFunction(() => toolState.phase === 'answer', null, {
        timeout: 20000
      });
      const q = await f.evaluate(() => toolState.question);
      if (id === 7 || id === 8) {
        const indexes = id === 7 ? q.targets : q.answer;
        for (const i of indexes) await f.locator('[data-index="' + i + '"]').click();
        if (id === 8) {
          assert.equal(await f.locator('.solution').count(), 0);
          await f.locator('[data-index="' + indexes[0] + '"]').click();
          assert.equal(await f.locator('#submit').isDisabled(), true);
          await f.locator('[data-index="' + indexes[0] + '"]').click();
        }
        await f.locator('#submit').click();
      } else if (id === 9) {
        const inputs = f.locator('#inputs input');
        for (let i = 0; i < q.missing.length; i++) await inputs.nth(i).fill(q.missing[i]
          .aliases.at(-1));
        await f.locator('#submit').click();
      } else await f.locator('[data-index="' + (wrong ? (q.answer + 1) % q.values.length : q
        .answer) + '"]').click();
      await f.waitForFunction(() => toolState.phase === 'feedback');
    }
    // Reverse extension must preserve the old engine's ascending modes.
    let f = await go(1);
    await f.locator('.training-settings').evaluate(e => e.open = true);
    await f.locator('#mode').selectOption('reverse');
    await f.locator('#start').click();
    await f.waitForFunction(() => state.running && state.next === 25);
    await f.locator('#grid button').filter({
      hasText: /^1$/
    }).click();
    assert.equal(await f.evaluate(() => state.next), 25);
    for (let n = 25; n >= 1; n--) await f.locator('#grid button').filter({
      hasText: new RegExp('^' + n + '$')
    }).click();
    await f.waitForFunction(() => document.querySelector('.result-status').textContent.includes(
      '已保存在本机'));
    let rec = (await storage())[0];
    assert.equal(rec.detail.correct, 25);
    assert.equal(rec.detail.direction, 'descending');
    assert.equal(rec.detail.answerMode, 'click');
    assert.equal(rec.detail.limitMs, 35000);
    await capture(page, {
      path: path.join(OUT, `倒序数字搜索-${VERSION}.png`),
      fullPage: true,
      animations: 'disabled'
    });
    await f.locator('#again').click();
    await f.waitForFunction(() => state.running);
    await f.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(
      r))));
    await f.evaluate(() => state.started = performance.now() - 36000);
    await f.waitForFunction(() => !state.running);
    await page.waitForFunction(() => records.length === 3);
    assert.equal((await storage())[0].detail.seconds, 35);
    report.checks.push(
      'Reverse: wrong click does not advance, all 25 descending clicks, complete save and 35s timeout boundary; metadata separate from ascending'
    );
    console.log('PASS reverse');
    // Complete one full round of every new tool using actual configured observation/motion durations.
    for (const id of [8, 10, 9, 7]) {
      f = await go(id, id === 8 ? '15' : id === 10 ? '8' : id === 9 ? 'two' : 'normal');
      await f.evaluate(() => {
        window.qaPhases = [];
        let phase = toolState.phase;
        Object.defineProperty(toolState, 'phase', {
          get() {
            return phase;
          },
          set(v) {
            qaPhases.push({
              phase: v,
              at: performance.now()
            });
            phase = v;
          }
        });
      });
      await start(f);
      const rounds = await f.evaluate(() => toolState.condition.rounds);
      for (let n = 0; n < rounds; n++) {
        await f.waitForFunction(() => toolState.phase === 'answer', null, {
          timeout: 20000
        });
        if (n === 0) {
          await capture(page, {
            path: path.join(OUT, ({
              7: '多目标追踪',
              8: '重复数字搜寻',
              9: '消失的物品',
              10: '相似字符找异类'
            } [id]) + `-${VERSION}.png`),
            fullPage: true,
            animations: 'disabled'
          });
          if (id === 9) {
            const input = f.locator('#inputs input').first();
            await input.dispatchEvent('compositionstart');
            await input.fill('苹');
            await input.press('Enter');
            assert.equal(await f.evaluate(() => toolState.results.length), 0);
            await input.dispatchEvent('compositionend');
            await page.setViewportSize({
              width: 390,
              height: 420
            });
            await input.focus();
            await page.waitForFunction(() => document.body.classList.contains('keyboard-open'));
            await page.waitForFunction(() => {
              const f = frames.get(9),
                r = f.getBoundingClientRect(),
                b = f.contentDocument.getElementById('recallForm').getBoundingClientRect();
              return r.top + b.bottom <= innerHeight + 20;
            });
            await page.setViewportSize({
              width: 390,
              height: 844
            });
          }
        }
        await answer(f, id);
        await f.locator('#next').click();
      }
      await f.waitForFunction(() => toolState.phase === 'result');
      await f.waitForFunction(() => document.getElementById('saved').textContent.includes(
        '已保存在本机'));
      rec = (await storage())[0];
      assert.equal(rec.module, id);
      assert.equal(rec.detail.correct, rounds);
      assert.equal(rec.detail.status, 'complete');
      assert.equal(rec.detail.results.length, rounds);
      const phases = await f.evaluate(() => qaPhases);
      report.timings[id] = phases;
      if (id === 9) {
        for (let k = 0; k < phases.length; k++)
          if (phases[k].phase === 'observe') {
            const end = phases.slice(k + 1).find(p => p.phase === 'mask');
            assert.ok(end.at - phases[k].at >= 8000, 'full 8 seconds study');
          }
      }
      if (id === 7) {
        for (let k = 0; k < phases.length; k++)
          if (phases[k].phase === 'motion') {
            const end = phases.slice(k + 1).find(p => p.phase === 'preparing');
            assert.ok(end.at - phases[k].at >= 10000, 'full ten-ball movement time');
          }
      }
      assert.ok(rec.detail.seconds < 20,
        'observation and movement excluded from response time');
      await f.locator('#next').evaluate(b => {
        b.click();
        b.click();
      });
      assert.equal((await storage()).filter(x => x.token === rec.token).length, 1);
      console.log('PASS full tool', id);
    }
    report.checks.push(
      'Four full new rounds, actual full 8s study and 6s motion, independent response clocks, cancel selection, IME composition guard and simulated keyboard visibility'
    );
    await capture(page, {
      path: path.join(OUT, `新增训练成绩-${VERSION}.png`),
      fullPage: true,
      animations: 'disabled'
    });
    // Failure/retry, timeout, error locking and interrupted lifecycle.
    f = await go(10, '5', 'video');
    await start(f);
    await f.waitForFunction(() => toolState.phase === 'answer');
    await capture(page, {
      path: path.join(OUT, `相似字符80字-${VERSION}.png`),
      fullPage: true,
      animations: 'disabled'
    });
    await answer(f, 10, true);
    assert.equal(await f.evaluate(() => toolState.results[0].correct), false);
    await f.locator('#stimulus button').first().evaluate(b => b.click());
    assert.equal(await f.evaluate(() => toolState.results.length), 1);
    await f.locator('#next').click();
    await f.waitForFunction(() => toolState.phase === 'answer');
    await f.waitForFunction(() => toolState.phase === 'feedback', null, {
      timeout: 7000
    });
    assert.equal(await f.evaluate(() => toolState.results[1].timeout), true);
    await page.evaluate(() => focusAndroidSuspend());
    await f.waitForFunction(() => toolState.phase === 'aborted');
    await page.evaluate(() => focusAndroidResume());
    assert.equal(await f.locator('#start').isDisabled(), false);
    await f.locator('#start').evaluate(b => {
      b.click();
      b.click();
      b.click();
    });
    await f.waitForFunction(() => toolState.phase === 'answer');
    assert.equal(await f.evaluate(() => toolState.index), 0);
    await page.evaluate(() => focusAndroidSuspend());
    await page.evaluate(() => focusAndroidResume());
    const interrupted = (await storage())[0];
    assert.equal(interrupted.detail.status, 'interrupted');
    assert.equal(await page.evaluate(token => bestRecords().has(token), interrupted.token),
      false);
    f = await go(8, '12');
    await start(f);
    await f.waitForFunction(() => toolState.phase === 'answer');
    await f.waitForFunction(() => toolState.phase === 'feedback', null, {
      timeout: 14000
    });
    assert.equal(await f.evaluate(() => toolState.results[0].timeout), true);
    assert.equal(await f.locator('.solution').count(), 2);
    await page.evaluate(() => focusAndroidBack());
    await page.waitForURL(/#home$/);
    f = await go(10, '8');
    await start(f);
    for (let n = 0; n < 5; n++) {
      if (n === 4) await page.evaluate(() => {
        window.originalSet = Storage.prototype.setItem;
        Storage.prototype.setItem = function(k, v) {
          if (k === STORAGE_KEY) throw Error('test full');
          return originalSet.call(this, k, v);
        };
      });
      await answer(f, 10);
      await f.locator('#next').click();
    }
    await f.waitForFunction(() => toolState.phase === 'result');
    assert.ok((await f.locator('#saved').textContent()).includes('未能保存'));
    const failedToken = await f.evaluate(() => toolState.token);
    assert.equal((await storage()).some(r => r.token === failedToken), false);
    await page.evaluate(() => Storage.prototype.setItem = originalSet);
    await f.locator('#retrySave').click();
    await f.waitForFunction(() => document.getElementById('saved').textContent.includes(
      '已保存在本机'));
    assert.equal((await storage()).filter(r => r.token === failedToken).length, 1);
    report.checks.push(
      'Actual 5s and 12s timeout, one-answer lock, rapid starts, suspend abort/restart, interrupted records excluded from best, atomic save failure and exactly-once retry'
    );
    // Hidden arcade must survive old and new backup merges, delete and clearing training records.
    await page.evaluate(() => focusAndroidBack());
    await page.locator('#recordsButton').click();
    await page.locator('.record-filter[data-module="7"]').click();
    assert.ok(await page.locator('.record-row').count() === 1);
    await capture(page, {
      path: path.join(OUT, `训练记录-${VERSION}.png`),
      animations: 'disabled'
    });
    const downloadEvent = page.waitForEvent('download');
    await page.locator('#exportBackup').click();
    const backup = JSON.parse(fs.readFileSync(await (await downloadEvent).path(), 'utf8'));
    assert.equal(backup.version, 4);
    assert.equal(backup.arcade.progress['signal-1'].stars, 3);
    const before = await storage();
    await page.evaluate(b => focusImportBackup(JSON.stringify({
      app: 'focus-universe',
      version: 1,
      records: b
    })), old);
    assert.equal(await page.evaluate(() => localStorage.getItem('focus-universe-arcade-v1')),
      arcadeRaw);
    assert.equal((await storage()).length, before.length);
    await page.evaluate(b => focusImportBackup(JSON.stringify(b)), backup);
    assert.equal((await storage()).length, before.length);
    assert.equal(await page.evaluate(() => FocusArcadeStore.state.progress['signal-1'].stars),
      3);
    const bad = structuredClone(backup);
    bad.records.find(r => r.module === 7).detail.params.targets = 100;
    let rejected = false;
    try {
      await page.evaluate(b => focusImportBackup(JSON.stringify(b)), bad);
    } catch {
      rejected = true;
    }
    assert.ok(rejected);
    assert.deepEqual(await storage(), before);
    await page.locator('.record-filter[data-module="7"]').click();
    await page.locator('.record-delete').first().click();
    await page.locator('#cancelDelete').click();
    assert.equal((await storage()).length, before.length);
    await page.locator('.record-delete').first().click();
    await page.locator('#confirmDelete').click();
    assert.equal((await storage()).some(r => r.module === 7), false);
    assert.equal(await page.evaluate(() => FocusArcadeStore.state.progress['signal-1'].stars),
      3);
    await page.locator('#clearRecords').click();
    await page.locator('#confirmDelete').click();
    assert.equal((await storage()).length, 0);
    assert.equal(await page.locator('#todayCount').textContent(), '0 / 16 项');
    assert.equal(await page.evaluate(() => FocusArcadeStore.state.progress['signal-1'].stars),
      3);
    await page.evaluate(b => focusImportBackup(JSON.stringify(b)), backup);
    await page.reload();
    await page.waitForFunction(() => document.getElementById('orb10'));
    assert.equal((await storage()).length, before.length);
    assert.equal(await page.evaluate(() => settings[9].preset), 'two');
    report.checks.push(
      'v3 export and round trip, v1/v2-compatible data model, malformed import no writes, record filter/delete/cancel/clear, settings preserved and hidden entertainment survives'
    );
    // Reduced animations do not remove essential motion; layouts stay within viewport.
    await page.evaluate(() => {
      preferences.seen = Array.from({
        length: 10
      }, (_, i) => i + 1);
      preferences.reduced = true;
      updateMotion();
    });
    for (const width of [320, 360, 390, 430, 768]) {
      await page.setViewportSize({
        width,
        height: 844
      });
      for (const id of [7, 8, 9, 10]) {
        f = await go(id);
        assert.equal(await f.evaluate(() => document.documentElement.scrollWidth > innerWidth),
          false, 'overflow ' + id + '/' + width);
        const sizes = await f.locator('#start,select').evaluateAll(a => a.map(b => b
          .getBoundingClientRect()).filter(b => b.height > 0).map(b => b.height));
        assert.ok(sizes.every(n => n >= 48));
      }
    }
    await page.setViewportSize({
      width: 390,
      height: 844
    });
    f = await go(7, 'strong');
    await start(f);
    await f.waitForFunction(() => toolState.phase === 'motion');
    // Native playback keeps model positions fixed until the end; inspect the displayed stimulus.
    const positions = await f.locator('.tracking-ball').evaluateAll(nodes=>nodes.map(node=>getComputedStyle(node).transform));
    await page.waitForTimeout(300);
    assert.notDeepEqual(await f.locator('.tracking-ball').evaluateAll(nodes=>nodes.map(node=>getComputedStyle(node).transform)),
      positions);
    await page.evaluate(() => focusAndroidSuspend());
    await page.waitForTimeout(1000);
    assert.equal(await f.evaluate(() => toolState.phase), 'aborted');
    await page.evaluate(() => focusAndroidResume());
    assert.equal(await f.locator('#start').isDisabled(), false);
    report.checks.push(
      '320–768px tool layouts, 48px primary/settings controls, 80-character alternative explicitly labeled, reduced motion keeps tracking stimulus, background cancels stale callbacks'
    );
    assert.deepEqual(remote, []);
    assert.deepEqual(report.errors, []);
    console.log('PASS tools acceptance');
  } finally {
    fs.writeFileSync(path.join(OUT, `新增训练验收-${VERSION}.json`), JSON.stringify(report, null, 2));
    await browser.close();
  }
})().catch(e => {
  console.error(e);
  process.exitCode = 1;
});
