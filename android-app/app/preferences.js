const preferencesDialog = node('dialog', 'records-dialog app-help');
preferencesDialog.id = 'preferencesDialog';
preferencesDialog.setAttribute('aria-label', '界面设置');
preferencesDialog.innerHTML =
  '<div class="dialog-head"><h2>按你的节奏</h2><button class="dialog-close" aria-label="关闭界面设置">×</button></div><label class="preference-row"><span>减少动画</span><input id="reduceMotion" type="checkbox"></label><p class="preference-note">关闭装饰性漂浮和过渡。系统要求减少动画时会自动生效；动态识别题中的实际变化仍会保留。</p><p class="help-note">当前版本 __APP_VERSION__ · 完全离线</p>';
document.body.appendChild(preferencesDialog);
preferencesDialog.querySelector('button').onclick = () => preferencesDialog.close();
$('reduceMotion').checked = preferences.reduced;
$('reduceMotion').onchange = () => {
  preferences.reduced = $('reduceMotion').checked;
  try {
    localStorage.setItem(UI_KEY, JSON.stringify(preferences));
  } catch {
    showToast('界面设置未能保存。');
  }
  updateMotion();
};
const soundRow = node('label', 'preference-row');
soundRow.innerHTML = '<span>装饰音效</span><input id="effectsSound" type="checkbox">';
preferencesDialog.querySelector('.preference-note').after(soundRow);
soundRow.after(node('p', 'preference-note', '控制界面点击与训练装饰短音；双耳分听的题目音频独立播放。第七项仍可单独关闭装饰音效。'));
$('effectsSound').checked = !preferences.effectsMuted;
$('effectsSound').onchange = () => {
  preferences.effectsMuted = !$('effectsSound').checked;
  try { localStorage.setItem(UI_KEY, JSON.stringify(preferences)); }
  catch { showToast('界面设置未能保存。'); }
  updateEffects();
};
$('preferencesButton').onclick = () => {
  appFeedback.click($('preferencesButton'));
  preferencesDialog.showModal();
};
const help = node('dialog', 'records-dialog app-help');
help.id = 'appHelp';
help.setAttribute('aria-label', '使用说明');
help.innerHTML =
  '<div class="dialog-head"><h2>你的小小练习空间</h2><button class="dialog-close" aria-label="关闭使用说明">×</button></div><p>六项训练都在安装包中，断网也能使用。每轮结束后，可再练一轮、进入下一项或返回目录。</p><p>「练习足迹」保存最近 200 轮，支持项目筛选、删除、清空和备份。旧记录会保留原始成绩；从新版开始保存训练条件，最佳标记只比较相同条件的完整轮次。</p><p>切到后台会结束未完成的一轮。卸载或换机前，请先导出备份。更新时直接覆盖安装，保留本机数据。</p><p>在「界面设置」中可以减少装饰动画。动态识别题本身的变化属于题目内容，会继续正常播放。</p><p class="help-note">版本 __APP_VERSION__ · 不登录、不联网、不上传成绩。练习不提供医疗诊断或治疗。</p>';
help.querySelector('p').textContent = modules.length +
  ' 项训练均已内置，断网可用。选择训练后按规则练习。双耳分听仅在主动进入并确认声道后播放内置声音。';
help.appendChild(node('p', null,
  '新项目只比较相同模式、参数和规则版本。中途退出单独标记，不计今日完成或最佳成绩。历史娱乐数据不再展示，但保留在本机与完整备份中。'));
document.body.appendChild(help);
help.querySelector('button').onclick = () => help.close();
$('helpButton').onclick = () => help.showModal();
