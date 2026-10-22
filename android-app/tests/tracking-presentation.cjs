const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const assert = require('node:assert/strict');
const {pathToFileURL} = require('node:url');
const {APP, ROOT, VERSION, playwright, browserExecutable} = require('./support.cjs');
const HTML = path.join(APP, 'assets/index.html'), OUT = path.join(ROOT, '安卓手机版');
const report = {version: VERSION, html_sha256: crypto.createHash('sha256').update(fs.readFileSync(HTML)).digest('hex'), checks: [], errors: [], observations: {}};

(async () => {
  const browser = await playwright.chromium.launch({executablePath: browserExecutable, headless: true});
  async function open({muted = false, reduced = false, video = false} = {}) {
    const context = await browser.newContext({viewport: {width: 390, height: 844}, isMobile: true, hasTouch: true,
      ...(video ? {recordVideo: {dir: path.join(OUT, 'ui-video-' + VERSION), size: {width: 390, height: 844}}} : {})});
    await context.addInitScript(({muted, reduced}) => {
      if (!localStorage.getItem('presentationSeed')) {
        localStorage.setItem('presentationSeed', '1');
        localStorage.setItem('focus-universe-ui-v1', JSON.stringify({reduced, seen: [7]}));
        localStorage.setItem('focus-universe-settings-v1', JSON.stringify({7: {preset: 'normal', sound: muted ? 'off' : 'on'}}));
      }
      const Native = window.AudioContext;
      if (Native) window.AudioContext = class extends Native {
        constructor(...args) {
          super(...args);(window.__audioContexts ||= []).push(this);
          this.__analyser = this.createAnalyser();this.__analyser.fftSize = 256;this.__analyser.connect(this.destination);
          const gain = this.createGain.bind(this), oscillator = this.createOscillator.bind(this);
          this.createGain = () => {const node = gain(), connect = node.connect.bind(node);node.connect = (target, ...ports) => connect(target === this.destination ? this.__analyser : target, ...ports);return node;};
          this.createOscillator = () => {const node = oscillator(), start = node.start.bind(node);node.start = at => {
            window.__flow?.tones.push({at: performance.now(), phase: window.toolState?.phase, visible: document.querySelectorAll('.tracking-ball.visible').length});
            return start(at);
          };return node;};
        }
      };
    }, {muted, reduced});
    const page = await context.newPage();page.setDefaultTimeout(25000);
    page.on('pageerror', error => report.errors.push(error.message));
    const requests = [];page.on('request', r => {if (/^https?:/.test(r.url())) requests.push(r.url());});
    await page.goto(pathToFileURL(HTML).href + '#train/7');
    await page.waitForFunction(() => settledModule === 7 && frameReady.has(7));
    const frame = await (await page.locator('iframe').elementHandle()).contentFrame();
    return {context, page, frame, requests};
  }
  try {
    const run = await open({video: true}), {page, frame} = run;
    await frame.evaluate(() => {
      window.__flow = {events: [], counts: [], tones: [], maxSignal: 0, done: false};
      let lastPhase = '', lastCount = -1;const buffer = new Float32Array(256);
      function sample(now) {
        const phase = toolState.phase;
        if (phase !== lastPhase) {__flow.events.push({phase, at: now, targets: document.querySelectorAll('.tracking-ball.target').length});lastPhase = phase;}
        if (phase === 'intro') {const count = document.querySelectorAll('.tracking-ball.visible').length;if (count !== lastCount) {__flow.counts.push({count, at: now});lastCount = count;}}
        if (['countdown', 'intro', 'mark'].includes(phase)) for (const ctx of window.__audioContexts || []) {
          ctx.__analyser.getFloatTimeDomainData(buffer);for (const value of buffer) __flow.maxSignal = Math.max(__flow.maxSignal, Math.abs(value));
        }
        if (phase === 'answer' || phase === 'aborted') {__flow.done = true;return;}
        requestAnimationFrame(sample);
      }
      requestAnimationFrame(sample);
    });
    await frame.locator('#start').click();
    await frame.waitForFunction(() => toolState.phase === 'countdown');
    await page.screenshot({path: path.join(OUT, '小球倒数准备-' + VERSION + '.png')});
    await frame.waitForFunction(() => toolState.phase === 'intro' && document.querySelectorAll('.tracking-ball.visible').length >= 3);
    await page.screenshot({path: path.join(OUT, '小球逐颗入场-' + VERSION + '.png')});
    await frame.waitForFunction(() => toolState.phase === 'mark');
    await page.waitForTimeout(120);
    const cue = await frame.evaluate(() => ({count: document.querySelectorAll('.tracking-ball.visible').length, targets: document.querySelectorAll('.tracking-ball.target').length,
      activeEntries: document.getAnimations().filter(a => a.playState === 'running' && a.effect?.target?.classList.contains('tracking-surface')).length,
      normal: getComputedStyle(document.querySelector('.tracking-ball:not(.target) .tracking-surface')).backgroundColor,
      target: getComputedStyle(document.querySelector('.tracking-ball.target .tracking-surface')).backgroundColor,
      fieldPixel: [...document.querySelector('canvas').getContext('2d').getImageData(0, 0, 1, 1).data]}));
    assert.deepEqual(cue, {count: 10, targets: 4, activeEntries: 0, normal: 'rgb(72, 95, 128)', target: 'rgb(164, 97, 36)', fieldPixel: [243, 245, 250, 255]});
    await page.screenshot({path: path.join(OUT, '小球发光确认-' + VERSION + '.png')});
    await frame.waitForFunction(() => toolState.phase === 'motion');
    await page.waitForTimeout(650);
    const moving = await frame.evaluate(() => {
      const nodes = [...document.querySelectorAll('.tracking-ball')];
      return {targets: nodes.filter(n => n.classList.contains('target')).length, styles: new Set(nodes.map(n => {
        const s = getComputedStyle(n.querySelector('.tracking-surface'));
        return [s.backgroundColor, s.backgroundImage, s.boxShadow, getComputedStyle(n, '::after').opacity].join('|');
      })).size, shapes: nodes.map(n => {const r = n.getBoundingClientRect();return Math.abs(r.width-r.height);}), texts: nodes.map(n => n.textContent)};
    });
    assert.equal(moving.targets, 0);assert.equal(moving.styles, 1);assert.ok(moving.shapes.every(v => v < .01));assert.ok(moving.texts.every(t => t === ''));
    await page.screenshot({path: path.join(OUT, '小球立体运动-' + VERSION + '.png')});
    await frame.waitForFunction(() => __flow.done);
    const flow = await frame.evaluate(() => __flow);
    const at = phase => flow.events.find(e => e.phase === phase).at;
    assert.ok(at('intro') - at('countdown') >= 1600);
    assert.ok(at('mark') - at('intro') >= 1900);
    assert.ok(at('motion') - at('mark') >= 2500);
    assert.ok(at('answer') - at('motion') >= 10000);
    assert.deepEqual(flow.counts.map(v => v.count), Array.from({length: 10}, (_, i) => i+1));
    const pops = flow.tones.filter(t => t.phase === 'intro');
    assert.equal(pops.length, 10);assert.deepEqual(pops.map(t => t.visible), Array.from({length: 10}, (_, i) => i+1));
    assert.ok(flow.maxSignal > .005, 'actual Web Audio graph must output a non-silent signal');
    assert.equal(flow.tones.filter(t => t.phase === 'motion').length, 0);
    await page.screenshot({path: path.join(OUT, '小球编号作答-' + VERSION + '.png')});
    report.observations.flow = flow;report.observations.cue = cue;
    report.checks.push('Real-clock countdown, ten distinct pop entrances, full 2.5-second target cue and full 10-second motion are ordered and separate; original ball/target/field colors and circular geometry retained');
    report.checks.push('Real AudioContext/Analyser observes non-silent output; one tone per visible entry, no tones during motion; target glow and all identity cues disappear before motion');
    assert.deepEqual(run.requests, []);
    const video = page.video();await run.context.close();await video.saveAs(path.join(OUT, '小球逐颗入场-' + VERSION + '.webm'));await video.delete();

    for (const phase of ['countdown', 'intro', 'mark']) {
      const stopped = await open();
      await stopped.frame.locator('#start').click();
      await stopped.frame.waitForFunction(phase => toolState.phase === phase, phase);
      if (phase === 'intro') await stopped.frame.waitForFunction(() => document.querySelectorAll('.tracking-ball.visible').length >= 2);
      await stopped.page.evaluate(() => focusAndroidSuspend());
      await stopped.frame.waitForFunction(() => toolState.phase === 'aborted');
      const count = await stopped.frame.locator('.tracking-ball.visible').count();
      await stopped.page.waitForTimeout(450);
      assert.equal(await stopped.frame.locator('.tracking-ball.visible').count(), count);
      assert.equal(await stopped.frame.evaluate(() => document.getAnimations().filter(a => a.playState === 'running').length), 0);
      assert.ok(await stopped.frame.evaluate(() => (window.__audioContexts || []).every(c => c.state === 'suspended')));
      assert.equal(await stopped.page.evaluate(() => records.some(r => r.detail?.status === 'complete')), false);
      await stopped.context.close();
    }
    report.checks.push('Background interruption during countdown, entrance and target confirmation cancels future reveals, animations and audio and produces no completed score');

    const quiet = await open({muted: true, reduced: true});
    await quiet.frame.locator('#start').click();await quiet.frame.waitForFunction(() => toolState.phase === 'mark');
    assert.equal(await quiet.frame.evaluate(() => (window.__audioContexts || []).length), 0);
    assert.equal(await quiet.frame.evaluate(() => document.getAnimations().filter(a => a.playState === 'running').length), 0);
    assert.equal(await quiet.frame.locator('.tracking-ball.target').count(), 4);
    await quiet.page.evaluate(() => focusAndroidSuspend());await quiet.page.reload();
    await quiet.page.waitForFunction(() => settledModule === 7 && frameReady.has(7));
    const quietFrame = await (await quiet.page.locator('iframe').elementHandle()).contentFrame();
    assert.equal(await quietFrame.locator('#trackingSound').inputValue(), 'off');
    await quietFrame.locator('#trackingSound').selectOption('on');
    await quiet.page.waitForFunction(() => settings[7].sound === 'on');
    await quiet.context.close();
    report.checks.push('Mute creates no audio context and persists after reload; reduced motion keeps sequential reveals and four static target cues without animations; preference changes save');

    const unavailable = await open();
    await unavailable.frame.evaluate(() => {window.AudioContext = undefined;window.webkitAudioContext = undefined;});
    await unavailable.frame.locator('#start').click();await unavailable.frame.waitForFunction(() => toolState.phase === 'mark');
    assert.match(await unavailable.frame.locator('#notice').textContent(), /音效未能开启/);
    await unavailable.page.evaluate(() => focusAndroidSuspend());await unavailable.context.close();
    report.checks.push('Unavailable audio fails gracefully with a visible notice while the visual exercise continues offline');
    assert.deepEqual(report.errors, []);console.log('PASS tracking presentation', report.checks.length);
  } catch (error) { report.errors.push(error.stack);throw error; }
  finally {fs.writeFileSync(path.join(OUT, '小球入场验收-' + VERSION + '.json'), JSON.stringify(report, null, 2));await browser.close();}
})().catch(error => {console.error(error);process.exitCode = 1;});
