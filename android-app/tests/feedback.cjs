const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const vm = require('node:vm'), assert = require('node:assert/strict');
const {pathToFileURL} = require('node:url');
const {APP, ROOT, VERSION, playwright, browserExecutable} = require('./support.cjs');
const HTML = path.join(APP, 'assets/index.html'), OUT = path.join(ROOT, '安卓手机版');
const report = {version: VERSION, html_sha256: crypto.createHash('sha256').update(fs.readFileSync(HTML)).digest('hex'),
  realAndroid: false, checks: [], errors: []};

async function cancellationRace() {
  let release;
  class DelayedContext {
    constructor() { this.state = 'suspended'; }
    resume() { return new Promise(resolve => { release = () => {this.state = 'running';resolve();}; }); }
    async suspend() { this.state = 'suspended'; }
  }
  const context = vm.createContext({AudioContext: DelayedContext, document: {hidden: false}});
  vm.runInContext(fs.readFileSync(path.join(APP, 'shared/feedback.js'), 'utf8'), context);
  const feedback = vm.runInContext('new FocusFeedback()', context);
  const pending = feedback.unlock();
  feedback.suspend();release();
  assert.equal(await pending, false);
  assert.equal(feedback.context.state, 'suspended');
  assert.equal(feedback.nodes.size, 0);
  assert.equal(feedback.play('click'), false);
  report.checks.push('A delayed audio unlock cannot revive sound after suspension; unsupported/cancelled playback has no task-clock dependency');
}

