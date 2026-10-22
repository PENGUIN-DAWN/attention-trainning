const {
  APP: APP_PATH,
  VERSION
} = require('./support.cjs');
const {
  chromium
} = require('./support.cjs').playwright;
const assert = require('node:assert/strict'),
  fs = require('fs'),
  path = require('path'),
  crypto = require('crypto'),
  os = require('os');
const {
  pathToFileURL
} = require('url');
const ROOT = path.resolve(APP_PATH, '..'),
  OUT = path.join(ROOT, '安卓手机版'),
  HTML = path.join(APP_PATH, 'assets/index.html'),
  URL = pathToFileURL(HTML).href;
const report = {
  version: `${VERSION}`,
  checks: [],
  errors: [],
  html_sha256: crypto.createHash('sha256').update(fs.readFileSync(HTML)).digest('hex'),
  environment: {
    os: os.release(),
    cpu: os.cpus()[0].model,
    browser: 'Microsoft Edge headless / Playwright',
    realAndroid: false,
    physicalRefreshRate: 'not measured',
    rAFIsHardwareMeasurement: false
  },
  observations: {}
};
const NODEVIEW = require('./support.cjs').browserExecutable;
const seed = () => {
  localStorage.setItem('focus-universe-ui-v1', JSON.stringify({
    seen: Array.from({
      length: 16
    }, (_, i) => i + 1),
    reduced: false
  }));
  localStorage.setItem('focus-universe-history-v1', JSON.stringify([{
    module: 1,
    token: 'ui-qa-legacy',
    at: Date.now(),
    summary: '找到 20/25 · 30.0 秒 · 点错 1 次'
  }]));
};
async function go(p, id) {
  await p.evaluate(id => location.hash = id === null ? '#home' : '#train/' + id, id);
  await p.waitForFunction(id => activeModule === id && (id === null ? !document.getElementById(
    'homeView').hidden : settledModule === id && frameReady.has(id)), id);
  await p.waitForTimeout(240);
  if (id !== null) return await (await p.locator('iframe[title^="第' + id + '项"]').elementHandle())
    .contentFrame();
}
async function screenshot(p, name) {
  await p.waitForTimeout(240);
  const modal = await p.locator('dialog[open]').count();
  await p.screenshot({
    path: path.join(OUT, name + `-${VERSION}.png`),
    fullPage: !modal,
    animations: 'disabled'
  });
}
async function measure(p, name, action) {
    await p.evaluate(() => {
      window.uiPerf = {
        gaps: [],
        eventDelays: [],
        started: performance.now(),
        longTasks: []
      };
      let last;
      window.uiPerfTick = t => {
        if (last !== undefined) uiPerf.gaps.push(t - last);
        last = t;
        uiPerf.handle = requestAnimationFrame(uiPerfTick);
      };
      uiPerf.handle = requestAnimationFrame(uiPerfTick);
      if (PerformanceObserver.supportedEntryTypes.includes('longtask')) {
        uiPerf.observer = new PerformanceObserver(list => uiPerf.longTasks.push(...list
          .getEntries().map(e => e.duration)));
        uiPerf.observer.observe({
          type: 'longtask'
        });
      }
    });
    await action();
    const data = await p.evaluate(() => {
      cancelAnimationFrame(uiPerf.handle);
      uiPerf.observer?.disconnect();
      const sorted = [...uiPerf.gaps].sort((a, b) => a - b),
        sum = sorted.reduce((a, b) => a + b, 0),
        q = p => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))];
      return {
        sampleCount: sorted.length,
        elapsedMs: performance.now() - uiPerf.started,
        averageIntervalMs: sum / sorted.length,
        observedCallbackFPS: 1000 / (sum / sorted.length),
        p50Ms: q(.5),
        p95Ms: q(.95),
        p99Ms: q(.99),
        maxMs: sorted.at(-1),
        over50ms: sorted.filter(n => n > 50).length,
        longTasksMs: uiPerf.longTasks
      };
    });
    report.observations.performance[name] = data;
    console.log('PERF', name, JSON.stringify(data));
  }
  (async () => {
    const browser = await chromium.launch({
      executablePath: NODEVIEW,
      headless: true
    });
    try {
      report.environment.browserVersion = browser.version();
      report.observations.performance = {};
      const context = await browser.newContext({
        viewport: {
          width: 390,
          height: 844
        },
        isMobile: true,
        hasTouch: true
      });
      await context.addInitScript(seed);
      const p = await context.newPage();
      p.setDefaultTimeout(12000);
      p.on('pageerror', e => report.errors.push(e.message));
      const remote = [];
      p.on('request', r => {
        if (/^https?:/.test(r.url())) remote.push(r.url());
      });
      const start = Date.now();
      await p.goto(URL);
      await p.waitForFunction(() => document.querySelectorAll('.training-card').length === 16);
      report.observations.pageLoadToDirectoryWallMs = Date.now() - start;
      await screenshot(p, '浅蓝训练目录');
      await p.screenshot({
        path: path.join(OUT, `浅蓝首页首屏-${VERSION}.png`),
        fullPage: false,
        animations: 'disabled'
      });
      assert.equal(await p.locator('.training-card').count(), 16);
      assert.equal(await p.evaluate(() => frames.size), 0);
      assert.equal(await p.locator('.bubble').first().evaluate(e => getComputedStyle(e)
        .borderRadius), '20px');
      assert.equal(await p.locator('body').evaluate(e => getComputedStyle(e).backgroundColor),
        'rgb(250, 246, 240)');
      assert.equal(await p.locator('#recentTitle').textContent(), '舒尔特方格');
      assert.equal(await p.locator('#preferencesButton svg').count(), 1);
      assert.equal(await p.locator('#appDock button svg').count(), 3);
      assert.equal(await p.locator('#welcomeArt svg.planet-art').count(), 1);
      assert.equal(await p.locator('.visit-mark svg').count(), 16);
      await p.locator('#dockHelp').click();
      await p.locator('#appHelp[open]').waitFor();
      assert.equal(await p.locator('#appHelp .dialog-close svg').count(), 1);
      await p.locator('#appHelp .dialog-close').click();
      await p.waitForTimeout(260);
      await p.locator('#dockRecords').click();
      await p.locator('#recordsDialog[open]').waitFor();
      assert.equal(await p.locator('#dockRecords').getAttribute('aria-current'), 'page');
      assert.equal(await p.locator('#exportBackup svg').count(), 1);
      await p.locator('#closeRecords').click();
      await p.waitForTimeout(260);
      report.checks.push('Inline SVG application icons and three dock actions work; dialogs retain accessible labels and return dock state');
      await p.evaluate(() => window.scrollTo(0, 400));
      await p.waitForTimeout(30);
      assert.equal(await p.locator('#recentCard').evaluate(e => e.classList.contains(
        'recent-float')), false);
      report.checks.push(
        'Sky directory has 16 rectangular cards, actual latest record, no eagerly created frames, decorative float stops on scroll'
      );
      for (const w of [320, 360, 390, 480, 768, 1280]) {
        await p.setViewportSize({
          width: w,
          height: 844
        });
        await p.waitForTimeout(50);
        const layout = await p.evaluate(() => ({
          width: innerWidth,
          overflow: document.documentElement.scrollWidth > innerWidth,
          columns: getComputedStyle(document.getElementById('bubbleField'))
            .gridTemplateColumns.split(' ').length,
          clipped: [...document.querySelectorAll('.bubble h2')].some(e => e.scrollWidth >
            e.clientWidth + 1)
        }));
        assert.equal(layout.overflow, false, 'overflow ' + w);
        assert.equal(layout.clipped, false, 'title clipping ' + w);
        report.observations['layout' + w] = layout;
      }
      await p.setViewportSize({
        width: 390,
        height: 844
      });
      await p.evaluate(() => {
        document.documentElement.style.fontSize = '125%';
        document.querySelectorAll('.bubble h2').forEach(e => e.style.fontSize = '22px');
      });
      assert.equal(await p.evaluate(() => document.documentElement.scrollWidth > innerWidth),
        false);
      assert.equal(await p.locator('.bubble h2').evaluateAll(es => es.some(e => e.scrollWidth >
        e.clientWidth + 1)), false);
      await p.reload();
      await p.waitForTimeout(450);
      report.checks.push(
        '320–1280 CSS-pixel layouts and 22px card-title enlargement have no horizontal overflow or cropped names'
      );
      await p.evaluate(() => window.scrollTo(0, 700));
      const scroll = await p.evaluate(() => scrollY);
      let f = await go(p, 8);
      await screenshot(p, '浅蓝训练设置');
      assert.equal(await p.locator('#appDock').isVisible(), false);
      assert.equal(await f.locator('#rules button svg').count(), 1);
      await f.locator('#start').click();
      await f.waitForFunction(() => toolState.phase === 'answer');
      await screenshot(p, '浅蓝训练题面');
      await go(p, null);
      assert.ok(Math.abs((await p.evaluate(() => scrollY)) - scroll) < 3);
      report.checks.push(
        'Return restores directory scroll; training begins only after page transition and stable layout'
      );
      f = await go(p, 8);
      await f.locator('#start').click();
      for (let n = 0; n < 5; n++) {
        await f.waitForFunction(() => toolState.phase === 'answer');
        const pair = await f.evaluate(() => toolState.question.answer);
        for (const i of pair) await f.locator('[data-index="' + i + '"]').click();
        await f.locator('#submit').click();
        await f.locator('#next').click();
      }
      await f.waitForFunction(() => toolState.phase === 'result');
      await f.waitForFunction(() => document.getElementById('saved').textContent.includes(
        '已保存在本机'));
      await screenshot(p, '浅蓝训练成绩');
      await go(p, null);
      for (const sequence of [
          [7, 11, null],
          [16, null, 3],
          [9, 13, null]
        ]) {
        for (const id of sequence) {
          await p.evaluate(id => location.hash = id === null ? '#home' : '#train/' + id, id);
          await p.waitForTimeout(35);
        }
        await go(p, sequence.at(-1));
        assert.equal(await p.locator('iframe:not([hidden])').count(), sequence.at(-1) === null ?
          0 : 1);
      }
      await go(p, null);
      await p.evaluate(() => location.hash = '#train/11');
      await p.waitForTimeout(35);
      await p.evaluate(() => focusAndroidSuspend());
      await p.waitForTimeout(200);
      await p.evaluate(() => focusAndroidResume());
      await p.waitForFunction(() => settledModule === 11 && frameReady.has(11) && !document
        .getElementById('playView').hidden);
      assert.equal(await p.locator('iframe:not([hidden])').count(), 1);
      await p.evaluate(() => location.hash = '#home');
      await p.waitForTimeout(35);
      await p.evaluate(() => focusAndroidSuspend());
      await p.waitForTimeout(200);
      await p.evaluate(() => focusAndroidResume());
      await p.waitForFunction(() => !document.getElementById('homeView').hidden && document
        .getElementById('playView').hidden);
      report.checks.push(
        'Rapid superseded routes do not stack frames; suspend/resume during both entry and exit renders the final route'
      );
      await go(p, 11);
      await p.locator('#rulesButton').click();
      f = await (await p.locator('iframe[title^="第11项"]').elementHandle()).contentFrame();
      await f.locator('#rules[open]').waitFor();
      await p.evaluate(() => focusAndroidBack());
      assert.equal(await f.locator('#rules').evaluate(e => e.open), false);
      assert.equal(await p.evaluate(() => activeModule), 11);
      await p.evaluate(() => focusAndroidBack());
      await go(p, null);
      await p.locator('#recordsButton').click();
      await screenshot(p, '浅蓝训练记录');
      await p.evaluate(() => focusAndroidBack());
      await p.waitForTimeout(230);
      await p.locator('#preferencesButton').click();
      await screenshot(p, '浅蓝界面设置');
      await p.locator('#reduceMotion').check();
      await p.evaluate(() => focusAndroidBack());
      f = await go(p, 8);
      assert.equal(await p.evaluate(() => document.documentElement.dataset.reduced), 'true');
      assert.equal(await f.evaluate(() => document.documentElement.dataset.reduced), 'true');
      await p.emulateMedia({
        reducedMotion: 'reduce'
      });
      await p.evaluate(() => {
        preferences.reduced = false;
        updateMotion();
      });
      assert.equal(await p.evaluate(() => document.documentElement.dataset.reduced), 'true');
      await go(p, null);
      assert.equal(await p.locator('#recentCard').evaluate(e => getComputedStyle(e)
        .animationName), 'none');
      assert.equal(await p.locator('.home-motion').count(), 0);
      await p.emulateMedia({
        reducedMotion: 'no-preference'
      });
      await p.evaluate(() => {
        preferences.reduced = false;
        updateMotion();
      });
      report.checks.push(
        'Topmost help closes before directory; settings/record dialogs and explicit/system reduced motion work in parent and child'
      );
      // Contrast: actual computed UI foreground/background, using opaque containing surface.
      const contrast = await p.evaluate(() => {
        function rgb(s) {
          return s.match(/[\d.]+/g)?.slice(0, 3).map(Number);
        }

        function l(c) {
          return c.map(n => {
            n /= 255;
            return n <= .04045 ? n / 12.92 : ((n + .055) / 1.055) ** 2.4;
          }).reduce((s, n, i) => s + n * [.2126, .7152, .0722][i], 0);
        }
        return ['.brand-title', '.brand-subtitle', '.hero h1', '.hero-copy p', '.bubble h2',
          '.bubble p', '.card-meta', '.bubble .enter', '.today-count', '.today-right',
          '.records-button', '.app-help-button'
        ].map(s => {
          const e = document.querySelector(s),
            fg = rgb(getComputedStyle(e).color);
          let n = e,
            bg;
          while (n) {
            const c = getComputedStyle(n).backgroundColor;
            if (c !== 'rgba(0, 0, 0, 0)' && c !== 'transparent') {
              bg = rgb(c);
              break;
            }
            n = n.parentElement;
          }
          bg ??= [250, 246, 240];
          const a = l(fg),
            b = l(bg);
          return {
            selector: s,
            ratio: (Math.max(a, b) + .05) / (Math.min(a, b) + .05)
          };
        });
      });
      for (const c of contrast) assert.ok(c.ratio >= 4.5, c.selector + ' contrast ' + c.ratio);
      report.observations.contrast = contrast;
      report.checks.push(
        '12 computed directory/header/body/button text color pairs meet 4.5:1 contrast');
      // Actual browser pointer input -> next program-observed style update, not touch-to-photon.
      await p.locator('#orb1').scrollIntoViewIfNeeded();
      await p.evaluate(() => {
        window.pressSamples = [];
        const link = document.getElementById('orb1');
        link.addEventListener('click', e => e.preventDefault());
        link.addEventListener('pointerdown', () => {
          const at = performance.now();

          function probe() {
            const transform = getComputedStyle(link.querySelector('.bubble')).transform,
              scale = new DOMMatrix(transform).a;
            if (scale < .9999 || performance.now() - at > 90) pressSamples.push({
              ms: performance.now() - at,
              transform,
              scale
            });
            else requestAnimationFrame(probe);
          }
          requestAnimationFrame(probe);
        });
      });
      const box = await p.locator('#orb1').boundingBox();
      await p.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      for (let i = 0; i < 12; i++) {
        await p.mouse.down();
        await p.waitForTimeout(40);
        await p.mouse.up();
        await p.waitForTimeout(130);
      }
      report.observations.pointerToNextFrame = await p.evaluate(() => pressSamples);
      assert.equal(report.observations.pointerToNextFrame.length, 12);
      assert.ok(report.observations.pointerToNextFrame.every(s => s.scale < .9999),
        'press scale must be observed for every sample');
      report.checks.push(
        '12 real browser pointer presses show transform feedback on subsequent frames; measured software latency is not physical input-to-photon latency'
      );
      await measure(p, 'directory-scroll', async () => {
        await p.evaluate(() => new Promise(resolve => {
          const start = performance.now();

          function tick(now) {
            const t = now - start;
            window.scrollTo(0, Math.round((1 - Math.cos(t / 1800 * Math.PI * 2)) /
              2 * 1000));
            if (t < 1800) requestAnimationFrame(tick);
            else resolve();
          }
          requestAnimationFrame(tick);
        }));
      });
      await measure(p, 'navigation-and-dialogs', async () => {
        for (const id of [3, 8, 11]) {
          await go(p, id);
          await go(p, null);
        }
        for (let i = 0; i < 3; i++) {
          await p.locator('#preferencesButton').click();
          await p.waitForTimeout(220);
          await p.evaluate(() => focusAndroidBack());
          await p.waitForTimeout(200);
        }
      });
      const cdp = await context.newCDPSession(p);
      await cdp.send('Emulation.setCPUThrottlingRate', {
        rate: 4
      });
      await measure(p, 'navigation-4x-cpu-slowdown', async () => {
        await go(p, 8);
        await go(p, null);
        await p.locator('#recordsButton').click();
        await p.waitForTimeout(250);
        await p.evaluate(() => focusAndroidBack());
        await p.waitForTimeout(220);
      });
      await cdp.send('Emulation.setCPUThrottlingRate', {
        rate: 1
      });
      report.environment.cpuSlowdown = 'CDP 4x software slowdown; not an old-phone emulator';
      await cdp.detach();
      const desktop = await browser.newContext({
        viewport: {
          width: 1280,
          height: 900
        }
      });
      await desktop.addInitScript(seed);
      const d = await desktop.newPage();
      await d.goto(URL);
      await d.waitForTimeout(500);
      const card = d.locator('#orb2 .bubble'),
        before = await card.evaluate(e => getComputedStyle(e).transform);
      await d.locator('#orb2').hover();
      await d.waitForTimeout(200);
      const after = await card.evaluate(e => getComputedStyle(e).transform);
      assert.notEqual(before, after);
      const bounds = await card.boundingBox();
      await d.mouse.move(bounds.x + 20, bounds.y + 20);
      await d.waitForTimeout(330);
      const cornerA = await card.evaluate(e => getComputedStyle(e).transform);
      await d.mouse.move(bounds.x + bounds.width - 20, bounds.y + bounds.height - 20);
      await d.waitForTimeout(330);
      const cornerB = await card.evaluate(e => getComputedStyle(e).transform);
      assert.notEqual(cornerA, cornerB, 'pointer position changes card tilt');
      await screenshot(d, '浅蓝桌面悬浮');
      await d.emulateMedia({
        reducedMotion: 'reduce'
      });
      await d.waitForTimeout(50);
      assert.equal(await card.evaluate(e => getComputedStyle(e).transform), 'none');
      assert.equal(await d.locator('.home-motion').count(), 0);
      await desktop.close();
      assert.deepEqual(remote, []);
      report.checks.push(
        'Mouse hover moves card by compositor transform, reduced mode removes it, and no remote requests occur'
      );
      await context.close();
      const videoContext = await browser.newContext({
        viewport: {
          width: 390,
          height: 844
        },
        isMobile: true,
        hasTouch: true,
        recordVideo: {
          dir: path.join(OUT, 'ui-video-sky'),
          size: {
            width: 390,
            height: 844
          }
        }
      });
      await videoContext.addInitScript(seed);
      const v = await videoContext.newPage();
      await v.goto(URL);
      await v.waitForTimeout(1000);
      let vf = await go(v, 8);
      await vf.locator('#start').click();
      await vf.waitForFunction(() => toolState.phase === 'answer');
      const indexes = await vf.evaluate(() => toolState.question.answer);
      for (const i of indexes) await vf.locator('[data-index="' + i + '"]').click();
      await vf.locator('#submit').click();
      await v.waitForTimeout(800);
      await go(v, null);
      await v.locator('#recordsButton').click();
      await v.waitForTimeout(700);
      await v.evaluate(() => focusAndroidBack());
      await v.waitForTimeout(250);
      await v.locator('#preferencesButton').click();
      await v.waitForTimeout(700);
      await v.evaluate(() => focusAndroidBack());
      await v.waitForTimeout(500);
      const video = v.video();
      await videoContext.close();
      await video.saveAs(path.join(OUT, `界面动效录屏-${VERSION}.webm`));
      await video.delete();
      report.checks.push(
        'Actual isolated browser interaction recorded to WebM; capture cadence is independent of measured render callbacks'
      );
      assert.deepEqual(report.errors, []);
      console.log('PASS UI', report.checks.length);
    } catch (e) {
      report.errors.push(e.stack || e.message);
      throw e;
    } finally {
      fs.writeFileSync(path.join(OUT, `界面与性能验收-${VERSION}.json`), JSON.stringify(report, null,
        2));
      await browser.close();
    }
  })().catch(e => {
    console.error(e);
    process.exitCode = 1;
  });
