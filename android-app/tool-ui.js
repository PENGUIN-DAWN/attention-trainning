function installToolUI(config){
 'use strict';
 const R=FocusToolRules,id=config.id,$=s=>document.getElementById(s),send=(type,data={})=>parent.postMessage({type,module:id,...data},'*');
 const state={phase:'idle',generation:0,index:0,results:[],selected:[],question:null,condition:null,started:0,deadline:0,ready:false,active:true,frame:0,token:null,pending:null};
 window.toolState=state;
 document.documentElement.style.setProperty('--accent',config.accent);document.documentElement.style.setProperty('--tint',config.tint);document.documentElement.dataset.reduced=String(config.reduced);
 const options={7:[['normal','普通 · 10 球 / 4 目标'],['strong','加强 · 12 球 / 5 目标']],8:[['15','15 秒'],['12','12 秒']],9:[['one','缺失 1 件'],['two','缺失 2 件']],10:[['8','8 秒'],['6','6 秒'],['5','5 秒']]};
 $('preset').replaceChildren(...options[id].map(([v,t])=>new Option(t,v)));
 $('gridOption').hidden=id!==10;
 if(config.settings.preset&&options[id].some(([v])=>v===config.settings.preset))$('preset').value=config.settings.preset;
 if(id===10&&['mobile','video'].includes(config.settings.grid))$('gridSize').value=config.settings.grid;
 const settings=()=>({preset:$('preset').value,...(id===10?{grid:$('gridSize').value}:{})});
 function describe(){const c=R.condition(id,settings());$('condition').textContent=R.label(id,c)+' · 每轮 '+c.rounds+' 题';$('gridNote').hidden=id!==10||c.grid!=='video';}
 for(const field of [$('preset'),$('gridSize')])field.onchange=()=>{describe();send('focus:settings',{settings:settings()});};describe();
 const rules={7:'记住亮起的目标球，等它们变成同色并移动。停止后选择对应编号，数量与目标数相同再提交。球体运动是题目内容，减少动画不会关闭它。',8:'6×6 中恰好一个两位数出现两次。选中这两个位置再提交；提交前可取消选择，限时到后才揭晓答案。',9:'同时记住 12 件物品及名称 8 秒。遮挡后，剩余物品会重新排列。输入缺失物品的名称，顺序不限；想不起来可跳过。',10:'先看指定目标字，再点击方格中唯一的目标。每题只允许一次点击，提交后锁定。8×10 为视频规模，手机上格子较小，推荐使用独立的 6×5 条件。'};
 $('rulesText').textContent=rules[id];$('rulesClose').onclick=()=>$('rules').close();
 const busy=()=>!['idle','result','aborted'].includes(state.phase);
 function height(){send('focus:height',{height:Math.ceil(document.querySelector('main').getBoundingClientRect().height)+3});}
 new ResizeObserver(height).observe(document.querySelector('main'));
 let pendingFrames=new Set();
 function stable(callback){const gen=state.generation;const a=requestAnimationFrame(()=>{pendingFrames.delete(a);const b=requestAnimationFrame(()=>{pendingFrames.delete(b);if(gen===state.generation&&state.active&&!document.hidden)callback();});pendingFrames.add(b);});pendingFrames.add(a);}
 function cancel(){state.generation++;cancelAnimationFrame(state.frame);for(const f of pendingFrames)cancelAnimationFrame(f);pendingFrames.clear();}
 function tick(duration,callback,motion=false){
  const gen=state.generation;state.started=performance.now();state.deadline=state.started+duration;let previous=state.started;
  function frame(now){if(gen!==state.generation||!state.active)return;const remaining=Math.max(0,state.deadline-now);$('clock').textContent=(remaining/1000).toFixed(1)+' 秒';if(motion){let dt=(now-previous)/1000;while(dt>0){const part=Math.min(.025,dt);R.step(state.question.balls,part);dt-=part;}drawBalls();}previous=now;if(now>=state.deadline){callback();return;}state.frame=requestAnimationFrame(frame);}state.frame=requestAnimationFrame(frame);
 }
 function elapsed(){return Math.max(0,performance.now()-state.started);}
 function responseReady(limit=0){state.phase='preparing';stable(()=>{state.phase='answer';state.started=performance.now();$('stage').textContent='作答';for(const b of $('stimulus').querySelectorAll('button'))b.disabled=false;for(const i of $('inputs').querySelectorAll('input'))i.disabled=false;updateSubmit();$('skip').disabled=false;if(limit)tick(limit,()=>submit(true));else $('clock').textContent='不限时';});}
 function vector(item){const wrap=document.createElement('div');wrap.className='object';wrap.innerHTML='<svg viewBox="0 0 64 64" aria-hidden="true"><path d="'+item.path+'"/></svg>';const label=document.createElement('span');label.textContent=item.name;wrap.append(label);return wrap;}
 function showObjects(items){$('stimulus').className='object-grid';$('stimulus').replaceChildren(...items.map(vector));}
 function drawBalls(){const q=state.question,c=$('canvas'),ctx=c.getContext('2d');ctx.clearRect(0,0,600,600);ctx.fillStyle='#f3f5fa';ctx.fillRect(0,0,600,600);for(const b of q.balls){const target=state.phase==='mark'&&q.targets.includes(b.id);ctx.beginPath();ctx.arc(b.x*600,b.y*600,25,0,Math.PI*2);ctx.fillStyle=target?'#a46124':'#485f80';ctx.fill();if(target){ctx.lineWidth=5;ctx.strokeStyle='#f3ca7e';ctx.stroke();}if(['answer','preparing','feedback'].includes(state.phase)&&state.labelsVisible){ctx.fillStyle='#fff';ctx.font='bold 23px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(q.labels[b.id],b.x*600,b.y*600);}}}
 function button(text,index){const b=document.createElement('button');b.type='button';b.textContent=text;b.dataset.index=index;b.disabled=true;b.onclick=()=>select(index,b);return b;}
 function question(){
  cancel();state.phase='preparing';state.question=R.generate(id,state.condition);state.selected=[];state.labelsVisible=false;$('progress').textContent='第 '+(state.index+1)+' / '+state.condition.rounds+' 题';$('feedback').textContent='';$('next').hidden=true;$('submit').hidden=false;$('submit').disabled=true;$('skip').hidden=id!==9;$('skip').disabled=true;$('inputs').replaceChildren();$('stimulus').replaceChildren();$('clock').textContent='准备中';$('stage').textContent='准备';
  const q=state.question,c=state.condition;
  if(id===7){
   $('stimulus').className='tracking';const canvas=document.createElement('canvas');canvas.id='canvas';canvas.width=600;canvas.height=600;canvas.setAttribute('aria-label','多目标追踪运动区域');$('stimulus').append(canvas);const choices=document.createElement('div');choices.id='numberChoices';choices.className='number-choices';$('stimulus').append(choices);$('prompt').textContent='记住 '+c.targets+' 个金色目标球；停止后才会显示编号。';
   stable(()=>{state.phase='mark';$('stage').textContent='标记目标';drawBalls();stable(()=>tick(c.markMs,()=>{state.phase='motion';$('stage').textContent='同色运动';drawBalls();stable(()=>tick(c.motionMs,()=>{state.phase='preparing';state.labelsVisible=true;drawBalls();choices.replaceChildren(...Array.from({length:c.balls},(_,i)=>button(String(i+1),q.labels.indexOf(i+1))));$('prompt').textContent='选择 '+c.targets+' 个目标球现在的编号，然后提交。';responseReady();},true));}));});
  }else if(id===8){$('stimulus').className='number-grid';$('stimulus').replaceChildren(...q.values.map((n,i)=>button(n,i)));$('prompt').textContent='选择重复数字所在的两个位置。';responseReady(c.limitMs);
  }else if(id===9){$('prompt').textContent='同时记住这 12 件物品，名称也可以帮助记忆。';showObjects(q.items);stable(()=>{state.phase='observe';$('stage').textContent='观察';stable(()=>tick(c.observeMs,()=>{state.phase='mask';$('stage').textContent='遮挡';$('stimulus').className='mask';$('stimulus').textContent='• • •';stable(()=>tick(c.maskMs,()=>{showObjects(q.remaining);$('prompt').textContent='缺少哪 '+c.missing+' 件物品？请输入名称，顺序不限。';for(let i=0;i<c.missing;i++){const label=document.createElement('label');label.textContent='缺失物品 '+(i+1);const input=document.createElement('input');input.type='text';input.maxLength=24;input.placeholder='输入物品名称';input.disabled=true;input.setAttribute('enterkeyhint','done');let composing=false,imeUntil=0;input.oncompositionstart=()=>composing=true;input.oncompositionend=()=>{composing=false;imeUntil=performance.now()+100;};input.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();if(!e.isComposing&&!composing&&e.keyCode!==229&&performance.now()>imeUntil)submit(false);}};input.oninput=updateSubmit;input.onfocus=()=>requestAnimationFrame(()=>{const box=$('recallForm').getBoundingClientRect();send('focus:focus-input',{top:box.top,bottom:box.bottom});});label.append(input);$('inputs').append(label);}$('skip').hidden=false;responseReady();}));}));});
  }else{const c=state.condition;$('stimulus').className='char-grid';$('stimulus').style.gridTemplateColumns='repeat('+c.cols+',minmax(0,1fr))';$('stimulus').dataset.grid=c.grid;$('prompt').textContent='请找出唯一的「'+q.pair.target+'」';$('stimulus').replaceChildren(...q.values.map((t,i)=>button(t,i)));$('submit').hidden=true;responseReady(c.limitMs);}
  height();
 }
 function updateSubmit(){const needed=id===7?state.condition?.targets:2;$('submit').disabled=state.phase!=='answer'||(id===9?[...$('inputs').querySelectorAll('input')].some(i=>!i.value.trim()):state.selected.length!==needed);}
 function select(index,b){if(state.phase!=='answer')return;if(state.condition.limitMs&&performance.now()>=state.deadline){submit(true);return;}if(id===10){state.selected=[index];submit(false);return;}const at=state.selected.indexOf(index),max=id===7?state.condition.targets:2;if(at>=0)state.selected.splice(at,1);else if(state.selected.length<max)state.selected.push(index);for(const item of $('stimulus').querySelectorAll('button'))item.setAttribute('aria-pressed',String(state.selected.includes(Number(item.dataset.index))));updateSubmit();}
 function submit(timeout=false,skip=false){
  if(state.phase!=='answer')return;
  if(state.condition.limitMs&&performance.now()>=state.deadline)timeout=true;
  if(!timeout&&!skip&&id!==10&&$('submit').disabled)return;
  const responseMs=state.condition.limitMs?Math.min(state.condition.limitMs,elapsed()):elapsed();state.phase='feedback';cancelAnimationFrame(state.frame);$('stage').textContent=timeout?'时间到':'核对';$('clock').textContent=(responseMs/1000).toFixed(1)+' 秒';
  const answer=id===9?[...$('inputs').querySelectorAll('input')].map(i=>i.value):id===10?state.selected[0]:[...state.selected],score=R.score(id,state.question,answer,timeout,skip);
  const result={...score,responseMs,...(id===10?{pair:state.question.pair.background+'/'+state.question.pair.target}:{})};state.results.push(result);
  for(const b of $('stimulus').querySelectorAll('button'))b.disabled=true;for(const input of $('inputs').querySelectorAll('input'))input.disabled=true;$('submit').disabled=true;$('skip').disabled=true;
  let answerText='';if(id===7)answerText='目标编号：'+state.question.targets.map(i=>state.question.labels[i]).sort((a,b)=>a-b).join('、')+'；命中 '+score.hits+'，误选 '+score.errors;else if(id===8){answerText='重复数字：'+state.question.duplicate;for(const i of state.question.answer)$('stimulus').children[i].classList.add('solution');}else if(id===9)answerText='缺失：'+state.question.missing.map(x=>x.name).join('、')+'；找回 '+score.hits+'，错误 '+score.errors;else{const i=state.question.answer;answerText='正确位置：第 '+(Math.floor(i/state.condition.cols)+1)+' 行，第 '+(i%state.condition.cols+1)+' 列。'+state.question.pair.hint;$('stimulus').children[i].classList.add('solution');}
  $('feedback').textContent=(skip?'已跳过。':score.correct?'✓ 回答正确。':timeout?'已超时。':'回答有误。')+answerText;$('feedback').className=score.correct?'feedback correct':'feedback incorrect';$('next').textContent=state.index+1===state.condition.rounds?'查看本轮成绩':'下一题';$('next').hidden=false;
  if(state.index+1===state.condition.rounds){state.pending=R.detail(id,state.condition,state.results);save();}
 }
 function save(){if(!state.pending)return;$('saved').textContent='正在保存…';send('focus:complete',{token:state.token,record:state.pending});}
 function showResult(){state.phase='result';$('play').hidden=true;$('result').hidden=false;$('setup').hidden=false;$('resultMain').textContent='答对 '+state.pending.correct+' / '+state.pending.total+' 题';$('resultDetail').textContent=R.label(id,state.condition)+'\n作答用时 '+state.pending.seconds.toFixed(1)+' 秒；观察、运动、遮挡及核对时间不计入。';$('result').classList.add('result-reveal');height();stable(()=>send('focus:reveal-result',{top:$('result').getBoundingClientRect().top}));}
 function finish(){if(state.phase!=='feedback'||state.results.length!==state.index+1)return;if(state.index+1<state.condition.rounds){state.index++;question();return;}showResult();}
 function begin(){if(!state.ready||!state.active||busy())return;cancel();state.phase='preparing';state.condition=R.condition(id,settings());state.results=[];state.index=0;state.pending=null;state.token=crypto.randomUUID?crypto.randomUUID():Date.now()+'-'+Math.random();$('result').hidden=true;$('setup').hidden=true;$('start').hidden=true;$('play').hidden=false;question();}
 function abort(){if(!busy())return;const completed=Boolean(state.pending);cancel();if(completed){showResult();$('notice').textContent='本轮已经完成，请确认下方保存结果。';return;}state.phase='aborted';$('play').hidden=true;$('setup').hidden=false;$('start').hidden=false;$('notice').textContent='本轮已中断，不计作完成。已取消计时，准备好后可重新开始。';send('focus:interrupted',{token:state.token,record:R.detail(id,state.condition,state.results,'interrupted')});height();}
 $('start').onclick=begin;$('again').onclick=begin;$('next').onclick=finish;$('submit').onclick=()=>submit(false);$('skip').onclick=()=>submit(false,true);$('stop').onclick=abort;$('retrySave').onclick=save;$('home').onclick=()=>send('focus:navigate',{target:null});
 window.focusCloseDialog=()=>{if($('rules').open){$('rules').close();return true;}return false;};
 window.addEventListener('message',event=>{if(event.source!==parent)return;const d=event.data||{};
  if(d.type==='focus:suspend'){state.active=false;state.ready=false;abort();cancel();$('start').disabled=true;}
  if(d.type==='focus:activate'){state.active=true;state.ready=false;$('start').disabled=true;document.documentElement.dataset.reduced=String(d.reduced);height();}
  if(d.type==='focus:transition-ready'){state.ready=true;$('start').disabled=false;}
  if(d.type==='focus:motion')document.documentElement.dataset.reduced=String(d.reduced);
  if(d.type==='focus:help'){if(!$('rules').open)$('rules').showModal();}
  if(d.type==='focus:viewport'){height();if(document.activeElement?.tagName==='INPUT'){const rect=$('recallForm').getBoundingClientRect();send('focus:focus-input',{top:rect.top,bottom:rect.bottom});}}
  if(d.type==='focus:saved'){$('saved').textContent=d.saved?'✓ 本轮记录已保存在本机':'记录未能保存，请释放空间后重试。';$('retrySave').hidden=d.saved;}
 });
 document.addEventListener('visibilitychange',()=>{if(document.hidden)abort();});
 // Readiness belongs to the frame lifetime, not a cancellable training round.
 requestAnimationFrame(()=>requestAnimationFrame(()=>{height();send('focus:ready');}));
}
