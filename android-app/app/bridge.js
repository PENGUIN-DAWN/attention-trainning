window.addEventListener('message', event => {
  const data = event.data;
  if (!data || !Number.isInteger(data.module) || event.source !== frames.get(data.module)
    ?.contentWindow) return;
  const id = data.module,
    frame = frames.get(id);
  if (data.type === 'focus:ready') {
    frameReady.add(id);
    if (activeModule === id) {
      $('frameLoading').hidden = true;
      activateFrame(id);
    }
    return;
  }
  if (data.type === 'focus:height') {
    if (Number.isFinite(data.height)) frame.style.height = Math.max(180, Math.min(5000, data
      .height)) + 'px';
    return;
  }
  if (data.type === 'focus:settings') {
    settings = cleanSettings({
      ...settings,
      [id]: data.settings
    });
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch {
      showToast('设置未能保存，请稍后重试。');
    }
    return;
  }
  if (data.type === 'focus:navigate') {
    if (data.target === null || Number.isInteger(data.target) && hasTraining(data.target))
      navigate(data.target);
    return;
  }
  if (data.type === 'focus:reveal-result' && activeModule === id) {
    requestAnimationFrame(() => {
      if (activeModule === id) window.scrollTo({
        top: Math.max(0, window.scrollY + frame.getBoundingClientRect().top + data.top -
          20),
        behavior: reducedMotion() ? 'instant' : 'smooth'
      });
    });
    return;
  }
  if (data.type === 'focus:focus-input' && activeModule === id) {
    requestAnimationFrame(() => {
      const top = frame.getBoundingClientRect().top + data.top,
        bottom = frame.getBoundingClientRect().top + data.bottom,
        visible = window.visualViewport?.height || innerHeight;
      if (bottom > visible - 12) window.scrollBy(0, bottom - visible + 18);
      else if (top < 12) window.scrollBy(0, top - 18);
    });
    return;
  }
  if (!['focus:complete', 'focus:interrupted'].includes(data.type) || typeof data.token !==
    'string' || !data.record) return;
  if (records.some(r => r.token === data.token)) {
    sendTo(id, {
      type: 'focus:saved',
      saved: true
    });
    return;
  }
  const item = {
    module: id,
    token: data.token,
    at: Date.now(),
    summary: summaryFor(id, data.record)
  };
  item.detail = detailFor(id, data.record);
  if (engineFor(id) !== 'legacy' && !item.detail) return;
  const next = [item, ...records].slice(0, 200);
  let saved = true;
  try {
    FocusStorage.transaction([
      [STORAGE_KEY, JSON.stringify(next)]
    ]);
    records = next;
  } catch {
    saved = false;
  }
  updateToday();
  sendTo(id, {
    type: 'focus:saved',
    saved
  });
  if (!saved) showToast('记录保存失败，可以先导出备份。');
  if ($('recordsDialog').open) renderRecords();
});
