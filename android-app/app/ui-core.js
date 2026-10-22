function todayKey(timestamp = Date.now()) {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date(timestamp));
}

function node(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function showToast(message) {
  const modal = [...document.querySelectorAll('dialog[open]')].reverse()[0];
  if (modal) {
    let notice = modal.querySelector('.operation-status');
    if (!notice) {
      notice = node('p', 'operation-status');
      notice.setAttribute('role', 'status');
      const head = modal.querySelector('.dialog-head,h2');
      if (head) head.after(notice);
      else modal.prepend(notice);
    }
    notice.textContent = message;
    return;
  }
  $('toast').textContent = message;
  $('toast').classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $('toast').classList.remove('visible'), 3200);
}

function reducedMotion() {
  return preferences.reduced || systemReduced || mediaReduced.matches;
}

function sendTo(id, data) {
  const child = frames.get(id)?.contentWindow;
  if (child) child.dispatchEvent(new MessageEvent('message', {
    source: window,
    data
  }));
}

function updateMotion() {
  document.documentElement.dataset.reduced = String(reducedMotion());
  for (const id of frames.keys()) sendTo(id, {
    type: 'focus:motion',
    reduced: reducedMotion()
  });
  if (reducedMotion())
    for (const animation of document.getAnimations()) {
      try {
        animation.finish();
      } catch {
        animation.cancel();
      }
    }
}
window.focusUpdateSystemMotion = value => {
  systemReduced = Boolean(value);
  updateMotion();
};
try {
  systemReduced = Boolean(window.FocusDevice?.systemReducedMotion?.());
} catch {}
mediaReduced.addEventListener('change', updateMotion);

function updateToday() {
  const completed = new Set(records.filter(r => r.detail?.status !== 'interrupted' && todayKey(r
    .at) === todayKey()).map(r => r.module));
  $('todayCount').textContent = completed.size + ' / ' + modules.length + ' 项';
  for (const module of modules) {
    $('orb' + module.id).classList.toggle('done', completed.has(module.id));
    $('todayProgress').querySelector('[data-module="' + module.id + '"]').className = completed.has(
      module.id) ? 'done' : '';
  }
  $('todayHint').textContent = completed.size === modules.length ? '今天，全部训练都留下了足迹。' : completed
    .size ? '已完成 ' + completed.size + ' 项，按自己的节奏继续。' : '选择一项，给自己一小段专注时间。';
  updateDirectoryDetails();
}