(async () => {
  const browser = await playwright.chromium.launch({executablePath: browserExecutable, headless: true});
  const context = await browser.newContext({viewport: {width: 390, height: 844}});
  await context.addInitScript(() => {
    if (!localStorage.getItem('feedbackSeed')) {
      localStorage.setItem('feedbackSeed', '1');
      localStorage.setItem('focus-universe-ui-v1', JSON.stringify({seen: Array.from({length: 16}, (_, i) => i+1)}));
    }
    const Native = window.AudioContext;
    if (Native) window.AudioContext = class extends Native {
      constructor(...args) {
        super(...args);(window.__contexts ||= []).push(this);
        this.__analyser = this.createAnalyser();this.__analyser.connect(this.destination);
        const gain = this.createGain.bind(this), oscillator = this.createOscillator.bind(this);
        this.createGain = () => {const node = gain(), connect = node.connect.bind(node);
          node.connect = (target, ...args) => connect(target === this.destination ? this.__analyser : target, ...args);return node;};
        this.createOscillator = () => {const node = oscillator(), start = node.start.bind(node);
          node.start = at => {window.__tones = (window.__tones || 0) + 1;return start(at);};return node;};
      }
    };
  });
  const page = await context.newPage();
  const requests = [];
  page.on('pageerror', error => report.errors.push(error.message));
  page.on('request', r => {if (/^https?:/.test(r.url())) requests.push(r.url());});
  const go = async id => {
    await page.evaluate(id => navigate(id), id);
    await page.waitForFunction(id => activeModule === id && (id === null || settledModule === id && frameReady.has(id)), id);
    if (id !== null) return (await page.locator('iframe[title^="第' + id + '项"]').elementHandle()).contentFrame();
  };
  try {
    await cancellationRace();
    await page.goto(pathToFileURL(HTML).href + '#home');
    assert.equal(await page.evaluate(() => (window.__contexts || []).length), 0);
    await page.evaluate(() => {
      window.__peak = 0;
      const samples = new Float32Array(2048);
      window.__probe = setInterval(() => {
        for (const ctx of window.__contexts || []) {
          ctx.__analyser.getFloatTimeDomainData(samples);
          for (const sample of samples) window.__peak = Math.max(window.__peak, Math.abs(sample));
        }
      }, 4);
    });
    await page.locator('#preferencesButton').click();
    assert.ok(await page.evaluate(() => appFeedback instanceof FocusFeedback && appFeedback.animations.size === 1));
    await page.waitForFunction(() => window.__tones === 1);
    await page.waitForFunction(() => window.__peak > .001, null, {timeout: 3000});
    const signal = await page.evaluate(() => {clearInterval(window.__probe);return window.__peak;});
    assert.ok(signal > .001, 'ordinary button must produce a real non-silent Web Audio signal');
    report.checks.push('An ordinary settings click uses the shared service, emits a real short tone and starts bounded decorative motion; no context exists before a gesture');

    await page.locator('#effectsSound').uncheck();
    await page.evaluate(() => preferencesDialog.close());
    const tones = await page.evaluate(() => window.__tones);
    await page.locator('#preferencesButton').focus();
    await page.keyboard.press('Enter');
    assert.ok(await page.evaluate(() => appFeedback.animations.size === 1), 'mute must retain motion');
    assert.equal(await page.evaluate(() => window.__tones), tones);
    await page.locator('#reduceMotion').check();
    assert.equal(await page.evaluate(() => appFeedback.animations.size), 0);
    await page.evaluate(() => preferencesDialog.close());
    await page.reload();
    assert.equal(await page.evaluate(() => preferences.effectsMuted), true);
    await page.evaluate(() => focusImportBackup(JSON.stringify({app: 'focus-universe', version: 1, records: []})));
    assert.equal(await page.evaluate(() => preferences.effectsMuted), true);
    await page.evaluate(() => focusAndroidBack());
    report.checks.push('Keyboard activation uses the same feedback; mute retains motion, reduced mode cancels it, and mute survives reload and a legacy backup without the field');

    let frame = await go(7);
    assert.equal(await frame.evaluate(() => FocusTrackingAudio.prototype instanceof FocusFeedback), true);
    await frame.locator('#start').click();
    await frame.waitForFunction(() => toolState.phase === 'intro');
    assert.equal(await frame.evaluate(() => (window.__contexts || []).length), 0);
    await page.evaluate(() => focusAndroidSuspend());
    await frame.waitForFunction(() => toolState.phase === 'aborted');
    await page.evaluate(() => focusAndroidResume());
    await go(null);
    await page.locator('#preferencesButton').click();
    await page.locator('#effectsSound').check();
    await page.locator('#reduceMotion').uncheck();
    await page.evaluate(() => preferencesDialog.close());
    frame = await go(7);
    await frame.locator('#start').click();
    await frame.waitForFunction(() => toolState.phase === 'countdown');
    await frame.waitForFunction(() => window.__tones > 0);
    await page.evaluate(() => navigate(null));
    await frame.waitForFunction(() => !toolState.active);
    await frame.waitForFunction(() => window.__contexts.every(c => c.state === 'suspended'));
    const cancelled = await frame.evaluate(() => window.__tones);
    await page.waitForTimeout(300);
    assert.equal(await frame.evaluate(() => window.__tones), cancelled);
    report.checks.push('Global mute reaches the training and suppresses context creation; an already-cached training receives unmute; navigating away cancels scheduled tones');

    // Required digit audio remains a separate graph even when all decorative audio is muted.
    await go(null);
    await page.locator('#preferencesButton').click();
    await page.locator('#effectsSound').uncheck();
    await page.evaluate(() => preferencesDialog.close());
    frame = await go(15);
    const stereo = await frame.evaluate(async () => {
      const player = new FocusStereoAudio(JSON.parse(parent.document.getElementById('digitAudio').textContent));
      const result = await player.play(1, 2);player.suspend();return result;
    });
    assert.equal(stereo.channels, 2);assert.ok(stereo.durationMs > 0);
    report.checks.push('Muted decorative feedback leaves the original stereo digit playback available with two-channel content and its own cancellation');

    await go(null);
    await page.evaluate(() => {window.AudioContext = undefined;window.webkitAudioContext = undefined;});
    await page.locator('#preferencesButton').click();
    await page.locator('#effectsSound').check();
    await page.evaluate(() => preferencesDialog.close());
    await page.evaluate(() => {appFeedback.context = null;});
    await page.locator('#preferencesButton').click();
    assert.equal(await page.locator('#preferencesDialog').evaluate(e => e.open), true);
    assert.equal(await page.evaluate(() => appFeedback.context), null);
    await page.evaluate(() => focusAndroidSuspend());
    assert.equal(await page.evaluate(() => appFeedback.animations.size), 0);
    assert.deepEqual(requests, []);assert.deepEqual(report.errors, []);
    report.checks.push('Missing audio API never blocks the ordinary action; suspension cancels decorative animations; all runtime resources remain offline');
    console.log('PASS shared feedback', report.checks.length);
  } catch (error) { report.errors.push(error.stack);throw error; }
  finally {
    fs.writeFileSync(path.join(OUT, '公共反馈验收-' + VERSION + '.json'), JSON.stringify(report, null, 2));
    await context.close();await browser.close();
  }
})().catch(error => {console.error(error);process.exitCode = 1;});
