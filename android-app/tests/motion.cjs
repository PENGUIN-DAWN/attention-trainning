const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const {pathToFileURL} = require('node:url');
const {APP, ROOT, VERSION, playwright, browserExecutable} = require('./support.cjs');
const HTML = path.join(APP, 'assets/index.html');
const OUT = path.join(ROOT, '安卓手机版');
const report = {version: VERSION, html_sha256: crypto.createHash('sha256').update(fs.readFileSync(HTML)).digest('hex'), checks: [], errors: [], observations: {}};
const sandbox = vm.createContext({});
vm.runInContext(fs.readFileSync(path.join(APP, 'tool-rules.js'), 'utf8'), sandbox);
vm.runInContext(fs.readFileSync(path.join(APP, 'tool-motion.js'), 'utf8') + '\nglobalThis.Motion=FocusTrackingMotion;', sandbox);
const R = sandbox.FocusToolRules;
const historical = path.join(require('node:os').homedir(), '.cache/focus-refactor150.html');
const oldPage = fs.readFileSync(historical, 'utf8');
const modules = JSON.parse(oldPage.match(/id="trainingData">([\s\S]*?)<\/script>/)[1]);
const oldSandbox = vm.createContext({});
for (const script of modules.find(m => m.id === 7).source.matchAll(/<script>([\s\S]*?)<\/script>/g)) vm.runInContext(script[1], oldSandbox);
const oldR = oldSandbox.FocusToolRules;
const previousPage = fs.readFileSync(path.join(require('node:os').homedir(), '.cache/focus-motion161.html'), 'utf8');
const previousModules = JSON.parse(previousPage.match(/id="trainingData">([\s\S]*?)<\/script>/)[1]);
const previousSandbox = vm.createContext({});
for (const script of previousModules.find(m => m.id === 7).source.matchAll(/<script>([\s\S]*?)<\/script>/g)) vm.runInContext(script[1], previousSandbox);
const previousR = previousSandbox.FocusToolRules;
const spherePage = fs.readFileSync(path.join(require('node:os').homedir(), '.cache/focus-motion162.html'), 'utf8');
const sphereSandbox = vm.createContext({});
const sphereModules = JSON.parse(spherePage.match(/id="trainingData">([\s\S]*?)<\/script>/)[1]);
for (const script of sphereModules.find(m=>m.id===7).source.matchAll(/<script>([\s\S]*?)<\/script>/g)) vm.runInContext(script[1],sphereSandbox);
const sphereR = sphereSandbox.FocusToolRules;
const plain = v => JSON.parse(JSON.stringify(v));
function rng() { let n = 9042; return () => ((n = Math.imul(n, 1664525) + 1013904223 >>> 0) / 4294967296); }

