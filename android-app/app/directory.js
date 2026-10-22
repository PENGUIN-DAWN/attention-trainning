function buildDirectory() {
  modules.forEach((module, index) => {
    const link = document.createElement('a');
    link.href = '#train/' + module.id;
    link.className = 'orb-shell training-card';
    link.id = 'orb' + module.id;
    link.setAttribute('aria-label', '第' + module.id + '项，' + module.title + '，进入训练');
    link.style.setProperty('--card-accent', trainingsById.get(module.id).cardAccent);
    link.style.setProperty('--module-ink', module.accent);
    link.style.setProperty('--module-tint', trainingsById.get(module.id).tint);
    link.innerHTML = '<div class="orb-float"><div class="bubble"><span class="orb-number">' +
      String(module.id).padStart(2, '0') +
      '</span><svg class="orb-icon" viewBox="0 0 64 64" aria-hidden="true">' + trainingsById
      .get(module.id).icon + '</svg><h2>' + module.title + '</h2><p>' + module.short +
      '</p><span class="card-meta" id="cardMeta' + module.id +
      '">尚未开始</span><span class="enter">进入训练 ' + appIcon('arrow') + '</span><span class="visit-mark" aria-label="今日已完成">' + appIcon('check') + '</span></div></div>';
    installCardHover(link);
    $('bubbleField').appendChild(link);
    const tab = document.createElement('a');
    tab.className = 'module-tab';
    tab.href = link.hash;
    tab.id = 'tab' + module.id;
    tab.innerHTML = '<span>' + String(module.id).padStart(2, '0') + '</span>' + module.title;
    $('moduleTabs').appendChild(tab);
  });
  for (const item of modules) {
    const dot = document.createElement('i');
    dot.dataset.module = item.id;
    $('todayProgress').appendChild(dot);
  }
}

function updateDirectoryDetails() {
  for (const module of modules) {
    const last = records.find(r => r.module === module.id);
    $('cardMeta' + module.id).textContent = last ? '最近练习 · ' + new Intl.DateTimeFormat('zh-CN', {
      month: 'numeric',
      day: 'numeric',
      timeZone: 'Asia/Shanghai'
    }).format(new Date(last.at)) : '尚未开始';
  }
  const latest = records[0];
  $('recentCard').hidden = !latest;
  if (latest) {
    $('recentCard').href = '#train/' + latest.module;
    $('recentTitle').textContent = modulesById.get(latest.module).title;
  }
}
