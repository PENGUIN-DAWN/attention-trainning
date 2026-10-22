/* Presentation only. No task content, stimulus dimensions, phases or clocks change here. */
function installChromeUI(id) {
  for (const button of document.querySelectorAll('.rules-head button')) {
    button.innerHTML = appIcon('close');
    button.setAttribute('aria-label', '关闭训练规则');
  }
  const next = document.getElementById('resultNext');
  if (next) {
    next.textContent = id === 6 ? '全部训练' : '下一项';
    next.insertAdjacentHTML('beforeend', appIcon('arrow'));
  }
  const result = document.getElementById('result');
  if (result) result.insertAdjacentHTML('afterbegin', '<div class="result-emblem" aria-hidden="true">' + appIcon('trophy') + '</div>');
  for (const status of document.querySelectorAll('.result-status,#saved')) {
    const decorate = () => {
      if (!status.textContent.startsWith('✓')) return;
      status.textContent = status.textContent.replace(/^✓\s*/, '');
      status.insertAdjacentHTML('afterbegin', appIcon('check'));
    };
    new MutationObserver(decorate).observe(status, {childList: true, characterData: true, subtree: true});
    decorate();
  }
}