(async () => {
  let browser;
  try {
    const fixtures = [];
    for (const preset of ['normal', 'strong']) {
      const oldC = oldR.condition(7, {preset}), current = R.condition(7, {preset});
      assert.equal(current.ruleVersion, 4);
      assert.equal(current.motionMs, preset === 'normal' ? 10000 : 8000);
      assert.ok(Math.abs(current.speed / oldC.speed - 1.5) < 1e-10);
      assert.deepEqual(plain(R.condition(7, {preset}, 1)), plain(oldC));
      const previousC = previousR.condition(7, {preset});
      assert.deepEqual(plain(R.condition(7, {preset}, 2)), plain(previousC));
      const results = Array.from({length: 3}, () => ({correct: true, timeout: false, skip: false, errors: 0, hits: oldC.targets, responseMs: 400}));
      const d1 = oldR.cleanDetail(7, oldR.detail(7, oldC, results));
      const d2 = previousR.cleanDetail(7, previousR.detail(7, previousC, results));
      const sphereC = sphereR.condition(7,{preset});
      assert.deepEqual(plain(R.condition(7,{preset},3)),plain(sphereC));
      assert.deepEqual(plain(R.generate(7,sphereC,rng())),plain(sphereR.generate(7,sphereC,rng())));
      const d3 = sphereR.cleanDetail(7,sphereR.detail(7,sphereC,results));
      const d4 = R.cleanDetail(7, R.detail(7, current, results));
      assert.deepEqual(plain(R.cleanDetail(7, d1)), plain(d1));
      assert.ok(d2 && d2.ruleVersion === 2);
      assert.deepEqual(plain(R.cleanDetail(7, d2)), plain(d2));
      assert.ok(d3 && d3.ruleVersion === 3);
      assert.deepEqual(plain(R.cleanDetail(7,d3)),plain(d3));
      assert.ok(d4 && d4.ruleVersion===4);
      assert.equal(R.cleanDetail(7, {...plain(d1), ruleVersion: 2}), undefined);
      assert.equal(R.cleanDetail(7, {...plain(d2), ruleVersion: 1}), undefined);
      assert.equal(R.cleanDetail(7, {...plain(d2), ruleVersion: 3}), undefined);
      assert.equal(R.cleanDetail(7, {...plain(d3), ruleVersion: 4}), undefined);
      assert.equal(R.cleanDetail(7,{...plain(d4),ruleVersion:5}),undefined);
      for (const [i, detail] of [d1, d2, d3,d4].entries()) fixtures.push({module: 7, token: preset + '-v' + (i + 1), at: Date.now() + i, summary: '兼容性测试', detail: plain(detail)});
      const finalStates = [];
      for (const hz of [60, 90, 120]) {
        const q = R.generate(7, current, rng()), motion = new sandbox.Motion(q.balls, current);
        assert.equal(new Set(q.entrance).size, current.balls);
        for (let frame = 1; frame <= current.motionMs * hz / 1000; frame++) {
          const positions = motion.sample(frame * 1000 / hz);
          assert.ok(positions);
          for (const p of positions) assert.ok(Number.isFinite(p.x) && p.x >= .043 && p.x <= .957 && p.y >= .043 && p.y <= 1/current.fieldAspect-.043);
        }
        assert.ok(motion.sample(current.motionMs, true));
        finalStates.push(plain(q.balls));
        assert.equal(motion.sample(current.motionMs + 251), false);
      }
      assert.deepEqual(finalStates[0], finalStates[1]);
      assert.deepEqual(finalStates[0], finalStates[2]);
    }
    report.checks.push('Tracking v4 retains speed/duration/target counts; genuine v1/v2/v3 conditions and v3 seeded generator unchanged; versions distinct; trajectories agree at simulated 60/90/120 Hz');
    let minGap=1,maxFrames=0;
    for(let seed=0;seed<200;seed++) for(const preset of ['normal','strong']) {
      let n=seed;const random=()=>((n=Math.imul(n,1664525)+1013904223>>>0)/4294967296);
      const c=R.condition(7,{preset}),q=R.generate(7,c,random),motion=new sandbox.Motion(q.balls,c);
      const quadrants=[0,0,0,0];q.balls.forEach(b=>quadrants[Number(b.x>=.5)+2*Number(b.y>=.5)]++);
      assert.ok(Math.max(...quadrants)-Math.min(...quadrants)<=1);
      assert.equal(new Set(q.balls.map(b=>b.x)).size,c.balls);assert.equal(new Set(q.balls.map(b=>b.y)).size,c.balls);
      maxFrames=Math.max(maxFrames,motion.plan.frames.length);
      for(let t=0;t<=c.motionMs;t+=1000/120) {
        const positions=motion.sample(t);assert.ok(positions);
        for(let i=0;i<positions.length;i++) {
          const p=positions[i];assert.ok(p.x>=.044-1e-8&&p.x<=.956+1e-8&&p.y>=.044-1e-8&&p.y<=.956+1e-8);
          for(let j=i+1;j<positions.length;j++) minGap=Math.min(minGap,Math.hypot(p.x-positions[j].x,p.y-positions[j].y));
        }
      }
      assert.equal(motion.plan.frames.at(-1).ms,c.motionMs);
    }
    assert.ok(minGap>=.088-1e-8);assert.ok(maxFrames<250);
    report.observations.trajectories={seeds:200,presets:2,minGap,maxFrames};
    report.checks.push('400 seeded paths have balanced random quadrants, unique coordinates, no ball overlaps or wall escapes at 120 Hz sampling; exact collision endpoints use fewer than 250 path frames');
    for (const id of [8, 9, 10]) for (const preset of Object.keys(R.CONFIG[id].presets)) for (const grid of id === 10 ? ['mobile', 'video'] : [undefined]) {
      const c = R.condition(id, {preset, grid});
      assert.deepEqual(plain(c), plain(oldR.condition(id, {preset, grid})));
      const a = rng(), b = rng();
      for (let i = 0; i < 50; i++) assert.deepEqual(plain(R.generate(id, c, a)), plain(oldR.generate(id, c, b)));
    }
    report.checks.push('Shared tools engine preserves conditions and seeded generators for 8–10 across all presets/grids');
    browser = await playwright.chromium.launch({executablePath: browserExecutable, headless: true});
    async function contextFor(file, records = []) {
      const context = await browser.newContext({viewport: {width: 390, height: 844}, isMobile: true, hasTouch: true});
      await context.addInitScript(records => {
        localStorage.setItem('focus-universe-ui-v1', JSON.stringify({reduced: false, seen: Array.from({length: 16}, (_, i) => i + 1)}));
        localStorage.setItem('focus-universe-history-v1', JSON.stringify(records));
      }, records);
      const page = await context.newPage();
      page.setDefaultTimeout(20000);
      page.on('pageerror', e => report.errors.push(e.message));
      const requests = [];
      page.on('request', r => {if (/^https?:/.test(r.url())) requests.push(r.url());});
      await page.goto(pathToFileURL(file).href + '#train/7');
      await page.waitForFunction(() => activeModule === 7 && settledModule === 7 && frameReady.has(7));
      const frame = await (await page.locator('iframe[title^="第7项"]').elementHandle()).contentFrame();
      return {context, page, frame, requests};
    }
    const current = await contextFor(HTML, fixtures);
    assert.equal(await current.page.evaluate(() => records.length), 8);
    assert.equal(await current.page.evaluate(() => bestRecords().size), 8);
    await current.page.evaluate(() => {
      const original = window.FocusDevice;
      let exported;
      window.FocusDevice = {exportBackup: text => {exported = text;}};
      focusExportBackup();
      window.FocusDevice = original;
      focusImportBackup(exported);
    });
    assert.deepEqual(await current.page.evaluate(() => records.map(r => r.detail.ruleVersion).sort()), [1, 1, 2, 2, 3, 3,4,4]);
    assert.equal(await current.page.evaluate(() => bestRecords().size), 8);
    report.checks.push('Real v1/v2/v3 and new v4 records survive startup, export/import and deduplication; four rules and two presets form eight comparison groups');
    await current.context.close();
    async function measure(file, preset, cpuRate) {
      console.log('Measure motion', file === HTML ? 'current' : 'baseline', preset, cpuRate);
      const run = await contextFor(file), {page, frame, context} = run;
      const cdp = await context.newCDPSession(page);
      await cdp.send('Emulation.setCPUThrottlingRate', {rate: cpuRate});
      await cdp.send('Performance.enable');
      await frame.locator('#preset').selectOption(preset);
      await frame.locator('#start').click();
      await frame.waitForFunction(() => toolState.phase === 'motion');
      if(file===HTML)await frame.waitForFunction(()=>document.getAnimations().filter(a=>a.effect?.target?.classList.contains('tracking-ball')).length===toolState.condition.balls);
      const metricsBefore = await cdp.send('Performance.getMetrics');
      const data = await frame.evaluate(() => new Promise(resolve => {
        const state = toolState, intervals = [];
        let previous = performance.now(), start = previous, paints = 0, clockWrites = 0,transformWrites=0;
        const ctx = document.getElementById('canvas').getContext('2d');
        const fill = ctx.fillRect;
        ctx.fillRect = function(...args) {paints++; return fill.apply(this, args);};
        const observer = new MutationObserver(entries => {clockWrites += entries.length;});
        observer.observe(document.getElementById('clock'), {childList: true});
        const transforms=new MutationObserver(entries=>{transformWrites+=entries.length;});
        document.querySelectorAll('.tracking-ball').forEach(node=>transforms.observe(node,{attributes:true,attributeFilter:['style']}));
        function sample(now) {
          intervals.push(now - previous); previous = now;
          if (now - start < 1800) {requestAnimationFrame(sample); return;}
          ctx.fillRect = fill; observer.disconnect();transforms.disconnect();
          const sorted = [...intervals].sort((a, b) => a - b);
          resolve({samples: intervals.length, p95Ms: sorted[Math.floor(sorted.length * .95)], maxMs: Math.max(...intervals), over50ms: intervals.filter(v => v > 50).length, paints, clockWrites,transformWrites,nativeMotion:document.getAnimations().filter(a=>a.effect?.target?.classList.contains('tracking-ball')).length,phase: state.phase, ballLayers: document.querySelectorAll('.tracking-ball').length});
        }
        requestAnimationFrame(sample);
      }));
      const metricsAfter = await cdp.send('Performance.getMetrics');
      const toMap = r => Object.fromEntries(r.metrics.map(m => [m.name, m.value]));
      const before = toMap(metricsBefore), after = toMap(metricsAfter);
      data.layoutCount = after.LayoutCount - before.LayoutCount;
      data.taskMs = (after.TaskDuration - before.TaskDuration) * 1000;
      data.cpuThrottle = cpuRate;
      data.preset = preset;
      assert.equal(data.phase, 'motion');
      assert.deepEqual(run.requests, []);
      if (file === HTML) {
        assert.equal(data.paints, 0, 'moving balls must not repaint canvas');
        assert.equal(data.transformWrites,0,'native motion must not write each ball transform every frame');
        assert.equal(data.nativeMotion,preset==='normal'?10:12);
        assert.ok(data.clockWrites <= 22, 'clock should update only when its tenth changes');
        assert.equal(data.ballLayers, preset === 'normal' ? 10 : 12);
        assert.equal(await frame.locator('.tracking-ball.target').count(), 0);
        assert.ok((await frame.locator('.tracking-ball').allTextContents()).every(t => t === ''));
        await frame.waitForFunction(() => toolState.phase === 'answer');
        const labels = await frame.evaluate(() => [...document.querySelectorAll('.tracking-ball')].map((node, i) => ({
          label: Number(node.textContent), expected: toolState.question.labels[i],
          x: new DOMMatrixReadOnly(node.style.transform).m41,
          expectedX: toolState.question.balls[i].x * document.querySelector('.tracking-layer').getBoundingClientRect().width
        })));
        for (const item of labels) {assert.equal(item.label, item.expected); assert.ok(Math.abs(item.x - item.expectedX) < .01);}
        await frame.locator('#next').evaluate(() => document.getElementById('stop').click());
        assert.equal(await frame.evaluate(() => toolState.phase), 'aborted');
      }
      await context.close();
      return data;
    }
    report.observations.oldNormal = await measure(historical, 'normal', 1);
    report.observations.previousNormal = await measure(path.join(require('node:os').homedir(), '.cache/focus-motion162.html'), 'normal', 1);
    report.observations.currentNormal = await measure(HTML, 'normal', 1);
    report.observations.currentStrongCpu4 = await measure(HTML, 'strong', 4);
    report.checks.push('Sequential real-clock browser samples compare 1.50/1.62/current, normal and strong/4x CPU; no per-frame transform writes with native playback, bounded clocks, no target identity cues and exact final labels');
    const gapRun = await contextFor(HTML);
    await gapRun.frame.locator('#start').click();
    await gapRun.frame.waitForFunction(() => toolState.phase === 'motion' && toolState.deadline - performance.now() > 4000);
    await gapRun.frame.evaluate(() => {const until = performance.now() + 320; while (performance.now() < until) { /* inject one stall */ }});
    await gapRun.frame.waitForFunction(() => toolState.phase === 'aborted');
    assert.equal(await gapRun.frame.evaluate(()=>document.getAnimations().filter(a=>a.playState==='running').length),0);
    assert.match(await gapRun.frame.locator('#notice').textContent(), /停顿/);
    assert.equal(await gapRun.page.evaluate(() => records.some(r => r.detail?.status === 'complete')), false);
    const frozen = await gapRun.frame.evaluate(() => JSON.stringify(toolState.question.balls));
    await gapRun.page.waitForTimeout(400);
    assert.equal(await gapRun.frame.evaluate(() => JSON.stringify(toolState.question.balls)), frozen);
    await gapRun.context.close();
    report.checks.push('Injected 320 ms main-thread stall interrupts tracking without completing or silently simulating unseen motion; callbacks stay cancelled');
    const dynamic = await contextFor(HTML);
    await dynamic.page.evaluate(() => location.hash = '#train/5');
    await dynamic.page.waitForFunction(() => settledModule === 5 && frameReady.has(5));
    const f5 = await (await dynamic.page.locator('iframe[title^="第5项"]').elementHandle()).contentFrame();
    await f5.locator('#start').click();
    await f5.waitForFunction(() => state.phase === 'observing');
    const observed = await f5.evaluate(() => new Promise(resolve => {
      const started = state.observationStarted, bar = document.getElementById('observationProgress');
      const widths = [], transforms = [];
      function sample() {
        widths.push(bar.style.width);transforms.push(bar.style.transform);
        if (state.phase === 'observing') requestAnimationFrame(sample);
        else resolve({elapsed: performance.now() - started, planned: state.observationMs, widthCount: new Set(widths).size, widths, transformCount: new Set(transforms).size});
      }
      sample();
    }));
    assert.ok(observed.elapsed >= observed.planned);
    assert.equal(observed.widthCount, 1);
    assert.ok(observed.widths.every(w => w === '100%'));
    assert.ok(observed.transformCount > 10);
    report.observations.dynamic = {elapsed: observed.elapsed, planned: observed.planned, widthCount: observed.widthCount, transformCount: observed.transformCount};
    await dynamic.page.evaluate(() => focusAndroidSuspend());
    assert.equal(await f5.evaluate(() => state.running), false);
    await dynamic.context.close();
    report.checks.push('Dynamic perception observes for the full requested interval with a fixed-width compositor-scaled progress bar and cancels on background');
    assert.deepEqual(report.errors, []);
    console.log('PASS task motion', report.checks.length, JSON.stringify(report.observations));
  } catch (error) {
    report.errors.push(error.stack);throw error;
  } finally {
    fs.writeFileSync(path.join(OUT, `动态训练验收-${VERSION}.json`), JSON.stringify(report, null, 2));
    await browser?.close();
  }
})().catch(error => {console.error(error);process.exitCode = 1;});
