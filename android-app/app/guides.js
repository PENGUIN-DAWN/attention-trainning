const guide = node('dialog', 'records-dialog');
guide.id = 'guideDialog';
guide.setAttribute('aria-labelledby', 'guideTitle');
guide.innerHTML =
  '<div class="dialog-head"><h2 id="guideTitle"></h2><button class="dialog-close" aria-label="关闭小示例">×</button></div><div class="guide-visual" id="guideVisual"></div><p class="guide-copy" id="guideCopy"></p><div class="guide-actions"><button id="skipGuide" type="button">跳过示例</button><button id="dismissGuide" type="button">知道了</button></div>';
document.body.appendChild(guide);

function maybeGuide(id) {
  if (preferences.seen.includes(id) || activeModule !== id) return;
  preferences.seen.push(id);
  try {
    localStorage.setItem(UI_KEY, JSON.stringify(preferences));
  } catch {}
  $('guideTitle').textContent = modulesById.get(id).title + ' · 小示例';
  $('guideVisual').textContent = trainingsById.get(id).example.visual;
  if (id === 2) {
    $('guideVisual').replaceChildren();
    const word = node('span', null, '白');
    word.style.color = '#2c61ae';
    $('guideVisual').append(word, node('span', null, ' → 选「蓝」'));
  }
  $('guideCopy').textContent = trainingsById.get(id).example.copy;
  guide.style.setProperty('--guide-tint', trainingsById.get(id).tint);
  guide.style.setProperty('--guide-accent', modulesById.get(id).accent);
  guide.showModal();
}
for (const button of guide.querySelectorAll('button')) button.onclick = () => guide.close();
