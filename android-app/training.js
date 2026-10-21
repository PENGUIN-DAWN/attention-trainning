function installTrainingUI(config) {
  const board = document.querySelector('.card,.board-card');
  const send = (type, extra={}) => parent.postMessage({type,module:config.id,...extra}, '*');
  const root = document.documentElement;
  document.body.dataset.module = String(config.id);
  root.style.setProperty('--accent',config.accent);
  root.style.setProperty('--tint',config.tint);
  root.dataset.reduced = String(config.reduced);
  const startButton = document.getElementById('start');
  const result = document.getElementById('result');
  const settingNames = {1:['mode'],4:['category','speed'],5:['observationDuration']}[config.id] || [];
  let routeReady=false, active=true, pendingStart=false, generation=0, heightFrame=0;
  const isRunning = () => config.id===4 ? !['idle','result'].includes(state.phase) : state.running;
  const reportHeight = () => {
    cancelAnimationFrame(heightFrame);
    heightFrame=requestAnimationFrame(() => send('focus:height',{height:Math.ceil(document.querySelector('main').getBoundingClientRect().height)+2}));
  };
  const settings = document.createElement('details');
  settings.className='training-settings';
  settings.innerHTML='<summary>训练设置</summary><div class="settings-body"></div>';
  if (settingNames.length) {
    const destination=settings.lastElementChild;
    if (config.id===1) {
      destination.appendChild(document.querySelector('label[for=mode]'));
      destination.appendChild(document.getElementById('mode'));
    } else destination.appendChild(document.querySelector('.side .settings'));
    board.prepend(settings);
  }
  const summarySettings = () => {
    if (!settingNames.length) return;
    const labels = config.id===1 ? ({challenge:'30 秒挑战',complete:'完成 25 个',reverse:'倒序 35 秒 · 点击'}[document.getElementById('mode').value]) : config.id===4 ? document.getElementById('category').selectedOptions[0].textContent+' · '+Number(document.getElementById('speed').value)/1000+' 秒' : Number(document.getElementById('observationDuration').value).toFixed(1)+' 秒观察';
    settings.querySelector('summary').textContent=labels+' · 设置';
  };
  for (const name of settingNames) {
    const field=document.getElementById(name);
    if (config.settings?.[name]!==undefined) {
      field.value=config.settings[name];
      field.dispatchEvent(new Event('input',{bubbles:true}));
      field.dispatchEvent(new Event('change',{bubbles:true}));
    }
    field.addEventListener('change',() => {
      const values={}; for (const key of settingNames) values[key]=document.getElementById(key).value;
      send('focus:settings',{settings:values}); summarySettings();
    });
  }
  summarySettings();
  const rules=document.createElement('dialog');
  rules.className='rules-dialog'; rules.setAttribute('aria-label',config.title+'训练规则');
  rules.innerHTML='<div class="rules-head"><h2>这一项，怎么练？</h2><button type="button" aria-label="关闭训练规则">×</button></div>';
  const list=document.querySelector('.side ol');
  if (list) rules.appendChild(list.cloneNode(true));
  const example=document.querySelector('.side .example');
  if (example) { const copy=example.cloneNode(true);copy.hidden=false;for(const e of [copy,...copy.querySelectorAll('[id]')])e.removeAttribute('id');rules.appendChild(copy); }
  rules.querySelector('button').onclick=()=>rules.close();
  document.body.appendChild(rules);
  for (const e of rules.querySelectorAll('[id]'))e.removeAttribute('id');
  const marker=board.querySelector('#compare,#review');
  if(marker)marker.before(result);else board.appendChild(result);
  const saved=document.createElement('p');saved.className='result-status';saved.setAttribute('role','status');result.appendChild(saved);
  const actions=document.createElement('div');actions.className='result-actions';
  actions.innerHTML='<button type="button" id="again">再练一轮</button><button type="button" id="resultNext">下一项 →</button><button type="button" id="resultHome">返回目录</button>';
  result.appendChild(actions);
  actions.querySelector('#resultNext').onclick=()=>send('focus:navigate',{target:config.id<6?config.id+1:null});
  actions.querySelector('#resultHome').onclick=()=>send('focus:navigate',{target:null});
  const toolbar=startButton.parentElement;
  const session=(crypto.randomUUID?crypto.randomUUID():Date.now().toString(36)+'-'+Math.random().toString(36).slice(2));
  const unshift=state.records.unshift;
  state.records.unshift=function(...items){
    const count=unshift.apply(this,items);
    for (const record of items) {
      const completed=config.id===1?['complete','timeout'].includes(record.reason):config.id===4?true:config.id===3?record.finished:record.completed;
      queueMicrotask(()=>{
        document.body.classList.remove('training-running');
        toolbar.hidden=Boolean(completed);toolbar.style.display=completed?'none':'';
        result.classList.remove('result-reveal');
        if(completed){void result.offsetWidth;result.classList.add('result-reveal');}
        saved.textContent=completed?'正在保存本轮记录…':'本轮未完成，不计入练习足迹。';
        send(completed?'focus:complete':'focus:round-end',{token:session+':'+record.round,record:JSON.parse(JSON.stringify(record))});
        reportHeight();
        if(completed)requestAnimationFrame(()=>requestAnimationFrame(()=>send('focus:reveal-result',{top:result.getBoundingClientRect().top})));
      });
    }
    return count;
  };
  function begin() {
    if (pendingStart || isRunning() || !active || !routeReady) return;
    pendingStart=true;const ticket=++generation;startButton.disabled=true;
    settings.open=false;document.body.classList.add('training-running');
    toolbar.hidden=false;toolbar.style.display='';result.hidden=true;
    // Settle layout before presenting stimuli, then begin the existing engine without an entry animation.
    requestAnimationFrame(()=>requestAnimationFrame(()=>{
      if(ticket!==generation||!active||!routeReady||document.hidden){pendingStart=false;startButton.disabled=false;return;}
      pendingStart=false;start();startButton.textContent='训练中…';
      // First paint is now visible. Align response clocks on the following frame.
      board.style.pointerEvents='none';
      requestAnimationFrame(()=>{
        board.style.pointerEvents='';
        if(ticket!==generation||!isRunning())return;
        const now=performance.now();
        if(config.id!==4){state.started=now;if(Number.isFinite(state.itemStarted))state.itemStarted=now;}
        reportHeight();
      });
      reportHeight();
    }));
  }
  startButton.addEventListener('click',event=>{event.preventDefault();event.stopImmediatePropagation();begin();},true);
  actions.querySelector('#again').onclick=begin;
  startButton.textContent='开始训练';startButton.disabled=true;

  // Preserve a full observation interval AFTER the stimulus has actually painted.
  if (config.id===4) {
    const originalLater=later;
    later=function(milliseconds,callback){
      if(state.phase==='memorize'&&milliseconds===state.duration){
        const ticket=state.generation;
        requestAnimationFrame(()=>requestAnimationFrame(()=>{if(active&&ticket===state.generation&&state.phase==='memorize')originalLater(milliseconds,callback);}));
      }else originalLater(milliseconds,callback);
    };
  }
  if (config.id===5) {
    const originalPlay=playObservation;
    playObservation=function(replay){
      if(!state.running||(replay&&state.phase!=='ready'))return;
      originalPlay(replay);state.phase='presenting';const ticket=state.generation;
      requestAnimationFrame(()=>requestAnimationFrame(()=>{
        if(active&&state.running&&ticket===state.generation&&state.phase==='presenting'){
          state.observationStarted=performance.now();state.phase='observing';
        }
      }));
    };
  }
  const interrupt=()=>{
    generation++;pendingStart=false;board.style.pointerEvents='';
    if(config.id===4){if(isRunning())abort('已离开训练，本组未计分。准备好后可重新开始。');}
    else if(state.running)finish('stopped');
    document.body.classList.remove('training-running');
    startButton.disabled=!routeReady;reportHeight();
  };
  window.addEventListener('message',event=>{
    if(event.source!==parent)return;
    const data=event.data||{};
    if(data.type==='focus:suspend'){active=false;routeReady=false;interrupt();}
    if(data.type==='focus:activate'){active=true;routeReady=false;startButton.disabled=true;root.dataset.reduced=String(data.reduced);reportHeight();}
    if(data.type==='focus:transition-ready'){active=true;routeReady=true;if(!isRunning())startButton.disabled=false;}
    if(data.type==='focus:motion')root.dataset.reduced=String(data.reduced);
    if(data.type==='focus:viewport'){document.body.dataset.keyboard=String(data.keyboard);root.style.setProperty('--view-height',data.height+'px');reportHeight();}
    if(data.type==='focus:saved')saved.textContent=data.saved?'✓ 本轮记录已保存在本机':'记录保存失败，可先导出备份并稍后重试。';
    if(data.type==='focus:help'){if(!rules.open)rules.showModal();}
  });
  window.focusCloseDialog=()=>{if(rules.open){rules.close();return true;}return false;};
  const input=document.getElementById('answerInput');
  if(input){
    input.setAttribute('enterkeyhint','done');
    const reveal=()=>{const box=document.querySelector('.answer-form').getBoundingClientRect();send('focus:focus-input',{top:box.top,bottom:box.bottom});};
    input.addEventListener('focus',()=>setTimeout(reveal,80));
    window.addEventListener('message',event=>{if(event.source===parent&&event.data?.type==='focus:viewport'&&document.activeElement===input)requestAnimationFrame(reveal);});
  }
  new ResizeObserver(reportHeight).observe(document.querySelector('main'));
  window.addEventListener('resize',reportHeight);
  requestAnimationFrame(()=>requestAnimationFrame(()=>{reportHeight();send('focus:ready');}));
}
