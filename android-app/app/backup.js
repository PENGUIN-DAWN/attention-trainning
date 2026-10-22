const backupTools = node('div', 'backup-tools');
backupTools.innerHTML =
  '<button id="exportBackup" type="button">导出记录</button><button id="importBackup" type="button">导入备份</button><input id="backupFile" type="file" accept=".json,application/json" hidden>';
$('recordsList').after(backupTools);
window.focusExportBackup = () => {
  const json = JSON.stringify({
    app: 'focus-universe',
    version: 4,
    exportedAt: new Date().toISOString(),
    records,
    settings,
    preferences,
    arcade: FocusArcadeStore.export()
  }, null, 2);
  if (new Blob([json]).size > BACKUP_LIMIT) throw new Error('备份内容过大，请先精简部分成绩记录再导出。');
  if (window.FocusDevice?.exportBackup) {
    showToast('请选择备份文件的保存位置。');
    window.FocusDevice.exportBackup(json);
    return;
  }
  const url = URL.createObjectURL(new Blob([json], {
    type: 'application/json'
  }));
  const link = node('a');
  link.href = url;
  link.download = 'focus-backup.json';
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  showToast('已生成备份文件，请在下载中查看。');
};
$('exportBackup').textContent = '导出完整备份';
$('exportBackup').onclick = () => {
  try {
    window.focusExportBackup();
  } catch (error) {
    showToast(error.message);
  }
};
window.focusBackupResult = status => showToast(status === 'success' ? '完整备份已导出。' : status ===
  'cancelled' ? '已取消导出。' : '导出失败，请换个保存位置重试。');
$('importBackup').onclick = () => $('backupFile').click();
window.focusImportBackup = text => {
  const plan = FocusBackup.plan(text, {
    records,
    settings,
    preferences
  }, {
    limit: BACKUP_LIMIT,
    validRecord,
    cleanDetail,
    cleanSettings,
    hasTraining,
    arcadeMerge: value => FocusArcadeStore.merge(value),
    keys: {
      records: STORAGE_KEY,
      settings: SETTINGS_KEY,
      ui: UI_KEY,
      arcade: FocusArcadeStore.KEY
    },
  });
  const {
    entries
  } = plan;
  try {
    FocusStorage.transaction(entries);
  } catch (error) {
    throw new Error('备份未能保存，请释放空间后重试。');
  }
  records = plan.records;
  settings = plan.settings;
  preferences = plan.preferences;
  $('reduceMotion').checked = preferences.reduced;
  updateMotion();
  const inTraining = location.hash === '#home' || location.hash.startsWith('#train/');
  window.focusAndroidSuspend();
  for (const frame of frames.values()) frame.remove();
  frames.clear();
  frameReady.clear();
  updateToday();
  if (plan.hasArcade) FocusArcadeStore.refresh();
  if (inTraining) {
    navigate(null);
    showRecords();
  }
  showToast('备份已合并，重复记录不会再次导入；历史娱乐数据继续保留。');
  return records.length;
};
$('backupFile').onchange = async event => {
  const file = event.target.files?.[0];
  try {
    if (!file) return;
    if (file.size > BACKUP_LIMIT) throw new Error('备份文件过大');
    window.focusImportBackup(await file.text());
  } catch (error) {
    showToast(error instanceof SyntaxError ? '文件格式不正确，原有记录未改动。' : error.message);
  } finally {
    event.target.value = '';
  }
};
