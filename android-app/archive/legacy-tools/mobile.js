// Runs after the existing hub script. All training code stays bundled in index.html.
(() => {
  const SETTINGS_KEY = 'focus-universe-settings-v1';
  const allowed = {1:{mode:['challenge','complete']},4:{category:['mixed','animals','objects'],speed:['1000','1500','2000']},5:{observationDuration:null}};
  function cleanSettings(raw) {
    const result = {};
    if (!raw || typeof raw !== 'object') return result;
    for (const [id, fields] of Object.entries(allowed)) {
      if (!raw[id] || typeof raw[id] !== 'object') continue;
      for (const [name, values] of Object.entries(fields)) {
        const value = String(raw[id][name] ?? '');
        if (values ? values.includes(value) : /^(1(?:\.[0-9])?|2(?:\.0)?)$/.test(value)) (result[id] ||= {})[name] = value;
      }
    }
    return result;
  }
  let settings = {};
  try { settings = cleanSettings(JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}')); } catch {}
  function bindSettings(module, frame) {
    const apply = () => {
      const doc = frame.contentDocument;
      if (!doc || doc.documentElement.dataset.focusSettingsBound) return;
      doc.documentElement.dataset.focusSettingsBound = 'true';
      for (const name of Object.keys(allowed[module.id] || {})) {
        const field = doc.getElementById(name);
        if (!field) continue;
        if (settings[module.id]?.[name] !== undefined) {
          field.value = settings[module.id][name];
          field.dispatchEvent(new Event('input', {bubbles:true}));
          field.dispatchEvent(new Event('change', {bubbles:true}));
        }
        field.addEventListener('change', () => {
          (settings[module.id] ||= {})[name] = field.value;
          settings = cleanSettings(settings);
          localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
        });
      }
    };
    frame.addEventListener('load', apply);
    if (frame.contentDocument?.getElementById('start')) apply();
  }
  const originalGetFrame = getFrame;
  getFrame = function(module) {
    const exists = frames.has(module.id);
    const frame = originalGetFrame(module);
    if (!exists) bindSettings(module, frame);
    return frame;
  };
  for (const [id, frame] of frames) bindSettings(modules.find(module => module.id === id), frame);
  window.focusAndroidSuspend = () => {
    if (activeModule === null) return;
    const child = frames.get(activeModule)?.contentWindow;
    if (child) child.dispatchEvent(new MessageEvent('message', {data:{type:'focus:suspend'}, source:window}));
  };
  window.focusAndroidBack = () => {
    for (const dialog of [...document.querySelectorAll('dialog[open]')].reverse()) { dialog.close(); return true; }
    if (activeModule !== null) { window.focusAndroidSuspend(); location.hash = '#home'; return true; }
    return false;
  };
  document.addEventListener('visibilitychange', () => { if (document.hidden) window.focusAndroidSuspend(); });

  document.querySelector('.record-notice').textContent = '记录仅保存在本机，最多保留 200 轮。卸载前请导出备份。';
  const tools = document.createElement('div');
  tools.className = 'backup-tools';
  tools.innerHTML = '<button id="exportBackup" type="button">导出记录</button><button id="importBackup" type="button">导入备份</button><input id="backupFile" type="file" accept=".json,application/json" hidden>';
  $('recordsList').after(tools);
  const management = document.createElement('div');
  management.className = 'record-management';
  management.innerHTML = '<span id="recordCount"></span><button id="clearRecords" type="button">清空全部</button>';
  $('recordsList').before(management);
  const deleteDialog = document.createElement('dialog');
  deleteDialog.id = 'deleteRecordsDialog';
  deleteDialog.className = 'records-dialog delete-confirm';
  deleteDialog.setAttribute('aria-labelledby', 'deleteRecordsTitle');
  deleteDialog.setAttribute('aria-describedby', 'deleteRecordsDescription');
  deleteDialog.innerHTML = '<h2 id="deleteRecordsTitle"></h2><p id="deleteRecordsDescription"></p><div class="delete-actions"><button id="cancelDelete" type="button" autofocus>取消</button><button id="confirmDelete" type="button">确认删除</button></div>';
  document.body.appendChild(deleteDialog);
  let deleteTarget = null;
  function requestDelete(token) {
    const record = token === null ? null : records.find(item => item.token === token);
    if (token !== null && !record) return;
    if (token === null && !records.length) return;
    deleteTarget = {token};
    $('deleteRecordsTitle').textContent = token === null ? '清空全部训练记录？' : '删除这条记录？';
    $('deleteRecordsDescription').textContent = token === null
      ? '将删除本机保存的全部 ' + records.length + ' 条训练记录，训练设置会保留。删除后无法直接恢复，已导出的备份文件不会受影响。'
      : '将删除这条「' + modules[record.module-1].title + '」记录。删除后无法直接恢复，其他记录会保留。';
    $('confirmDelete').textContent = token === null ? '确认清空' : '确认删除';
    deleteDialog.showModal();
  }
  $('cancelDelete').onclick = () => deleteDialog.close();
  deleteDialog.addEventListener('close', () => { deleteTarget = null; });
  $('confirmDelete').onclick = () => {
    if (!deleteTarget) return;
    const all = deleteTarget.token === null;
    const next = all ? [] : records.filter(record => record.token !== deleteTarget.token);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); }
    catch { showToast('删除未保存，请稍后重试。'); return; }
    records = next;
    deleteDialog.close();
    updateToday();
    $('recordsDialog').close();
    showRecords();
    showToast(all ? '已清空全部训练记录。' : '已删除这条训练记录。');
  };
  $('clearRecords').onclick = () => requestDelete(null);
  function decorateRecords() {
    $('recordCount').textContent = '共 ' + records.length + ' 条' + (records.length > 20 ? ' · 展示最近 20 条' : '');
    $('clearRecords').disabled = records.length === 0;
    for (const [index, row] of [...$('recordsList').querySelectorAll('.record-row')].entries()) {
      if (row.querySelector('.record-delete')) continue;
      const record = records[index];
      if (!record) continue;
      const button = document.createElement('button');
      button.type = 'button'; button.className = 'record-delete'; button.textContent = '删除';
      button.setAttribute('aria-label', '删除第' + (index+1) + '条' + modules[record.module-1].title + '记录');
      button.onclick = () => requestDelete(record.token);
      row.appendChild(button);
    }
  }
  new MutationObserver(decorateRecords).observe($('recordsList'), {childList:true});
  decorateRecords();
  $('exportBackup').onclick = () => {
    const json = JSON.stringify({app:'focus-universe',version:1,exportedAt:new Date().toISOString(),records,settings}, null, 2);
    if (window.FocusDevice) { window.FocusDevice.exportBackup(json); return; }
    const url = URL.createObjectURL(new Blob([json], {type:'application/json'}));
    const link = document.createElement('a'); link.href = url; link.download = 'focus-backup.json'; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  $('importBackup').onclick = () => $('backupFile').click();
  window.focusImportBackup = text => {
    if (typeof text !== 'string' || text.length > 300000) throw new Error('备份文件过大');
    const backup = JSON.parse(text);
    if (backup.app !== 'focus-universe' || backup.version !== 1 || !Array.isArray(backup.records) || backup.records.length > 200) throw new Error('请选择本软件导出的备份文件');
    const valid = backup.records.every(r => r && Number.isInteger(r.module) && r.module >= 1 && r.module <= 6 && typeof r.token === 'string' && r.token.length <= 200 && Number.isFinite(r.at) && r.at > 0 && r.at < 8640000000000000 && typeof r.summary === 'string' && r.summary.length <= 400);
    if (!valid) throw new Error('备份内容无效，原有记录未改动');
    const merged = new Map(records.map(r => [r.token,r]));
    for (const r of backup.records) if (!merged.has(r.token)) merged.set(r.token,{module:r.module,token:r.token,at:r.at,summary:r.summary});
    const next = [...merged.values()].sort((a,b) => b.at-a.at).slice(0,200);
    const nextSettings = cleanSettings({...settings,...backup.settings});
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(nextSettings));
    records = next; settings = nextSettings;
    // Recreate idle frames so imported settings are applied on next visit.
    window.focusAndroidSuspend(); location.hash = '#home';
    for (const frame of frames.values()) frame.remove(); frames.clear();
    updateToday();
    if ($('recordsDialog').open) $('recordsDialog').close();
    showRecords(); showToast('备份已合并，相同记录不会重复导入。');
    return records.length;
  };
  $('backupFile').onchange = async event => {
    const file = event.target.files?.[0];
    try {
      if (!file) return;
      if (file.size > 300000) throw new Error('备份文件过大');
      window.focusImportBackup(await file.text());
    } catch (error) { showToast(error instanceof SyntaxError ? '文件格式不正确，原有记录未改动。' : error.message); }
    finally { event.target.value = ''; }
  };

  const help = document.createElement('dialog');
  help.className = 'records-dialog app-help'; help.id = 'appHelp';
  help.innerHTML = '<div class="dialog-head"><h2>安卓离线版</h2><button class="dialog-close" id="closeHelp" aria-label="关闭使用说明">×</button></div><p>六项训练都在安装包中，断网也能练习。</p><p>完成一轮后，成绩会自动存入「练习足迹」。设置会保存在本机。切到后台会结束当前未完成的一轮，回来后可以重新开始。</p><p>「练习足迹」支持删除单条记录或清空全部，确认后生效。换手机或卸载前，可以先导出备份。这个版本不登录账号、不上传成绩，也不请求网络权限。</p><p>软件更新请使用同一签名的新版安装包覆盖安装，保留本机记录。当前版本：__APP_VERSION__。</p><p class="help-note">练习用于日常自用，不提供医疗诊断或治疗。</p>';
  document.body.appendChild(help);
  const helpButton = document.createElement('button'); helpButton.className = 'app-help-button'; helpButton.textContent = '离线版 · 使用说明';
  document.querySelector('.home-footer').lastElementChild.replaceWith(helpButton);
  helpButton.onclick = () => help.showModal(); $('closeHelp').onclick = () => help.close();
})();
