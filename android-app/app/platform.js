let largestViewport = innerHeight;

function updateViewport() {
  const height = window.visualViewport?.height || innerHeight;
  largestViewport = Math.max(largestViewport, height);
  const keyboard = trainingsById.get(activeModule)?.keyboard && height < largestViewport * .75;
  document.body.classList.toggle('keyboard-open', keyboard);
  if (activeModule !== null) sendTo(activeModule, {
    type: 'focus:viewport',
    height,
    keyboard
  });
}
window.visualViewport?.addEventListener('resize', updateViewport);
window.addEventListener('resize', updateViewport);
window.addEventListener('orientationchange', () => {
  largestViewport = innerHeight;
  updateViewport();
});
window.focusAndroidSuspend = () => {
  appFeedback.suspend();
  routeVersion++;
  routeAnimation?.cancel();
  stopHomeMotion();
  settledModule = null;
  if (activeModule !== null) sendTo(activeModule, {
    type: 'focus:suspend'
  });
};
window.focusAndroidResume = () => {
  appFeedback.activate();
  if (renderedModule !== activeModule) {
    routeInitialized = false;
    route();
  } else if (activeModule !== null) {
    settledModule = activeModule;
    activateFrame(activeModule);
  }
  updateMotion();
};
window.focusAndroidBack = () => {
  for (const dialog of [...document.querySelectorAll('dialog[open]')].reverse()) {
    dialog.close();
    return true;
  }
  const child = frames.get(activeModule)?.contentWindow;
  if (child?.focusCloseDialog?.()) return true;
  if (activeModule !== null) {
    window.focusAndroidSuspend();
    navigate(null);
    return true;
  }
  return false;
};
document.addEventListener('visibilitychange', () => {
  if (document.hidden) window.focusAndroidSuspend();
  else window.focusAndroidResume();
});
window.addEventListener('pagehide', () => appFeedback.suspend());
window.addEventListener('pageshow', () => appFeedback.activate());
$('rulesButton').onclick = () => {
  if (activeModule === null || !frameReady.has(activeModule)) return;
  const id = activeModule;
  sendTo(id, {
    type: 'focus:suspend'
  });
  settledModule = id;
  activateFrame(id);
  sendTo(id, {
    type: 'focus:help'
  });
};
$('recordsButton').onclick = () => {
  if (activeModule !== null) {
    const id = activeModule;
    sendTo(id, {
      type: 'focus:suspend'
    });
    settledModule = id;
    activateFrame(id);
  }
  showRecords();
};
$('closeRecords').onclick = () => $('recordsDialog').close();
window.addEventListener('hashchange', route);
window.addEventListener('pageshow', updateToday);
