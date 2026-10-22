/* Decorative vector art stays outside training stimuli. Prefixes keep gradient IDs unique. */
function planetArt(prefix = 'home') {
  return '<svg class="planet-art" viewBox="0 0 300 240" fill="none" aria-hidden="true" focusable="false">' +
    '<defs><linearGradient id="' + prefix + 'Planet" x1="90" y1="45" x2="200" y2="180" gradientUnits="userSpaceOnUse"><stop stop-color="#cef0ff"/><stop offset=".5" stop-color="#69bcf7"/><stop offset="1" stop-color="#2687ce"/></linearGradient><linearGradient id="' + prefix + 'Ring" x1="20" y1="160" x2="260" y2="70" gradientUnits="userSpaceOnUse"><stop stop-color="#96d7ff"/><stop offset=".5" stop-color="#f5fcff"/><stop offset="1" stop-color="#73b8ed"/></linearGradient></defs>' +
    '<g class="planet-clouds" fill="#e4f3fb"><path d="M19 188c-4-17 17-27 28-15 5-26 39-25 44-5 19-5 30 15 18 26H19Z"/><path d="M205 184c-5-14 13-26 23-13 8-22 36-18 37 2 18-4 27 16 16 26h-76Z"/></g>' +
    '<g class="planet-orbit"><ellipse cx="148" cy="123" rx="119" ry="28" transform="rotate(-27 148 123)" stroke="#b0d9ef" stroke-width="1" stroke-dasharray="3 8"/><circle cx="148" cy="116" r="64" fill="url(#' + prefix + 'Planet)"/><path d="M101 79c19-22 44-24 67-14" stroke="#e4f8ff" stroke-width="4" stroke-linecap="round" opacity=".6"/><path d="M100 135c28 6 62-3 106-31" stroke="#4faae9" stroke-width="18" opacity=".22"/>' +
    '<ellipse cx="148" cy="123" rx="107" ry="20" transform="rotate(-27 148 123)" stroke="url(#' + prefix + 'Ring)" stroke-width="10"/><path d="M85 110a64 64 0 0 1 124-9" fill="url(#' + prefix + 'Planet)"/>' +
    '<circle cx="241" cy="60" r="12" fill="#a3d8f6"/><ellipse cx="241" cy="60" rx="20" ry="4" transform="rotate(-25 241 60)" stroke="#d4edfa" stroke-width="3"/></g>' +
    '<g class="planet-stars" stroke="#88bfde" stroke-width="2" stroke-linecap="round"><path d="M61 43v10m-5-5h10M232 133v8m-4-4h8M128 209v7m-3.5-3.5h7"/><circle cx="36" cy="118" r="2"/><circle cx="197" cy="29" r="2"/><circle cx="268" cy="107" r="1.5"/></g></svg>';
}

function decorateAppChrome() {
  decorateIconSlots();
  for (const button of document.querySelectorAll('.dialog-close')) button.innerHTML = appIcon('close');
  $('todayArt').innerHTML = planetArt('today');
  $('welcomeArt').innerHTML = planetArt('welcome');
  $('exportBackup').insertAdjacentHTML('afterbegin', appIcon('export'));
  $('importBackup').insertAdjacentHTML('afterbegin', appIcon('import'));
  $('deleteRecordsDialog').insertAdjacentHTML('afterbegin', '<div class="danger-symbol">' + appIcon('trash') + '</div>');
  for (const [id, icon] of [['preferencesDialog', 'motion'], ['appHelp', 'help']]) {
    document.getElementById(id).querySelector('.dialog-head').insertAdjacentHTML('beforebegin', '<div class="dialog-symbol">' + appIcon(icon) + '</div>');
  }
  $('dockHome').onclick = () => navigate(null);
  $('dockRecords').onclick = () => $('recordsButton').click();
  $('dockHelp').onclick = () => $('helpButton').click();
  const syncDock = () => {
    const selected = $('recordsDialog').open ? 'dockRecords' : $('appHelp').open ? 'dockHelp' : 'dockHome';
    for (const button of $('appDock').querySelectorAll('button')) {
      button.classList.toggle('active', button.id === selected);
      button.setAttribute('aria-current', button.id === selected ? 'page' : 'false');
    }
  };
  const observer = new MutationObserver(syncDock);
  for (const id of ['recordsDialog', 'appHelp']) observer.observe($(id), {attributes: true, attributeFilter: ['open']});
  syncDock();
}
