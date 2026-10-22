function moduleSource(module) {
  const config = {
    id: module.id,
    title: module.title,
    accent: trainingsById.get(module.id).actionAccent,
    tint: trainingsById.get(module.id).tint,
    reduced: reducedMotion(),
    effectsMuted: preferences.effectsMuted,
    settings: settings[module.id] || {}
  };
  const feedbackScript = '<script>' + presentation.feedback + '<' + '/script>';
  const source = module.source.replace('</head>', feedbackScript + '</head>');
  const themed = source.replace('</head>', '<style>' + presentation.chrome +
    '</style></head>');
  const chromeScript = '\n' + presentation.chromeUI + '\ninstallChromeUI(' + module.id + ');';
  if (engineFor(module.id) === 'advanced') {
    if (trainingsById.get(module.id).audio) config.audio = JSON.parse($('digitAudio').textContent);
    return themed.replace('</body>', '<script>installAdvancedUI(' + JSON.stringify(config) + ');<' +
      '/script><script>' + chromeScript + '<' + '/script></body>');
  }
  if (engineFor(module.id) !== 'legacy') return themed.replace('</body>', '<script>installToolUI(' +
    JSON.stringify(config) + ');\n' + presentation.chromeStatus + '\ninstallChromeStatus();<' +
    '/script><script>' + chromeScript + '<' + '/script></body>');
  return source.replace('</head>', '<style>' + presentation.css + '\n' + presentation
    .chrome + '</style></head>').replace('</body>', '<script>' + presentation.js +
    '\ninstallTrainingUI(' + JSON.stringify(config) + ');<' + '/script><script>' + chromeScript + '<' + '/script></body>');
}

function getFrame(module) {
  if (frames.has(module.id)) return frames.get(module.id);
  const frame = document.createElement('iframe');
  frame.className = 'training-frame';
  frame.title = '第' + module.id + '项：' + module.title;
  frame.setAttribute('sandbox', 'allow-scripts allow-same-origin');
  frame.setAttribute('scrolling', 'no');
  frame.hidden = true;
  frame.srcdoc = moduleSource(module);
  frames.set(module.id, frame);
  $('frameHost').appendChild(frame);
  return frame;
}

function activateFrame(id) {
  sendTo(id, {
    type: 'focus:activate',
    reduced: reducedMotion()
  });
  updateViewport();
  if (settledModule === id) sendTo(id, {
    type: 'focus:transition-ready'
  });
}

function animateView(view, duration, exit = false) {
  if (reducedMotion() || document.hidden) return Promise.resolve();
  const animation = view.animate(exit ? [{
    opacity: 1,
    transform: 'translateY(0)'
  }, {
    opacity: 0,
    transform: 'translateY(4px)'
  }] : [{
    opacity: 0,
    transform: 'translateY(8px)'
  }, {
    opacity: 1,
    transform: 'translateY(0)'
  }], {
    duration,
    easing: 'cubic-bezier(.2,.7,.2,1)'
  });
  routeAnimation = animation;
  return animation.finished.catch(() => {});
}
async function route() {
  const match = location.hash.match(/^#train\/([1-9]\d*)$/);
  const requested = match ? Number(match[1]) : null;
  const id = hasTraining(requested) ? requested : null;
  if (routeInitialized && id === activeModule) return;
  appFeedback.stop(true);
  const previous = activeModule;
  if (previous === null && id !== null) homeScroll = window.scrollY;
  if (previous !== null) sendTo(previous, {
    type: 'focus:suspend'
  });
  routeInitialized = true;
  activeModule = id;
  settledModule = null;
  const ticket = ++routeVersion;
  routeAnimation?.cancel();
  stopHomeMotion();
  if (previous !== null || id !== null && directoryEntranceDone) {
    await animateView(previous === null ? $('homeView') : $('playView'), 160, true);
    if (ticket !== routeVersion) return;
  }
  renderedModule = id;
  for (const [number, frame] of frames) frame.hidden = number !== id;
  document.body.dataset.training = String(id !== null);
  $('homeView').hidden = id !== null;
  $('playView').hidden = id === null;
  if (id === null) {
    document.title = '专注力小宇宙';
    updateToday();
    window.scrollTo(0, homeScroll);
    if (previous !== null) animateView($('homeView'), 190).then(() => {
      if (ticket === routeVersion) window.scrollTo(0, homeScroll);
    });
    else enterDirectory(true);
    return;
  }
  const module = modulesById.get(id);
  $('playTitle').textContent = module.title;
  $('playDescription').textContent = trainingsById.get(id).rule;
  $('playNumber').textContent = String(id).padStart(2, '0');
  clearTimeout(toastTimer);
  $('toast').classList.remove('visible');
  $('playView').style.setProperty('--module-accent', module.accent);
  $('playView').style.setProperty('--module-bg', trainingsById.get(id).tint);
  document.title = module.title + ' · 专注力小宇宙';
  for (const item of modules) {
    $('tab' + item.id).classList.toggle('active', item.id === id);
    $('tab' + item.id).setAttribute('aria-current', item.id === id ? 'page' : 'false');
  }
  const frame = getFrame(module);
  frame.hidden = false;
  $('frameLoading').hidden = frameReady.has(id);
  window.scrollTo(0, 0);
  if (frameReady.has(id)) activateFrame(id);
  animateView($('playView'), 260).then(() => {
    if (ticket !== routeVersion || activeModule !== id) return;
    settledModule = id;
    if (frameReady.has(id)) sendTo(id, {
      type: 'focus:transition-ready'
    });
    maybeGuide(id);
  });
}

function navigate(target) {
  const hash = target === null ? '#home' : '#train/' + target;
  if (location.hash !== hash) location.hash = hash;
}
