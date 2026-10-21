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
const fs = require('node:fs'),
  path = require('node:path'),
  assert = require('node:assert/strict'),
  crypto = require('node:crypto'),
  {
    pathToFileURL
  } = require('node:url');
const HTML = path.resolve(APP_PATH, 'assets/index.html'),
  OUT = path.resolve(APP_PATH, '../安卓手机版'),
  URL = pathToFileURL(HTML).href;
const report = {
  version: `${VERSION}`,
  checks: [],
  observations: {},
  errors: [],
  html_sha256: crypto.createHash('sha256').update(fs.readFileSync(HTML)).digest('hex')
};
(async () => {
  const browser = await chromium.launch({
    executablePath: require('./support.cjs').browserExecutable,
    headless: true,
    args: ['--mute-audio']
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
    const page = await context.newPage();
    page.setDefaultTimeout(15000);
    page.on('pageerror', e => report.errors.push(e.message));
    await page.goto(URL);
    async function go(id, preset) {
      await page.evaluate(id => location.hash = '#train/' + id, id);
      await page.waitForFunction(id => activeModule === id && settledModule === id &&
        frameReady.has(id), id);
      if (await page.locator('#guideDialog').evaluate(e => e.open)) await page.locator(
        '#skipGuide').click();
      const f = await (await page.locator('iframe[title^="第' + id + '项"]').elementHandle())
        .contentFrame();
      if (preset) await f.locator('#preset').selectOption(preset);
      return f;
    }
    let f = await go(12);
    await f.locator('#start').click();
    await f.waitForFunction(() => advancedState.phase === 'breath');
    const began = Date.now();
    await f.waitForFunction(() => advancedState.phase === 'answer', null, {
      timeout: 25000
    });
    const span = await f.evaluate(() => advancedState.breathPending.timing.durations[0]);
    assert.ok(span >= 19999);
    assert.ok(Date.now() - began >= 19000);
    report.observations.realBreath20000ms = span;
    await f.locator('[data-value="returned"]').click();
    await f.waitForFunction(() => advancedState.phase === 'breath');
    assert.equal(await f.evaluate(() => advancedState.segmentMs), 15000);
    await page.evaluate(() => focusAndroidSuspend());
    await f.waitForFunction(() => advancedState.phase === 'aborted');
    await page.evaluate(() => focusAndroidResume());
    assert.equal(await f.locator('#start').isDisabled(), false);
    assert.equal(await page.evaluate(() => records[0].detail.status), 'interrupted');
    assert.equal(await page.evaluate(() => conditionKey(records[0])), null);
    report.checks.push(
      'Real browser clock: full initial 20s breath segment, returned report shortens next to 15s; background stores interrupted/partial actual time with no best or completion'
    );
    console.log('PASS real breath');
    report.observations.realPeripheral = {};
    for (const preset of ['entry', 'middle', 'strong']) {
      f = await go(13, preset);
      await f.locator(await f.locator('#start').isVisible() ? '#start' : '#again').click();
      await f.waitForFunction(() => advancedState.phase === 'answer');
      const timing = await f.evaluate(() => advancedState.timing);
      const expected = ({
        entry: 500,
        middle: 350,
        strong: 200
      })[preset];
      assert.ok(timing.durations[0] >= expected - 1);
      report.observations.realPeripheral[preset] = timing;
      await page.evaluate(() => focusAndroidSuspend());
      await page.evaluate(() => focusAndroidResume());
    }
    f = await go(16);
    await f.locator('#start').click();
    await f.waitForFunction(() => advancedState.phase === 'answer');
    const serial = await f.evaluate(() => advancedState.timing);
    assert.equal(serial.durations.length, 12);
    assert.ok(serial.durations.every(n => n >= 149));
    report.observations.realSerial = serial;
    // Inject a long main-thread stall during a fresh visual presentation, not a synthetic score.
    await page.evaluate(() => focusAndroidSuspend());
    await page.evaluate(() => focusAndroidResume());
    await f.locator('#start').click();
    await f.waitForFunction(() => advancedState.phase === 'stimulus');
    await f.evaluate(() => {
      const until = performance.now() + 180;
      while (performance.now() < until) {}
    });
    await f.waitForFunction(() => advancedState.phase === 'answer');
    assert.equal(await f.evaluate(() => advancedState.timing.invalid), true);
    report.observations.injectedStall = await f.evaluate(() => advancedState.timing);
    await page.evaluate(() => focusAndroidSuspend());
    await page.evaluate(() => focusAndroidResume());
    report.checks.push(
      'Real rAF clock: all three 500/350/200ms peripheral conditions and 12×150ms serial intervals; injected 180ms main-thread stall marks sequence invalid without skipping stimuli'
    );
    console.log('PASS real visual');
    f = await go(14);
    await f.locator('#teach').click();
    await f.waitForFunction(() => advancedState.phase === 'monitor');
    let index = -1;
    while (await f.evaluate(() => advancedState.phase === 'monitor')) {
      const snap = await f.evaluate(() => ({
        i: advancedState.index,
        q: advancedState.items[advancedState.index],
        elapsed: performance.now() - advancedState.started
      }));
      if (snap.i !== index) {
        index = snap.i;
        if (snap.q.go) {
          await f.waitForFunction(i => advancedState.index !== i || performance.now() -
            advancedState.started >= 720, index);
          if (await f.evaluate(i => advancedState.index === i, index)) {
            await f.locator('#stimulus').dispatchEvent('pointerdown');
            await f.locator('#stimulus').dispatchEvent('pointerdown');
          }
        }
      }
      await page.waitForTimeout(30);
    }
    assert.equal(await f.evaluate(() => advancedState.phase), 'tutorial-result');
    const rows = await f.evaluate(() => advancedState.results);
    assert.equal(rows.length, 10);
    assert.ok(rows.filter(r => r.q.go).every(r => r.outcome === 'hit' && r.responseMs >= 700 &&
      r.responseMs < 1200));
    assert.equal(await page.evaluate(() => records.filter(r => r.module === 14 && r.detail
      .status === 'complete').length), 0);
    report.observations.realMonitor = rows.map(r => ({
      go: r.q.go,
      responseMs: r.responseMs,
      durations: r.durations,
      invalid: r.invalid
    }));
    report.checks.push(
      'Real 10-cycle monitor tutorial: blank-period clicks at ≥720ms accepted, repeats ignored, complete 1200ms windows retained, teaching never saves formal score'
    );
    console.log('PASS real monitor');
    // Save-failure boundary: 59 valid fixture trials + actual UI final answer.
    f = await go(11);
    await f.locator('#start').click();
    await f.waitForFunction(() => advancedState.phase === 'answer');
    await f.evaluate(() => {
      const R = FocusAdvancedRules,
        c = advancedState.c,
        items = advancedState.items;
      advancedState.results = items.slice(0, 59).map(q => ({
        q,
        answer: q.rule === 'parity' ? Number(q.value % 2 === 0) : Number(q.value > 5),
        responseMs: 300,
        timeout: false,
        invalid: false,
        durations: [],
        maxGapMs: 0,
        ...R.score(11, q, q.rule === 'parity' ? Number(q.value % 2 === 0) : Number(q
          .value > 5))
      }));
      advancedState.index = 59;
    });
    await page.evaluate(() => {
      window.originalSet = Storage.prototype.setItem;
      Storage.prototype.setItem = function(k, v) {
        if (k === STORAGE_KEY) throw Error('test quota');
        return originalSet.call(this, k, v);
      };
    });
    const target = await f.evaluate(() => {
      const q = advancedState.items[59];
      return q.rule === 'parity' ? Number(q.value % 2 === 0) : Number(q.value > 5);
    });
    await f.locator('#choices button[data-value="' + target + '"]').evaluate(b => b.click());
    await f.waitForFunction(() => Boolean(advancedState.pending));
    await page.evaluate(() => focusAndroidSuspend());
    await f.waitForFunction(() => advancedState.phase === 'result');
    await f.waitForFunction(() => advancedState.saved === false);
    assert.equal(await f.locator('#retrySave').isVisible(), true);
    assert.equal(await f.locator('#again').isDisabled(), true);
    await page.evaluate(() => {
      Storage.prototype.setItem = originalSet;
      focusAndroidResume();
    });
    await f.locator('#retrySave').click();
    await f.waitForFunction(() => advancedState.saved === true);
    const token = await f.evaluate(() => advancedState.token);
    await f.locator('#retrySave').evaluate(b => b.click());
    await page.waitForTimeout(50);
    assert.equal(await page.evaluate(token => records.filter(r => r.token === token).length,
      token), 1);
    report.checks.push(
      '59-trial fixture + actual final UI answer: quota failure leaves no fake save, background retains finished result/retry, success and repeat retry produce one record'
    );
    // Import rollback and limits, no user data touched.
    await page.evaluate(() => focusAndroidBack());
    await page.locator('#recordsButton').click();
    const snapshot = () => page.evaluate(() => Object.fromEntries([STORAGE_KEY, SETTINGS_KEY,
      UI_KEY, 'focus-universe-arcade-v1'
    ].map(k => [k, localStorage.getItem(k)])));
    const before = await snapshot();
    await page.evaluate(() => {
      window.oldSet = Storage.prototype.setItem;
      window.failOnce = true;
      Storage.prototype.setItem = function(k, v) {
        if (k === UI_KEY && failOnce) {
          failOnce = false;
          throw Error('test interrupt');
        }
        return oldSet.call(this, k, v);
      };
    });
    let failed = false;
    try {
      await page.evaluate(() => {
        const b = {
          app: 'focus-universe',
          version: 1,
          records: [{
            module: 1,
            token: 'rollback-test',
            at: Date.now(),
            summary: 'fixture'
          }],
          settings: {
            1: {
              mode: 'complete'
            }
          }
        };
        focusImportBackup(JSON.stringify(b));
      });
    } catch {
      failed = true;
    }
    assert.ok(failed);
    await page.evaluate(() => Storage.prototype.setItem = oldSet);
    assert.deepEqual(await snapshot(), before);
    await page.locator('#closeRecords').click();
    report.checks.push(
      'Legacy v1 backup injected failure after first writes rolls back records/settings/preferences/hidden data together'
    );
    // Mobile layouts, motion, stale callbacks and modal priority.
    for (const width of [320, 360, 390, 430, 768]) {
      await page.setViewportSize({
        width,
        height: 844
      });
      for (const id of [11, 12, 13, 14, 15, 16]) {
        f = await go(id);
        assert.equal(await f.evaluate(() => document.documentElement.scrollWidth > innerWidth),
          false);
        const heights = await f.locator('#start,#teach,select').evaluateAll(a => a.map(e => e
          .getBoundingClientRect().height).filter(n => n > 0));
        assert.ok(heights.every(n => n >= 48));
      }
    }
    await page.setViewportSize({
      width: 390,
      height: 844
    });
    await page.evaluate(() => {
      preferences.reduced = true;
      updateMotion();
    });
    f = await go(16);
    await f.locator('#start').click();
    await f.waitForFunction(() => advancedState.phase === 'stimulus');
    await page.evaluate(() => focusAndroidBack());
    await page.waitForURL(/#home$/);
    await page.waitForTimeout(2300);
    f = await go(16);
    assert.equal(await f.evaluate(() => advancedState.phase), 'aborted');
    await page.locator('#rulesButton').click();
    assert.equal(await f.locator('#rules').evaluate(d => d.open), true);
    await page.evaluate(() => focusAndroidBack());
    assert.equal(await f.locator('#rules').evaluate(d => d.open), false);
    assert.equal(await page.evaluate(() => activeModule), 16);
    await f.locator('#start').evaluate(b => {
      b.click();
      b.click();
      b.click();
    });
    await f.waitForFunction(() => advancedState.phase === 'stimulus');
    await page.evaluate(() => focusAndroidSuspend());
    await page.evaluate(() => focusAndroidResume());
    assert.equal(await f.locator('#start').isDisabled(), false);
    f = await go(13);
    await f.locator('#start').click();
    await f.waitForFunction(() => advancedState.phase === 'stimulus');
    await page.setViewportSize({
      width: 360,
      height: 844
    });
    await f.waitForFunction(() => advancedState.phase === 'aborted');
    assert.equal(await page.evaluate(() => records[0].detail.device.width), 390);
    await page.setViewportSize({
      width: 390,
      height: 844
    });
    f = await go(15);
    assert.equal(await f.locator('#start').isDisabled(), true);
    await f.locator('#checkLeft').click();
    await page.evaluate(() => focusAndroidSuspend());
    await page.waitForTimeout(700);
    assert.equal(await f.locator('#checkAnswers').isVisible(), false);
    await page.evaluate(() => focusAndroidResume());
    assert.equal(await f.locator('#start').isDisabled(), true);
    for (const ear of ['left', 'right']) {
      await f.locator(ear === 'left' ? '#checkLeft' : '#checkRight').click();
      await f.locator('#checkAnswers:not([hidden])').waitFor();
      await f.locator('[data-ear="' + ear + '"]').click();
    }
    await f.locator('#teach').click();
    for (let i = 0; i < 8; i++) {
      await f.waitForFunction(() => advancedState.phase === 'answer');
      if (i === 0) {
        await f.locator('#replay').evaluate(b => {
          b.click();
          b.click();
        });
        await f.waitForFunction(() => advancedState.phase === 'answer');
        assert.equal(await f.evaluate(() => advancedState.results.length), 0);
      }
      const q = await f.evaluate(() => advancedState.items[advancedState.index]);
      await f.locator('#choices button[data-value="' + q[q.ear] + '"]').click();
      await f.locator('#next').click();
    }
    await f.waitForFunction(() => advancedState.phase === 'tutorial-result');
    assert.equal(await page.evaluate(() => records.some(r => r.module === 15 && r.detail
      .status === 'complete')), false);
    await f.evaluate(() => {
      window.stoppedSources = 0;
      const original = AudioBufferSourceNode.prototype.stop;
      AudioBufferSourceNode.prototype.stop = function(...args) {
        stoppedSources++;
        return original.apply(this, args);
      };
    });
    await f.locator('#again').click();
    await f.waitForFunction(() => advancedState.phase === 'audio');
    await page.evaluate(() => focusAndroidSuspend());
    await f.waitForFunction(() => advancedState.phase === 'aborted');
    assert.ok(await f.evaluate(() => stoppedSources >= 1));
    await page.waitForTimeout(700);
    assert.equal(await f.evaluate(() => advancedState.phase), 'aborted');
    await page.evaluate(() => focusAndroidResume());
    report.checks.push(
      '320–768px six-module layouts/48px main controls; reduced mode, rapid starts/back/stale-callback cancellation; resize preserves original display snapshot and aborts; audio check/playback stops on suspend, 8 teaching trials/replay never save formal data'
    );
    assert.deepEqual(report.errors, []);
    console.log('PASS advanced edges');
  } catch (error) {
    report.errors.push(error.stack || error.message);
    throw error;
  } finally {
    fs.writeFileSync(path.join(OUT, `六项边界验收-${VERSION}.json`), JSON.stringify(report, null, 2));
    await browser.close();
  }
})().catch(e => {
  console.error(e);
  process.exitCode = 1;
});
