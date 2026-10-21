/* Offline shell, game presentation and Android lifecycle adapter. */
(function(root){
  'use strict';
  const R=root.FocusArcadeRules,S=root.FocusArcadeStore,$=id=>document.getElementById(id),view=$('arcadeView');
  const last=items=>items[items.length-1];
  let screen='',planetId=null,levelId=null,session=null,generation=0,transition=null,confirmAction=null,guideStart=null,confirmNotice=null;
  const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
  function notify(message){
    if($('arcadeConfirm').open){confirmNotice=message;return;}
    if(!document.querySelector('dialog[open]')&&screen==='result'&&$('arcadeSaveStatus')){$('arcadeSaveStatus').textContent=message+(session?.saved?' 本轮成绩已保存在本机。':'');return;}
    if(!document.querySelector('dialog[open]')&&screen==='decor'&&$('arcadeDecorNotice')){$('arcadeDecorNotice').textContent=message;return;}
    showToast(message);
  }
  const planet=id=>R.PLANETS.find(p=>p.id===id);
  const starsHTML=n=>'<span class="star-score" aria-label="'+n+' / 3 星">'+'★'.repeat(n)+'<span class="empty-star">'+'☆'.repeat(3-n)+'</span></span>';
  const link=(text,href,cls='shell-button')=>{const a=el('a',cls,text);a.href=href;return a;};
  const button=(text,action,cls='shell-button')=>{const b=el('button',cls,text);b.type='button';b.onclick=action;return b;};
  function modal(dialog){document.body.appendChild(dialog);dialog.showModal();}
  function safely(action){try{return action();}catch(error){notify(error.message||'操作未能完成，请重试。');return null;}}
  function nav(hash){if(location.hash!==hash)location.hash=hash;else route();}
  function stylePlanet(p){view.style.setProperty('--planet-accent',p?.accent||'#79588f');view.style.setProperty('--planet-tint',p?.tint||'#eee4f5');}
  function scene(id){
    const n=el('div','planet-scene');n.dataset.planet=id;n.setAttribute('aria-hidden','true');
    const equipped=S.state.equipped[id]||[];for(const slot of ['texture','orbital','backdrop'])n.classList.toggle('has-'+slot,equipped.includes(id+'-'+slot));
    n.innerHTML='<div class="planet-backdrop"></div><span class="scene-spark">✧</span><div class="planet-ball"></div><div class="planet-orbital"></div><span class="scene-spark">✦</span>';return n;
  }
  function top(title,subtitle,href,extra){
    const n=el('div','shell-topline');const a=link('←',href,'shell-back');a.setAttribute('aria-label',href==='#lobby'?'返回大厅':'返回上一级');
    const copy=el('div','shell-topcopy');copy.append(el('h1','',title),el('p','',subtitle));n.append(a,copy);if(extra)n.append(extra);view.append(n);
  }
  function confirm(title,copy,action,label='确认'){
    if($('arcadeConfirm').open)return;
    confirmAction=action;confirmNotice=null;$('arcadeConfirmTitle').textContent=title;$('arcadeConfirmCopy').textContent=copy;$('arcadeAccept').textContent=label;modal($('arcadeConfirm'));
  }
  $('arcadeCancel').onclick=()=>$('arcadeConfirm').close();
  $('arcadeConfirm').addEventListener('close',()=>{if(!$('arcadeConfirm').open)confirmAction=null;});
  $('arcadeAccept').onclick=()=>{const action=confirmAction;if(!action)return;try{action();confirmAction=null;$('arcadeConfirm').close();const message=confirmNotice;confirmNotice=null;if(message)notify(message);}catch(error){showToast(error.message);}};
  function tools(){const row=el('div','shell-action-row');row.append(button('探索记录',showRecords),button('完整备份',openBackup));view.append(row);}
  function home(){
    top('星球乐园','小小挑战，让星球慢慢亮起来。','#lobby');
    const intro=el('div','arcade-intro');intro.innerHTML='<div><div class="shell-eyebrow">YOUR LITTLE PLAY UNIVERSE</div><h2>今天，<br>去哪颗星球？</h2><p>每局五题，自由探索。<br>收集星星，留下你的独特风景。</p></div><div class="arcade-total"><strong>'+R.PLANETS.reduce((n,p)=>n+R.totalStars(S.state,p.id),0)+'</strong><small>／18 颗星</small></div>';view.append(intro);
    if(S.error)view.append(el('div','shell-notice',S.error));
    const cards=el('div','planet-cards');
    for(const p of R.PLANETS){
      const card=link('','#arcade/planet/'+p.id,'planet-card');card.style.setProperty('--planet-tint',p.tint);card.style.setProperty('--planet-accent',p.accent);card.dataset.planet=p.id;
      card.append(scene(p.id),el('h2','',p.name),el('p','',p.subtitle));
      card.append(el('div','planet-mini-stars','★ '+R.totalStars(S.state,p.id)+' / 9'),el('strong','','前往探索 ↗'));cards.append(card);
    }view.append(cards);
    const recommended=R.LEVELS.find(l=>!(S.state.progress[l.id]?.stars>0))||R.level(S.state.lastLevel)||R.LEVELS[0];
    const rec=el('div','recommend-card'),copy=el('div');copy.append(el('p','','继续探索'),el('strong','',planet(recommended.planet).name+' · 第 '+recommended.stage+' 关'));
    rec.append(copy,link('去挑战','#arcade/level/'+recommended.id,''));view.append(rec);tools();
    view.append(el('p','shell-caption','所有关卡均可选择。这里的游戏成绩与六项标准训练分别保存。'));
  }
  function planetHeader(p){
    const head=el('div','planet-header'),copy=el('div');copy.append(el('h2','',p.name),el('p','',p.subtitle),el('div','shell-chip','已收集 '+R.totalStars(S.state,p.id)+' / 9 颗星'));
    head.append(copy,scene(p.id));view.append(head);
  }
  function levels(id){
    const p=planet(id);top(p.name,'每局五题 · 三星由准确率决定','#arcade',link('装饰','#arcade/decor/'+id,'shell-button'));planetHeader(p);
    const list=el('div','level-list');
    for(const l of R.LEVELS.filter(l=>l.planet===id)){
      const a=link('','#arcade/level/'+l.id,'level-card');a.dataset.level=l.id;const copy=el('div');copy.append(el('h3','','第 '+l.stage+' 关 · '+l.title),el('p','',id==='signal'?l.conflicts+' / 5 题含字色冲突':['较小字号差异','适中字号差异','明显字号差异'][l.stage-1]));
      const stars=el('div');stars.innerHTML=starsHTML(S.state.progress[l.id]?.stars||0);a.append(el('div','level-number','0'+l.stage),copy,stars);list.append(a);
    }view.append(list);view.append(el('p','shell-caption','重玩会生成新题。星级只保留最好结果，不会因失误扣星。'));tools();
  }
  function decorations(id){
    const p=planet(id);top('装点'+p.name,'解锁的风景，会一直陪着你。','#arcade/planet/'+id);planetHeader(p);
    const notice=el('p','shell-caption');notice.id='arcadeDecorNotice';notice.setAttribute('role','status');notice.style.minHeight='23px';notice.style.margin='0 0 12px';view.append(notice);
    const list=el('div','decor-list');
    for(const d of R.DECOR.filter(d=>d.planet===id)){
      const unlocked=S.state.unlocked.includes(d.id),equipped=S.state.equipped[id].includes(d.id),row=el('article','decor-card');row.dataset.decor=d.id;
      const copy=el('div','decor-copy');copy.append(el('h3','',d.name),el('p','',unlocked?(equipped?'已装备 · 点击可以取消':'已解锁 · 永久保留'):'累计 '+d.threshold+' 星解锁 · 当前 '+R.totalStars(S.state,id)+' 星'));
      const b=button(unlocked?(equipped?'取消装备':'装备'):'未解锁',()=>{if(safely(()=>S.equip(d.id))){render();notify(equipped?'已取消装饰。':'装饰已装备并保存。');}},'');b.disabled=!unlocked;b.setAttribute('aria-pressed',String(equipped));
      row.append(el('div','decor-swatch',{texture:'◒',orbital:'◎',backdrop:'✧'}[d.slot]),copy,b);list.append(row);
    }view.append(list);const row=el('div','shell-action-row');row.append(button('恢复默认外观',()=>{if(safely(()=>S.defaultLook(id))){render();notify('已恢复默认外观，解锁的装饰仍然保留。');}}));view.append(row);
  }
  function intro(id){
    const l=R.level(id),p=planet(l.planet);top('第 '+l.stage+' 关 · '+l.title,p.name,'#arcade/planet/'+p.id);planetHeader(p);
    const panel=el('div','shell-panel');panel.append(el('div','shell-eyebrow','FIVE QUESTIONS. YOUR OWN PACE.'));
    panel.append(el('p','level-description',p.id==='signal'?'忽略字义，按文字实际显示的颜色接通信号。':'忽略字号和颜色，把四个数字按数值从小到大依次点亮。'));
    const ul=el('ul','level-bullets');for(const t of ['每局五题，不限时；答对三题获得第一颗星。',p.id==='signal'?'每题只作答一次，答错后显示正确颜色。':'四次选择全部正确才算答对；首次点错会显示正确顺序。','用时只记录实际作答，讲解和等待不计时。'])ul.append(el('li','',t));panel.append(ul);
    const best=el('div','level-intro-stars');best.innerHTML='<span>本关最高</span>'+starsHTML(S.state.progress[id]?.stars||0);panel.append(best);
    const start=button('开始五题挑战',()=>requestStart(id),'game-next');start.id='arcadeStart';panel.append(start);view.append(panel);
  }
  function requestStart(id){
    if($('arcadeGuide').open||session?.phase==='preparing'||isUnfinished())return;
    const l=R.level(id);if(S.state.seen.includes(l.planet)){start(id);return;}
    $('arcadeGuideTitle').textContent=planet(l.planet).name+' · 小示例';
    $('arcadeExample').innerHTML=l.planet==='signal'?'<span class="example-signal">白</span><br><small>它显示为蓝色 → 选择「蓝」</small>':'8　1　7　4<br><small>按数值点击：1 → 4 → 7 → 8</small>';
    $('arcadeGuideCopy').textContent=l.planet==='signal'?'看颜色，不读字义。红、蓝、绿、黄、白都有可能出现。':'看数值，不看大小。每题四个不同数字，点错后可查看正确顺序。';
    guideStart=()=>{safely(()=>S.markSeen(l.planet));start(id);};modal($('arcadeGuide'));
  }
  const guideContinue=()=>{const action=guideStart;guideStart=null;$('arcadeGuide').close();action?.();};
  $('arcadeGuideSkip').onclick=guideContinue;$('arcadeGuideStart').onclick=guideContinue;$('arcadeGuideClose').onclick=()=>{guideStart=null;$('arcadeGuide').close();};
  function start(id){
    generation++;session={id:(root.crypto?.randomUUID?.()||Date.now().toString(36)+'-'+Math.random().toString(36).slice(2)),level:id,items:R.generate(id),index:0,trials:[],selected:[],phase:'preparing',began:0,record:null,saved:false,result:null};
    nav('#arcade/play/'+id);
  }
  function game(id){
    const l=R.level(id),p=planet(l.planet);
    if(!session||session.level!==id){intro(id);return;}
    const head=el('div','game-top'),back=button('←',()=>requestExit('#arcade/planet/'+p.id),'shell-back');back.setAttribute('aria-label','退出本局，返回关卡');
    const copy=el('div','game-title');copy.append(el('h1','',p.name+' · 第 '+l.stage+' 关'),el('p','',p.id==='signal'?'看实际颜色，忽略字义。':'看数值大小，忽略字号和颜色。'));
    head.append(back,copy,el('span','shell-chip','第 '+(session.index+1)+' / 5 题'));view.append(head);
    const progress=el('div','game-progress');progress.setAttribute('aria-hidden','true');for(let i=0;i<5;i++)progress.append(el('i',i<session.index?'done':i===session.index?'current':''));view.append(progress);
    if(session.phase==='aborted'){
      const panel=el('div','shell-panel');panel.append(el('h2','','本轮已结束'),el('p','level-description','离开或切到后台时，未完成的本轮会结束，不计成绩、不发星星。'));
      const row=el('div','shell-action-row');row.append(button('重新开始',()=>{session=null;start(id);},'shell-button shell-primary'),link('选择关卡','#arcade/planet/'+p.id));panel.append(row);view.append(panel);return;
    }
    const card=el('div','game-card');card.append(el('p','game-hint',p.id==='signal'?'接通信号：这个字实际是什么颜色？':'校准顺序：从最小的数字开始点击。'));
    const item=session.items[session.index];
    if(p.id==='signal'){
      const field=el('div','signal-field'),word=el('span','signal-word',R.COLORS[item.word].name);word.style.color=R.COLORS[item.ink].ink;field.append(word);card.append(field);
      const answers=el('div','signal-answers');answers.id='arcadeAnswers';
      for(let i=0;i<5;i++){
        const b=button(R.COLORS[i].name,()=>answer(i),'');b.dataset.answer=i;b.disabled=session.phase!=='answer';
        if(session.phase==='feedback'){if(i===item.ink)b.classList.add('answer-right');else if(i===session.selected[0])b.classList.add('answer-wrong');}answers.append(b);
      }card.append(answers);
    }else{
      const numbers=el('div','gravity-field');numbers.id='arcadeNumbers';
      for(let i=0;i<4;i++){
        const b=button(String(item.values[i]),()=>answer(i),'');b.style.fontSize=item.sizes[i]+'px';b.style.color=item.colors[i];b.dataset.position=i;
        const picked=(session.phase==='feedback'&&!last(session.trials)?.correct?session.selected.slice(0,-1):session.selected).includes(i);b.classList.toggle('picked',picked);
        if(session.phase==='feedback'&&!last(session.trials)?.correct&&last(session.selected)===i)b.classList.add('wrong');
        b.disabled=session.phase!=='answer'||picked;numbers.append(b);
      }card.append(numbers);
    }
    const feedback=el('div','game-feedback');feedback.id='arcadeFeedback';feedback.setAttribute('role','status');
    if(session.phase==='feedback'){
      const correct=last(session.trials).correct;feedback.classList.toggle('incorrect',!correct);
      feedback.textContent=correct?'✓ 正确，这一题接住了。':p.id==='signal'?'这题的实际颜色是「'+R.COLORS[item.ink].name+'」。':'正确顺序：'+item.sorted.join(' → ');
    }else feedback.textContent=session.phase==='preparing'?'正在准备…':p.id==='gravity'?'已选 '+session.selected.length+' / 4 个数字':'按自己的节奏作答。';
    const next=button(session.index===4?'查看本轮成绩':'下一题',nextQuestion,'game-next');next.id='arcadeNext';next.disabled=session.phase!=='feedback';card.append(feedback,next);view.append(card);
    view.append(el('p','game-caption','五题完成后保存成绩 · 用时不影响星级'));
  }
  function ready(){
    const ticket=++generation,s=session;
    requestAnimationFrame(()=>requestAnimationFrame(()=>{
      if(ticket!==generation||session!==s||screen!=='play'||s.phase!=='preparing')return;
      if(document.hidden){abort();return;}
      s.phase='answer';s.began=performance.now();
      for(const b of view.querySelectorAll('#arcadeAnswers button,#arcadeNumbers button'))b.disabled=false;
      $('arcadeFeedback').textContent=R.level(s.level).planet==='gravity'?'已选 0 / 4 个数字':'按自己的节奏作答。';
    }));
  }
  function answer(position){
    const s=session;if(!s||s.phase!=='answer'||screen!=='play'||document.hidden)return;
    const item=s.items[s.index],l=R.level(s.level);let correct;
    if(l.planet==='signal'){if(position<0||position>4)return;s.selected=[position];correct=position===item.ink;}
    else{
      if(position<0||position>3||s.selected.includes(position))return;
      s.selected.push(position);correct=item.values[position]===item.sorted[s.selected.length-1];
      if(correct&&s.selected.length<4){
        const b=view.querySelector('#arcadeNumbers button[data-position="'+position+'"]');b.disabled=true;b.classList.add('picked');$('arcadeFeedback').textContent='已选 '+s.selected.length+' / 4 个数字';return;
      }
    }
    s.trials.push({correct,responseMs:Math.max(0,performance.now()-s.began)});s.phase='feedback';generation++;
    if(s.trials.length===5){s.record={id:s.id,level:s.level,ruleVersion:R.RULE_VERSION,at:Date.now(),correct:s.trials.filter(t=>t.correct).length,total:5,responseMs:s.trials.reduce((sum,t)=>sum+t.responseMs,0)};saveRound();}
    render();
  }
  function saveRound(){
    if(!session?.record||session.saved)return;
    try{session.result=S.commit(session.record);session.saved=true;session.saveError=null;}catch(error){session.saved=false;session.saveError=error.message;}
  }
  function nextQuestion(){
    const s=session;if(!s||s.phase!=='feedback')return;
    if(s.trials.length===5){nav('#arcade/result/'+s.level);return;}
    s.phase='preparing';s.index++;s.selected=[];render();ready();
  }
  function result(id){
    if(!session?.record||session.level!==id){intro(id);return;}
    const r=session.record,l=R.level(id),p=planet(l.planet);top('本轮探索完成',p.name+' · 第 '+l.stage+' 关','#arcade/planet/'+p.id);
    const card=el('div','shell-panel round-result');card.append(el('span','result-label','A LITTLE STEP FOR YOUR UNIVERSE'),el('h2','','答对 '+r.correct+' / 5 题'));
    const star=el('div');star.innerHTML=starsHTML(R.stars(r.correct));card.append(star);
    card.append(el('p','',r.correct===5?'本轮全对，三颗星都亮了。':r.correct===4?'再对一题，就能点亮第三颗星。':r.correct===3?'挑战完成，第一颗星已点亮。':'还差一点，可以先试试第一关。'));
    const best=S.state.progress[id],info=el('p','');info.textContent='本关最高：'+(best?.stars||0)+' 星'+(session.saved&&session.result?.improved?' · 刷新同关最佳':'')+'\n实际作答 '+(r.responseMs/1000).toFixed(1)+' 秒';info.style.whiteSpace='pre-line';card.append(info);
    const status=el('p','save-state'+(session.saved?'':' save-failed'),session.saved?'本轮娱乐成绩与探索进度已保存在本机。':'保存失败：'+(session.saveError||'请重试。'));status.id='arcadeSaveStatus';card.append(status);
    if(!session.saved)card.append(button('重试保存',()=>{saveRound();render();},'shell-button shell-primary'));
    const preview=scene(p.id);card.append(preview);
    for(const id of session.saved?session.result?.unlocks||[]:[]){
      const d=R.DECOR.find(x=>x.id===id),unlock=el('div','unlock-card');unlock.dataset.unlock=id;unlock.append(el('h3','','新风景 · '+d.name),el('p','','累计 '+d.threshold+' 星，已永久解锁。'));
      const worn=S.state.equipped[p.id].includes(id);const b=button(worn?'已装备':'立即装上',()=>{if(safely(()=>S.equip(id))){render();notify('新装饰已装备。');}},'');b.disabled=worn;unlock.append(b);card.append(unlock);
    }view.append(card);
    const row=el('div','shell-action-row');row.append(button('再挑战一次',()=>{if(!session.saved){confirm('离开未保存的成绩？','本轮保存失败。离开后不能恢复本轮成绩，也不会获得本轮星星。',()=>{session=null;start(id);},'离开并重玩');return;}session=null;start(id);},'shell-button shell-primary'),link('选择关卡','#arcade/planet/'+p.id),link('返回乐园','#arcade'));view.append(row);
    for(const a of view.querySelectorAll('a[href]'))a.onclick=event=>{if(session?.record&&!session.saved){event.preventDefault();requestExit(a.getAttribute('href'));}};
  }
  function isUnfinished(){return session&&!session.record&&session.phase!=='aborted'&&screen==='play';}
  function requestExit(target){
    if(isUnfinished())confirm('结束本轮探索？','当前五题尚未完成。退出后不计成绩、不发星星，之前的进度会保留。',()=>{abort();nav(target);},'结束并返回');
    else if(session?.record&&!session.saved)confirm('离开未保存的成绩？','本轮保存失败。离开后不能恢复本轮成绩，之前的星级和装饰不受影响。',()=>{session=null;nav(target);},'离开本轮');
    else nav(target);
  }
  function abort(){generation++;transition?.cancel();if(session&&!session.record&&session.phase!=='aborted'){session.phase='aborted';if(screen==='play')render();}}
  function showRecords(){
    renderRecords();if(!$('arcadeRecords').open)modal($('arcadeRecords'));
  }
  function renderRecords(){
    const list=$('arcadeRecordList');list.replaceChildren();$('arcadeClearRecords').disabled=!S.state.records.length;
    if(!S.state.records.length){list.append(el('div','shell-empty','这里还没有探索记录。完成五题，就能留下第一段旅程。'));return;}
    for(const r of S.state.records){
      const l=R.level(r.level),p=planet(l.planet),row=el('article','arcade-record');row.dataset.record=r.id;
      row.append(el('h3','',p.name+' · 第 '+l.stage+' 关 · 规则 v'+r.ruleVersion));
      const line=el('div','record-line');line.append(el('strong','',r.correct+' / 5 题'),button('删除',()=>confirm('删除这条娱乐成绩？','只删除本轮成绩。关卡最高星级、已解锁装饰和训练记录都不会改变。',()=>{S.deleteRecord(r.id);renderRecords();notify('已删除娱乐成绩，探索进度保留。');},'确认删除'),''));
      row.append(line,el('p','',R.stars(r.correct)+' 星 · 作答 '+(r.responseMs/1000).toFixed(1)+' 秒 · '+new Date(r.at).toLocaleString('zh-CN')));list.append(row);
    }
  }
  $('arcadeRecordsClose').onclick=()=>$('arcadeRecords').close();
  $('arcadeClearRecords').onclick=()=>confirm('清空全部娱乐成绩？','将清空本机最近的娱乐成绩。关卡星级、装饰、引导状态和全部训练数据保留。已导出的备份不会改变。',()=>{S.deleteRecord(null);renderRecords();notify('娱乐成绩已清空，探索进度保留。');},'确认清空');
  function openBackup(){if(!$('completeBackup').open)modal($('completeBackup'));}
  $('lobbyBackup').onclick=openBackup;$('arcadeBackup').onclick=openBackup;$('completeBackupClose').onclick=()=>$('completeBackup').close();
  $('completeBackupExport').onclick=()=>safely(()=>root.focusExportBackup());$('completeBackupImport').onclick=()=>$('backupFile').click();
  $('lobbyHelp').onclick=()=>$('appHelp').showModal();
  function render(){
    if(screen==='lobby')return;
    view.replaceChildren();view.dataset.screen=screen;
    const p=planet(planetId)||planet(R.level(levelId)?.planet);stylePlanet(p);
    if(screen==='home')home();else if(screen==='planet')levels(planetId);else if(screen==='decor')decorations(planetId);else if(screen==='level')intro(levelId);else if(screen==='play')game(levelId);else if(screen==='result')result(levelId);
  }
  function parse(){
    const h=location.hash;
    if(h==='#home'||/^#train\/[1-6]$/.test(h))return {training:true};
    if(h==='#arcade')return {screen:'home'};
    let m=h.match(/^#arcade\/(planet|decor)\/(signal|gravity)$/);if(m)return {screen:m[1],planet:m[2]};
    m=h.match(/^#arcade\/(level|play|result)\/((?:signal|gravity)-[1-3])$/);if(m)return {screen:m[1],level:m[2]};
    if(h!=='#lobby')history.replaceState(null,'','#lobby');return {screen:'lobby'};
  }
  function hide(){
    if(isUnfinished())abort();generation++;transition?.cancel();screen='';$('lobbyView').hidden=true;view.hidden=true;document.body.dataset.area='training';document.body.dataset.game='false';
  }
  function handleRoute(){
    const target=parse();if(target.training){hide();return false;}
    const oldScreen=screen,oldLevel=levelId;
    if(isUnfinished()&&(target.screen!=='play'||target.level!==levelId))abort();
    if(activeModule!==null)sendTo(activeModule,{type:'focus:suspend'});
    routeVersion++;routeAnimation?.cancel();activeModule=null;settledModule=null;routeInitialized=false;
    for(const frame of frames.values())frame.hidden=true;
    $('homeView').hidden=true;$('playView').hidden=true;document.body.dataset.training='false';
    screen=target.screen;planetId=target.planet||null;levelId=target.level||null;
    document.body.dataset.area=screen==='lobby'?'lobby':'arcade';document.body.dataset.game=String(screen==='play');
    $('lobbyView').hidden=screen!=='lobby';view.hidden=screen==='lobby';document.title=screen==='lobby'?'专注力小宇宙 · 大厅':'星球乐园 · 专注力小宇宙';render();window.scrollTo(0,0);
    generation++;transition?.cancel();const ticket=generation,container=screen==='lobby'?$('lobbyView'):view;
    if(!reducedMotion())transition=container.animate([{opacity:0,transform:'translateY(7px)'},{opacity:1,transform:'translateY(0)'}],{duration:220,easing:'ease-out'});
    const done=transition&&!reducedMotion()?transition.finished.catch(()=>{}):Promise.resolve();
    done.then(()=>{if(ticket===generation&&screen==='play'&&session?.phase==='preparing')ready();});
    if(oldScreen==='play'&&oldLevel!==levelId&&session?.record)session=null;
    return true;
  }
  const originalBack=root.focusAndroidBack,originalSuspend=root.focusAndroidSuspend,originalResume=root.focusAndroidResume;
  root.focusAndroidBack=()=>{
    if(originalBack())return true;
    if(location.hash==='#home'){nav('#lobby');return true;}
    if(screen==='lobby')return false;
    if(screen==='play'||screen==='result'){requestExit('#arcade/planet/'+R.level(levelId).planet);return true;}
    if(screen==='level'){nav('#arcade/planet/'+R.level(levelId).planet);return true;}
    if(screen==='decor'){nav('#arcade/planet/'+planetId);return true;}
    if(screen==='planet'){nav('#arcade');return true;}
    if(screen==='home'){nav('#lobby');return true;}return false;
  };
  root.focusAndroidSuspend=()=>{originalSuspend();abort();if($('arcadeConfirm').open)$('arcadeConfirm').close();if($('arcadeGuide').open){guideStart=null;$('arcadeGuide').close();}};
  root.focusAndroidResume=()=>{originalResume();if(screen==='play'&&session?.phase==='aborted')render();};
  root.FocusShell={handleRoute,hide,render,showRecords,openBackup,get session(){return session;},get screen(){return screen;},
    imported:()=>{session=null;generation++;S.refresh();if(screen==='play'||screen==='result')nav('#arcade');else render();if($('arcadeRecords').open)renderRecords();}
  };
  const resetPanel=el('div','');resetPanel.innerHTML='<hr style="border:0;border-top:1px solid #e5dbea;margin:20px 0"><p class="shell-caption">星球乐园的进度与训练记录分别保存。</p>';
  resetPanel.append(button('重置娱乐探索进度',()=>confirm('重置整个星球乐园？','将清空娱乐成绩、六关星级、装饰及装备、首次引导状态。六项训练记录、训练设置和减少动画偏好保留。此操作不能直接撤销，建议先导出完整备份。',()=>{S.reset();session=null;generation++;if(screen!=='lobby'&&screen!=='')nav('#arcade');notify('娱乐探索进度已重置，训练数据保留。');},'确认重置'),'shell-button shell-danger'));
  $('preferencesDialog').append(resetPanel);
  const brand=document.querySelector('.brand');brand.href='#lobby';brand.setAttribute('aria-label','专注力小宇宙，返回大厅');
  route();
  if(root.FocusStorage.recoveryError)notify(root.FocusStorage.recoveryError);
})(globalThis);
