function renderRecords() {
  const list = $('recordsList');
  list.replaceChildren();
  const filtered = records.filter(r => !recordFilter || r.module === recordFilter),
    best = bestRecords();
  $('recordCount').textContent = (recordFilter ? '本项目 ' + filtered.length + ' 条 · ' : '') + '全部 ' +
    records.length + ' 条';
  $('clearRecords').disabled = records.length === 0;
  for (const button of document.querySelectorAll('.record-filter')) {
    const selected = Number(button.dataset.module) === recordFilter;
    button.classList.toggle('active', selected);
    button.setAttribute('aria-pressed', String(selected));
  }
  const structured = filtered.filter(r => conditionKey(r));
  $('recordOverview').textContent = recordFilter ? '本项目完成 ' + filtered.length + ' 轮 · ' + structured
    .length + ' 轮有完整训练条件。最佳标记只比较同项目、同模式和同难度；旧记录仅展示。' : '已保存 ' + records.length +
    ' 轮练习。选择项目查看成绩；最佳标记按相同训练条件分别比较。';
  if (recordFilter && engineFor(recordFilter) === 'advanced') {
    const completed = filtered.filter(r => r.detail?.status === 'complete').length;
    $('recordOverview').textContent = '完成 ' + completed + ' 轮 · 中断 ' + (filtered.length -
      completed) + ' 轮。' + (recordFilter === 12 ? '呼吸自报不设正确率或最佳成绩。' : '仅同条件、时序有效的完整轮次参与最佳比较。');
  }
  if (!filtered.length) {
    const empty = node('div', 'empty-records');
    empty.innerHTML = '<div class="empty-art">' + planetArt('empty') + appIcon('records') + '</div>';
    empty.append(node('h3', null, recordFilter ? '这个项目还没有训练记录。' : '第一枚足迹，还在等你。'),
      node('p', null, '完成一轮训练后，记录会出现在这里。'));
    const back = node('button', null, '去训练目录');
    back.type = 'button';
    back.onclick = () => { $('recordsDialog').close(); navigate(null); };
    empty.append(back);
    list.append(empty);
  }
  for (const r of filtered) {
    const module = modulesById.get(r.module),
      d = cleanDetail(r.module, r.detail),
      row = node('article', 'record-row');
    row.dataset.token = r.token;
    row.style.setProperty('--record-accent', module.accent);
    const badge = node('span', 'record-badge', String(r.module).padStart(2, '0'));
    badge.style.background = trainingsById.get(r.module).tint;
    badge.style.color = module.accent;
    const body = node('div', 'record-body');
    body.append(node('div', 'record-title', module.title), node('div', 'record-main', mainResult(
      r)));
    body.appendChild(node('div', 'record-info', d ? d.condition + '\n' + (r.module === 4 ? '回忆用时 ' :
        '用时 ') + d.seconds.toFixed(1) + ' 秒' + (d.errors !== undefined ? ' · 错 ' + d.errors +
        ' 次' : '') + (r.module === 5 ? ' · 重播 ' + (d.replays || 0) + ' 次' : '') : r.summary +
      '\n旧版记录 · 未补算历史成绩'));
    if (engineFor(r.module) === 'advanced' && d) {
      body.lastElementChild.textContent = d.condition + '\n' + (d.status === 'interrupted' ?
        '中途退出' : '完整完成') + '\n' + FocusAdvancedRules.metrics(r.module, d);
    } else if (engineFor(r.module) !== 'legacy' && d) {
      body.lastElementChild.textContent = d.condition + '\n' + d.total + ' 题 · ' + (d.status ===
          'interrupted' ? '中途退出' : '完整完成') + ' · 作答 ' + d.seconds.toFixed(1) + ' 秒\n' + d.results
        .map((v, i) => (i + 1) + ': ' + (v.skip ? '跳过' : v.timeout ? '超时' : v.correct ? '正确' :
          '有误') + (v.hits !== undefined ? ' / 命中 ' + v.hits : '') + ' / 错 ' + v.errors + (v.pair ?
          ' / ' + v.pair : '')).join('；');
    }
    if (best.has(r.token)) {
      const tag = node('span', 'best-tag');
      tag.innerHTML = appIcon('check');
      tag.append(document.createTextNode('同条件最佳'));
      body.appendChild(tag);
    }
    const date = node('time', 'record-date', new Intl.DateTimeFormat('zh-CN', {
      timeZone: 'Asia/Shanghai',
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(new Date(r.at)));
    const remove = node('button', 'record-delete', '删除');
    remove.type = 'button';
    remove.setAttribute('aria-label', '删除' + module.title + '记录');
    remove.insertAdjacentHTML('afterbegin', appIcon('trash'));
    remove.onclick = () => requestDelete(r.token);
    row.append(badge, body, date, remove);
    list.appendChild(row);
  }
}

function showRecords() {
  renderRecords();
  if (!$('recordsDialog').open) $('recordsDialog').showModal();
}
const recordFilters = node('div', 'record-filters');
recordFilters.setAttribute('aria-label', '按训练项目筛选');
for (const [id, label] of [
    [0, '全部'], ...modules.map(m => [m.id, m.title])
  ]) {
  const button = node('button', 'record-filter', label);
  button.type = 'button';
  button.dataset.module = id;
  button.onclick = () => {
    recordFilter = id;
    renderRecords();
  };
  recordFilters.appendChild(button);
}
const management = node('div', 'record-management');
management.innerHTML =
  '<span id="recordCount"></span><button id="clearRecords" type="button">清空全部</button>';
const overview = node('div', 'record-overview');
overview.id = 'recordOverview';
$('recordsList').before(recordFilters, management, overview);
$('recordsTitle').textContent = '你的练习足迹';
document.querySelector('.dialog-copy').textContent = '每一轮专注，都有迹可循。';
document.querySelector('.record-notice').textContent = '记录仅保存在本机，最多 200 轮。卸载或换机前，请先导出备份。';
const deleteDialog = node('dialog', 'records-dialog delete-confirm');
deleteDialog.id = 'deleteRecordsDialog';
deleteDialog.setAttribute('aria-labelledby', 'deleteRecordsTitle');
deleteDialog.setAttribute('aria-describedby', 'deleteRecordsDescription');
deleteDialog.innerHTML =
  '<h2 id="deleteRecordsTitle"></h2><p id="deleteRecordsDescription"></p><div class="delete-actions"><button id="cancelDelete" type="button" autofocus>取消</button><button id="confirmDelete" type="button">确认删除</button></div>';
document.body.appendChild(deleteDialog);
let deleteTarget = null;

function requestDelete(token) {
  const r = records.find(item => item.token === token);
  if (token !== null && !r || token === null && !records.length) return;
  deleteTarget = {
    token
  };
  $('deleteRecordsTitle').textContent = token === null ? '清空全部训练记录？' : '删除这条记录？';
  $('deleteRecordsDescription').textContent = token === null ? '将删除本机全部 ' + records.length +
    ' 条记录，包含其他筛选项目。训练设置和已导出的备份会保留。删除后无法直接恢复。' : '将删除这条「' + modulesById.get(r.module).title +
    '」记录。其他记录和训练设置会保留，删除后无法直接恢复。';
  $('confirmDelete').textContent = token === null ? '确认清空' : '确认删除';
  deleteDialog.showModal();
}
$('clearRecords').onclick = () => requestDelete(null);
$('cancelDelete').onclick = () => deleteDialog.close();
deleteDialog.addEventListener('close', () => {
  if (!deleteDialog.open) deleteTarget = null;
});
$('confirmDelete').onclick = () => {
  if (!deleteTarget) return;
  const all = deleteTarget.token === null,
    next = all ? [] : records.filter(r => r.token !== deleteTarget.token);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    showToast('删除未保存，请稍后重试。');
    return;
  }
  records = next;
  deleteDialog.close();
  updateToday();
  renderRecords();
  showToast(all ? '已清空全部训练记录。' : '已删除这条训练记录。');
};
