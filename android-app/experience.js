'use strict';
const modules=JSON.parse(document.getElementById('trainingData').textContent);
const presentation=JSON.parse(document.getElementById('trainingPresentation').textContent);
const $=id=>document.getElementById(id);
const STORAGE_KEY='focus-universe-history-v1';
const SETTINGS_KEY='focus-universe-settings-v1';
const UI_KEY='focus-universe-ui-v1';
const BACKUP_LIMIT=24000000;
const frames=new Map();
const frameReady=new Set();
const coreRules=['按顺序点击数字，可设置正序或倒序。','忽略字义，只回答亮起文字的颜色。','忽略字号，按数值从小到大选择。','记住六项，再按原顺序选出。','忽略字义，判断刚才的实际变化。','保持部件位置，在脑中合成一个汉字。','记住亮起的目标，追踪同色运动后的位置。','选出唯一重复数字所在的两个位置。','同时记住 12 件物品，找出消失的物品。','看清目标字，点击唯一的异类。'];
const actionColors=['#40664e','#705094','#326d77','#944967','#426395','#85612f','#46689b','#327462','#885c24','#785696'];
coreRules.push('跟随当前提示，判断单双或大小。','关注自然呼吸，察觉走神后温和返回。','短暂观察中心与周边，再分别回答。','圆形点击，三角不点击；保持整轮监测。','戴立体声耳机，只回答指定耳朵的数字。','同一位置连续呈现，按顺序报告两个数字。');
actionColors.push('#456697','#406b54','#856032','#71538a','#326d7b','#8e4b73');
let activeModule=null,records=[],settings={},preferences={reduced:false,seen:[]};
let homeScroll=0,routeVersion=0,settledModule=null,routeInitialized=false,routeAnimation=null,toastTimer=0,renderedModule=null;
let systemReduced=false,recordFilter=0;
const mediaReduced=matchMedia('(prefers-reduced-motion: reduce)');
const allowedSettings={1:{mode:['challenge','complete','reverse']},4:{category:['mixed','animals','objects'],speed:['1000','1500','2000']},5:{observationDuration:null},7:{preset:['normal','strong']},8:{preset:['15','12']},9:{preset:['one','two']},10:{preset:['8','6','5'],grid:['mobile','video']}};
Object.assign(allowedSettings,{13:{preset:['entry','middle','strong']},15:{preset:['left','right','switch']}});
function cleanSettings(raw){
 const result={};if(!raw||typeof raw!=='object')return result;
 for(const [id,fields]of Object.entries(allowedSettings))for(const [key,values]of Object.entries(fields)){
  const value=String(raw[id]?.[key]??'');
  if(values?values.includes(value):/^(1(?:\.[0-9])?|2(?:\.0)?)$/.test(value))(result[id]||={})[key]=value;
 }return result;
}
function validRecord(r){return r&&Number.isInteger(r.module)&&r.module>=1&&r.module<=16&&typeof r.token==='string'&&r.token.length<=200&&Number.isFinite(r.at)&&r.at>0&&r.at<8640000000000000&&typeof r.summary==='string'&&r.summary.length<=400&&(r.module<=6||Boolean(r.module>=11?FocusAdvancedRules.cleanDetail(r.module,r.detail):FocusToolRules.cleanDetail(r.module,r.detail)));}
try{const saved=JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]');if(Array.isArray(saved))records=saved.filter(validRecord).slice(0,200);}catch{}
try{settings=cleanSettings(JSON.parse(localStorage.getItem(SETTINGS_KEY)||'{}'));}catch{}
try{const saved=JSON.parse(localStorage.getItem(UI_KEY)||'{}');preferences={reduced:saved.reduced===true,seen:Array.isArray(saved.seen)?saved.seen.filter(n=>Number.isInteger(n)&&n>=1&&n<=16):[]};}catch{}
function node(tag,className,text){const element=document.createElement(tag);if(className)element.className=className;if(text!==undefined)element.textContent=text;return element;}
function showToast(message){
 const modal=[...document.querySelectorAll('dialog[open]')].reverse()[0];
 if(modal){let notice=modal.querySelector('.operation-status');if(!notice){notice=node('p','operation-status');notice.setAttribute('role','status');const head=modal.querySelector('.dialog-head,h2');if(head)head.after(notice);else modal.prepend(notice);}notice.textContent=message;return;}
 $('toast').textContent=message;$('toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('visible'),3200);
}
function reducedMotion(){return preferences.reduced||systemReduced||mediaReduced.matches;}
function sendTo(id,data){const child=frames.get(id)?.contentWindow;if(child)child.dispatchEvent(new MessageEvent('message',{source:window,data}));}
function updateMotion(){
 document.documentElement.dataset.reduced=String(reducedMotion());
 for(const id of frames.keys())sendTo(id,{type:'focus:motion',reduced:reducedMotion()});
 if(reducedMotion())for(const animation of document.getAnimations()){try{animation.finish();}catch{animation.cancel();}}
}
window.focusUpdateSystemMotion=value=>{systemReduced=Boolean(value);updateMotion();};
try{systemReduced=Boolean(window.FocusDevice?.systemReducedMotion?.());}catch{}
mediaReduced.addEventListener('change',updateMotion);
function updateToday(){
 const completed=new Set(records.filter(r=>r.detail?.status!=='interrupted'&&todayKey(r.at)===todayKey()).map(r=>r.module));
 $('todayCount').textContent=completed.size+' / 16 项';
 for(const module of modules){$('orb'+module.id).classList.toggle('done',completed.has(module.id));$('todayProgress').children[module.id-1].className=completed.has(module.id)?'done':'';}
 $('todayHint').textContent=completed.size===16?'今天，十六项都留下了足迹。':completed.size?'已完成 '+completed.size+' 项，按自己的节奏继续。':'选择一项，给自己一小段专注时间。';
 updateDirectoryDetails();
}
function moduleSource(module){
 const config={id:module.id,title:module.title,accent:actionColors[module.id-1],tint:visuals[module.id-1].color,reduced:reducedMotion(),settings:settings[module.id]||{}};
 const themed=module.source.replace('</head>','<style>'+presentation.chrome+'</style></head>');
 if(module.id>=11){if(module.id===15)config.audio=JSON.parse($('digitAudio').textContent);return themed.replace('</body>','<script>installAdvancedUI('+JSON.stringify(config)+');<'+'/script></body>');}
 if(module.id>=7)return themed.replace('</body>','<script>installToolUI('+JSON.stringify(config)+');\n'+presentation.chromeStatus+'\ninstallChromeStatus();<'+'/script></body>');
 return module.source.replace('</head>','<style>'+presentation.css+'\n'+presentation.chrome+'</style></head>').replace('</body>','<script>'+presentation.js+'\ninstallTrainingUI('+JSON.stringify(config)+');<'+'/script></body>');
}
function getFrame(module){
 if(frames.has(module.id))return frames.get(module.id);
 const frame=document.createElement('iframe');frame.className='training-frame';frame.title='第'+module.id+'项：'+module.title;frame.setAttribute('sandbox','allow-scripts allow-same-origin');frame.setAttribute('scrolling','no');frame.hidden=true;frame.srcdoc=moduleSource(module);
 frames.set(module.id,frame);$('frameHost').appendChild(frame);return frame;
}
function activateFrame(id){sendTo(id,{type:'focus:activate',reduced:reducedMotion()});updateViewport();if(settledModule===id)sendTo(id,{type:'focus:transition-ready'});}
function animateView(view,duration,exit=false){if(reducedMotion()||document.hidden)return Promise.resolve();const animation=view.animate(exit?[{opacity:1,transform:'translateY(0)'},{opacity:0,transform:'translateY(4px)'}]:[{opacity:0,transform:'translateY(8px)'},{opacity:1,transform:'translateY(0)'}],{duration,easing:'cubic-bezier(.2,.7,.2,1)'});routeAnimation=animation;return animation.finished.catch(()=>{});}
async function route(){
 const match=location.hash.match(/^#train\/(1[0-6]|[1-9])$/),id=match?Number(match[1]):null;
 if(routeInitialized&&id===activeModule)return;
 const previous=activeModule;if(previous===null&&id!==null)homeScroll=window.scrollY;
 if(previous!==null)sendTo(previous,{type:'focus:suspend'});
 routeInitialized=true;activeModule=id;settledModule=null;const ticket=++routeVersion;routeAnimation?.cancel();
 stopHomeMotion();
 if(previous!==null||id!==null&&directoryEntranceDone){await animateView(previous===null?$('homeView'):$('playView'),160,true);if(ticket!==routeVersion)return;}
 renderedModule=id;
 for(const [number,frame]of frames)frame.hidden=number!==id;
 document.body.dataset.training=String(id!==null);
 $('homeView').hidden=id!==null;$('playView').hidden=id===null;
 if(id===null){
  document.title='专注力小宇宙';updateToday();window.scrollTo(0,homeScroll);
  if(previous!==null)animateView($('homeView'),190).then(()=>{if(ticket===routeVersion)window.scrollTo(0,homeScroll);});else enterDirectory(true);return;
 }
 const module=modules[id-1];$('playTitle').textContent=module.title;$('playDescription').textContent=coreRules[id-1];$('playNumber').textContent=String(id).padStart(2,'0');
 clearTimeout(toastTimer);$('toast').classList.remove('visible');
 $('playView').style.setProperty('--module-accent',module.accent);$('playView').style.setProperty('--module-bg',visuals[id-1].color);document.title=module.title+' · 专注力小宇宙';
 for(const item of modules){$('tab'+item.id).classList.toggle('active',item.id===id);$('tab'+item.id).setAttribute('aria-current',item.id===id?'page':'false');}
 const frame=getFrame(module);frame.hidden=false;$('frameLoading').hidden=frameReady.has(id);window.scrollTo(0,0);
 if(frameReady.has(id))activateFrame(id);
 animateView($('playView'),260).then(()=>{if(ticket!==routeVersion||activeModule!==id)return;settledModule=id;if(frameReady.has(id))sendTo(id,{type:'focus:transition-ready'});maybeGuide(id);});
}
function navigate(target){const hash=target===null?'#home':'#train/'+target;if(location.hash!==hash)location.hash=hash;}
function summaryFor(id,r){
 if(id>=11)return (r.status==='interrupted'?'中途退出 · ':'')+FocusAdvancedRules.main(id,r);
 if(id>=7)return (r.status==='interrupted'?'中途退出 · ':'')+'答对 '+r.correct+'/'+r.total+' 题 · 作答 '+r.seconds.toFixed(1)+' 秒';
 if(id===1)return '找到 '+r.found+'/25 · '+r.seconds.toFixed(1)+' 秒 · 点错 '+r.errors+' 次';
 if(id===3)return '一次排对 '+r.perfect+'/'+r.completed+' 题 · 点错 '+r.errors+' 次';
 if(id===4)return '位置记对 '+r.correct+'/6 项 · 每项 '+(r.duration/1000).toFixed(1)+' 秒';
 if(id===5)return '答对 '+r.correct+'/'+r.answered+' 题 · 观察 '+(r.observationMs/1000).toFixed(1)+' 秒';
 return '答对 '+r.correct+'/'+r.answered+' 题 · '+(id===6?'跳过 '+r.skips+' 题':'答错 '+r.errors+' 题');
}
window.addEventListener('message',event=>{
 const data=event.data;if(!data||!Number.isInteger(data.module)||event.source!==frames.get(data.module)?.contentWindow)return;
 const id=data.module,frame=frames.get(id);
 if(data.type==='focus:ready'){frameReady.add(id);if(activeModule===id){$('frameLoading').hidden=true;activateFrame(id);}return;}
 if(data.type==='focus:height'){if(Number.isFinite(data.height))frame.style.height=Math.max(180,Math.min(5000,data.height))+'px';return;}
 if(data.type==='focus:settings'){settings=cleanSettings({...settings,[id]:data.settings});try{localStorage.setItem(SETTINGS_KEY,JSON.stringify(settings));}catch{showToast('设置未能保存，请稍后重试。');}return;}
 if(data.type==='focus:navigate'){if(data.target===null||Number.isInteger(data.target)&&data.target>=1&&data.target<=16)navigate(data.target);return;}
 if(data.type==='focus:reveal-result'&&activeModule===id){requestAnimationFrame(()=>{if(activeModule===id)window.scrollTo({top:Math.max(0,window.scrollY+frame.getBoundingClientRect().top+data.top-20),behavior:reducedMotion()?'instant':'smooth'});});return;}
 if(data.type==='focus:focus-input'&&activeModule===id){
  requestAnimationFrame(()=>{const top=frame.getBoundingClientRect().top+data.top,bottom=frame.getBoundingClientRect().top+data.bottom,visible=window.visualViewport?.height||innerHeight;if(bottom>visible-12)window.scrollBy(0,bottom-visible+18);else if(top<12)window.scrollBy(0,top-18);});return;
 }
 if(!['focus:complete','focus:interrupted'].includes(data.type)||typeof data.token!=='string'||!data.record)return;
 if(records.some(r=>r.token===data.token)){sendTo(id,{type:'focus:saved',saved:true});return;}
 const item={module:id,token:data.token,at:Date.now(),summary:summaryFor(id,data.record)};
 item.detail=detailFor(id,data.record);
 if(id>=7&&!item.detail)return;
 const next=[item,...records].slice(0,200);let saved=true;
 try{FocusStorage.transaction([[STORAGE_KEY,JSON.stringify(next)]]);records=next;}catch{saved=false;}
 updateToday();sendTo(id,{type:'focus:saved',saved});if(!saved)showToast('记录保存失败，可以先导出备份。');
 if($('recordsDialog').open)renderRecords();
});
let largestViewport=innerHeight;
function updateViewport(){
 const height=window.visualViewport?.height||innerHeight;largestViewport=Math.max(largestViewport,height);const keyboard=[6,9].includes(activeModule)&&height<largestViewport*.75;
 document.body.classList.toggle('keyboard-open',keyboard);
 if(activeModule!==null)sendTo(activeModule,{type:'focus:viewport',height,keyboard});
}
window.visualViewport?.addEventListener('resize',updateViewport);window.addEventListener('resize',updateViewport);window.addEventListener('orientationchange',()=>{largestViewport=innerHeight;updateViewport();});
window.focusAndroidSuspend=()=>{routeVersion++;routeAnimation?.cancel();stopHomeMotion();settledModule=null;if(activeModule!==null)sendTo(activeModule,{type:'focus:suspend'});};
window.focusAndroidResume=()=>{if(renderedModule!==activeModule){routeInitialized=false;route();}else if(activeModule!==null){settledModule=activeModule;activateFrame(activeModule);}updateMotion();};
window.focusAndroidBack=()=>{
 for(const dialog of [...document.querySelectorAll('dialog[open]')].reverse()){dialog.close();return true;}
 const child=frames.get(activeModule)?.contentWindow;if(child?.focusCloseDialog?.())return true;
 if(activeModule!==null){window.focusAndroidSuspend();navigate(null);return true;}return false;
};
document.addEventListener('visibilitychange',()=>{if(document.hidden)window.focusAndroidSuspend();else window.focusAndroidResume();});
$('rulesButton').onclick=()=>{if(activeModule===null||!frameReady.has(activeModule))return;const id=activeModule;sendTo(id,{type:'focus:suspend'});settledModule=id;activateFrame(id);sendTo(id,{type:'focus:help'});};
$('recordsButton').onclick=()=>{if(activeModule!==null){const id=activeModule;sendTo(id,{type:'focus:suspend'});settledModule=id;activateFrame(id);}showRecords();};
$('closeRecords').onclick=()=>$('recordsDialog').close();
window.addEventListener('hashchange',route);window.addEventListener('pageshow',updateToday);

// Structured scores and the record renderer are defined below; legacy summary-only records remain valid.
function detailFor(id,r){
 if(id>=11)return FocusAdvancedRules.cleanDetail(id,r);
 if(id>=7)return FocusToolRules.cleanDetail(id,r);
 const d={schema:1,correct:0,total:0,errors:0,seconds:0,condition:''};
 const n=x=>Number.isFinite(Number(x))?Number(x):0;
 if(id===1){d.correct=n(r.found);d.total=25;d.errors=n(r.errors);d.seconds=n(r.seconds);d.mode=r.mode;d.condition=r.mode==='reverse'?'倒序 35 秒 · 25 → 1 · 点击 · 五色干扰':r.mode==='challenge'?'30 秒挑战':'完成 25 个';}
 else if(id===3){d.correct=n(r.perfect);d.total=20;d.errors=n(r.errors);d.seconds=n(r.total);d.average=n(r.average);d.condition='四个数字 · 20 题';d.digits=4;}
 else if(id===4){d.correct=n(r.correct);d.total=6;d.seconds=n(r.seconds);d.category=r.category;d.durationMs=n(r.duration);d.condition=({mixed:'物品与动物混合',animals:'动物',objects:'物品'}[r.category]||'')+' · 每项 '+d.durationMs/1000+' 秒';}
 else{d.correct=n(r.correct);d.total=20;d.errors=n(r.errors);d.seconds=n(r.total??r.seconds);d.average=n(r.average);d.condition=id===2?'字色冲突 · 20 题':id===5?'观察 '+n(r.observationMs)/1000+' 秒 · 20 题':'左右各 10 题 · 共 20 题';if(id===5){d.observationMs=n(r.observationMs);d.replays=n(r.replays);}if(id===6)d.skips=n(r.skips);}
 return cleanDetail(id,d);
}
function cleanDetail(id,d){
 if(id>=11)return FocusAdvancedRules.cleanDetail(id,d);
 if(id>=7)return FocusToolRules.cleanDetail(id,d);
 if(!d||d.schema!==1||!Number.isInteger(d.correct)||!Number.isInteger(d.total)||d.total!==({1:25,2:20,3:20,4:6,5:20,6:20}[id])||d.correct<0||d.correct>d.total||!Number.isFinite(d.seconds)||d.seconds<0||d.seconds>604800||typeof d.condition!=='string'||d.condition.length>120)return undefined;
 const result={schema:1,correct:d.correct,total:d.total,seconds:d.seconds,condition:d.condition};
 for(const key of ['errors','average','skips','replays'])if(Number.isFinite(d[key])&&d[key]>=0&&d[key]<=604800)result[key]=d[key];
 if(id===1){if(!['challenge','complete','reverse'].includes(d.mode))return undefined;result.mode=d.mode;if(d.mode==='reverse')Object.assign(result,{ruleVersion:1,direction:'descending',answerMode:'click',limitMs:35000,colors:5});}
 if(id===3){if(d.digits!==4)return undefined;result.digits=4;}
 if(id===4){if(!['mixed','animals','objects'].includes(d.category)||![1000,1500,2000].includes(d.durationMs))return undefined;result.category=d.category;result.durationMs=d.durationMs;}
 if(id===5){if(!Number.isInteger(d.observationMs)||d.observationMs<1000||d.observationMs>2000||d.observationMs%100!==0)return undefined;result.observationMs=d.observationMs;}
 return result;
}
function conditionKey(r){
 const d=cleanDetail(r.module,r.detail);if(!d)return null;
 if(r.module>=11)return r.module===12||d.status!=='complete'||d.validTotal!==d.total?null:JSON.stringify([r.module,d.ruleVersion,d.params,d.device.width,d.device.height,d.device.dpr]);
 if(r.module>=7)return d.status==='complete'?JSON.stringify([r.module,d.ruleVersion,d.params]):null;
 return JSON.stringify([r.module,d.mode??null,d.digits??null,d.category??null,d.durationMs??null,d.observationMs??null]);
}
function isBetter(a,b){
 if(a.module>=11){if(a.detail.correct!==b.detail.correct)return a.detail.correct>b.detail.correct;return a.detail.seconds<b.detail.seconds;}
 if(a.detail.correct!==b.detail.correct)return a.detail.correct>b.detail.correct;
 if(a.module>=7){const hits=d=>d.results.reduce((sum,r)=>sum+(r.hits||0),0);if(hits(a.detail)!==hits(b.detail))return hits(a.detail)>hits(b.detail);if(a.detail.errors!==b.detail.errors)return a.detail.errors<b.detail.errors;}
 if(a.module===1&&['challenge','reverse'].includes(a.detail.mode))return (a.detail.errors||0)<(b.detail.errors||0);
 return a.detail.seconds<b.detail.seconds;
}
function bestRecords(){
 const map=new Map();
 for(const r of records){const key=conditionKey(r);if(key&&!map.has(key))map.set(key,r);else if(key&&isBetter(r,map.get(key)))map.set(key,r);}
 return new Set([...map.values()].map(r=>r.token));
}
function mainResult(r){
 const d=cleanDetail(r.module,r.detail);if(!d)return r.summary.split(' · ')[0];
 if(r.module>=11)return (d.status==='interrupted'?'中途退出 · ':'')+FocusAdvancedRules.main(r.module,d);
 if(d.status==='interrupted')return '中途退出 · 已答 '+d.results.length+' / '+d.total+' 题';
 if(r.module===1&&d.mode==='complete'&&d.correct===25)return d.seconds.toFixed(1)+' 秒';
 return (r.module===3?'一次排对 ':r.module===4?'记对 ':'')+d.correct+' / '+d.total+(r.module===1?' 个':r.module===4?' 项':' 题');
}
function renderRecords(){
 const list=$('recordsList');list.replaceChildren();
 const filtered=records.filter(r=>!recordFilter||r.module===recordFilter),best=bestRecords();
 $('recordCount').textContent=(recordFilter?'本项目 '+filtered.length+' 条 · ':'')+'全部 '+records.length+' 条';
 $('clearRecords').disabled=records.length===0;
 for(const button of document.querySelectorAll('.record-filter')){const selected=Number(button.dataset.module)===recordFilter;button.classList.toggle('active',selected);button.setAttribute('aria-pressed',String(selected));}
 const structured=filtered.filter(r=>conditionKey(r));
 $('recordOverview').textContent=recordFilter?'本项目完成 '+filtered.length+' 轮 · '+structured.length+' 轮有完整训练条件。最佳标记只比较同项目、同模式和同难度；旧记录仅展示。':'已保存 '+records.length+' 轮练习。选择项目查看成绩；最佳标记按相同训练条件分别比较。';
 if(recordFilter>=11){const completed=filtered.filter(r=>r.detail?.status==='complete').length;$('recordOverview').textContent='完成 '+completed+' 轮 · 中断 '+(filtered.length-completed)+' 轮。'+(recordFilter===12?'呼吸自报不设正确率或最佳成绩。':'仅同条件、时序有效的完整轮次参与最佳比较。');}
 if(!filtered.length)list.appendChild(node('div','empty-records',recordFilter?'这个项目还没有训练记录。':'第一枚足迹，还在等你。\n完成一轮训练后，记录会出现在这里。'));
 for(const r of filtered){
  const module=modules[r.module-1],d=cleanDetail(r.module,r.detail),row=node('article','record-row');row.dataset.token=r.token;row.style.setProperty('--record-accent',module.accent);
  const badge=node('span','record-badge',String(r.module).padStart(2,'0'));badge.style.background=visuals[r.module-1].color;badge.style.color=module.accent;
  const body=node('div','record-body');body.append(node('div','record-title',module.title),node('div','record-main',mainResult(r)));
  body.appendChild(node('div','record-info',d?d.condition+'\n'+(r.module===4?'回忆用时 ':'用时 ')+d.seconds.toFixed(1)+' 秒'+(d.errors!==undefined?' · 错 '+d.errors+' 次':'')+(r.module===5?' · 重播 '+(d.replays||0)+' 次':''):r.summary+'\n旧版记录 · 未补算历史成绩'));
  if(r.module>=11&&d){body.lastElementChild.textContent=d.condition+'\n'+(d.status==='interrupted'?'中途退出':'完整完成')+'\n'+FocusAdvancedRules.metrics(r.module,d);}
  else if(r.module>=7&&d){body.lastElementChild.textContent=d.condition+'\n'+d.total+' 题 · '+(d.status==='interrupted'?'中途退出':'完整完成')+' · 作答 '+d.seconds.toFixed(1)+' 秒\n'+d.results.map((v,i)=>(i+1)+': '+(v.skip?'跳过':v.timeout?'超时':v.correct?'正确':'有误')+(v.hits!==undefined?' / 命中 '+v.hits:'')+' / 错 '+v.errors+(v.pair?' / '+v.pair:'')).join('；');}
  if(best.has(r.token))body.appendChild(node('span','best-tag','同条件最佳'));
  const date=node('time','record-date',new Intl.DateTimeFormat('zh-CN',{timeZone:'Asia/Shanghai',month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(r.at)));
  const remove=node('button','record-delete','删除');remove.type='button';remove.setAttribute('aria-label','删除'+module.title+'记录');remove.onclick=()=>requestDelete(r.token);
  row.append(badge,body,date,remove);list.appendChild(row);
 }
}
function showRecords(){renderRecords();if(!$('recordsDialog').open)$('recordsDialog').showModal();}
const recordFilters=node('div','record-filters');recordFilters.setAttribute('aria-label','按训练项目筛选');
for(const [id,label]of [[0,'全部'],...modules.map(m=>[m.id,m.title])]){const button=node('button','record-filter',label);button.type='button';button.dataset.module=id;button.onclick=()=>{recordFilter=id;renderRecords();};recordFilters.appendChild(button);}
const management=node('div','record-management');management.innerHTML='<span id="recordCount"></span><button id="clearRecords" type="button">清空全部</button>';
const overview=node('div','record-overview');overview.id='recordOverview';
$('recordsList').before(recordFilters,management,overview);
$('recordsTitle').textContent='你的练习足迹';document.querySelector('.dialog-copy').textContent='每一轮专注，都有迹可循。';
document.querySelector('.record-notice').textContent='记录仅保存在本机，最多 200 轮。卸载或换机前，请先导出备份。';
const deleteDialog=node('dialog','records-dialog delete-confirm');deleteDialog.id='deleteRecordsDialog';deleteDialog.setAttribute('aria-labelledby','deleteRecordsTitle');deleteDialog.setAttribute('aria-describedby','deleteRecordsDescription');
deleteDialog.innerHTML='<h2 id="deleteRecordsTitle"></h2><p id="deleteRecordsDescription"></p><div class="delete-actions"><button id="cancelDelete" type="button" autofocus>取消</button><button id="confirmDelete" type="button">确认删除</button></div>';
document.body.appendChild(deleteDialog);let deleteTarget=null;
function requestDelete(token){
 const r=records.find(item=>item.token===token);if(token!==null&&!r||token===null&&!records.length)return;
 deleteTarget={token};$('deleteRecordsTitle').textContent=token===null?'清空全部训练记录？':'删除这条记录？';
 $('deleteRecordsDescription').textContent=token===null?'将删除本机全部 '+records.length+' 条记录，包含其他筛选项目。训练设置和已导出的备份会保留。删除后无法直接恢复。':'将删除这条「'+modules[r.module-1].title+'」记录。其他记录和训练设置会保留，删除后无法直接恢复。';
 $('confirmDelete').textContent=token===null?'确认清空':'确认删除';deleteDialog.showModal();
}
$('clearRecords').onclick=()=>requestDelete(null);$('cancelDelete').onclick=()=>deleteDialog.close();
deleteDialog.addEventListener('close',()=>{if(!deleteDialog.open)deleteTarget=null;});
$('confirmDelete').onclick=()=>{
 if(!deleteTarget)return;const all=deleteTarget.token===null,next=all?[]:records.filter(r=>r.token!==deleteTarget.token);
 try{localStorage.setItem(STORAGE_KEY,JSON.stringify(next));}catch{showToast('删除未保存，请稍后重试。');return;}
 records=next;deleteDialog.close();updateToday();renderRecords();showToast(all?'已清空全部训练记录。':'已删除这条训练记录。');
};
const backupTools=node('div','backup-tools');backupTools.innerHTML='<button id="exportBackup" type="button">导出记录</button><button id="importBackup" type="button">导入备份</button><input id="backupFile" type="file" accept=".json,application/json" hidden>';
$('recordsList').after(backupTools);
window.focusExportBackup=()=>{
 const json=JSON.stringify({app:'focus-universe',version:4,exportedAt:new Date().toISOString(),records,settings,preferences,arcade:FocusArcadeStore.export()},null,2);
 if(new Blob([json]).size>BACKUP_LIMIT)throw new Error('备份内容过大，请先精简部分成绩记录再导出。');
 if(window.FocusDevice?.exportBackup){showToast('请选择备份文件的保存位置。');window.FocusDevice.exportBackup(json);return;}
 const url=URL.createObjectURL(new Blob([json],{type:'application/json'}));const link=node('a');link.href=url;link.download='focus-backup.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);showToast('已生成备份文件，请在下载中查看。');
};
$('exportBackup').textContent='导出完整备份';
$('exportBackup').onclick=()=>{try{window.focusExportBackup();}catch(error){showToast(error.message);}};
window.focusBackupResult=status=>showToast(status==='success'?'完整备份已导出。':status==='cancelled'?'已取消导出。':'导出失败，请换个保存位置重试。');
$('importBackup').onclick=()=>$('backupFile').click();
window.focusImportBackup=text=>{
 if(typeof text!=='string'||new Blob([text]).size>BACKUP_LIMIT)throw new Error('备份文件过大');
 const backup=JSON.parse(text);
 if(!backup||backup.app!=='focus-universe'||![1,2,3,4].includes(backup.version)||!Array.isArray(backup.records)||backup.records.length>200||!backup.records.every(validRecord))throw new Error('备份格式无效，原有记录未改动。');
 const merged=new Map(records.map(r=>[r.token,r]));
 for(const r of backup.records)if(!merged.has(r.token)){const item={module:r.module,token:r.token,at:r.at,summary:r.summary};const d=cleanDetail(r.module,r.detail);if(d)item.detail=d;merged.set(r.token,item);}
 const next=[...merged.values()].sort((a,b)=>b.at-a.at).slice(0,200),nextSettings=cleanSettings({...settings,...backup.settings});
 const incomingSeen=Array.isArray(backup.preferences?.seen)?backup.preferences.seen.filter(id=>Number.isInteger(id)&&id>=1&&id<=16):[];
 const nextPreferences={reduced:typeof backup.preferences?.reduced==='boolean'?backup.preferences.reduced:preferences.reduced,seen:[...new Set([...preferences.seen,...incomingSeen])]};
 const entries=[[STORAGE_KEY,JSON.stringify(next)],[SETTINGS_KEY,JSON.stringify(nextSettings)],[UI_KEY,JSON.stringify(nextPreferences)]];
 if(backup.arcade!==undefined)entries.push([FocusArcadeStore.KEY,JSON.stringify(FocusArcadeStore.merge(backup.arcade))]);
 try{FocusStorage.transaction(entries);}catch(error){throw new Error('备份未能保存，请释放空间后重试。');}
 records=next;settings=nextSettings;preferences=nextPreferences;$('reduceMotion').checked=preferences.reduced;updateMotion();
 const inTraining=location.hash==='#home'||location.hash.startsWith('#train/');
 window.focusAndroidSuspend();for(const frame of frames.values())frame.remove();frames.clear();frameReady.clear();updateToday();
 if(backup.arcade!==undefined)FocusArcadeStore.refresh();if(inTraining){navigate(null);showRecords();}
 showToast('备份已合并，重复记录不会再次导入；历史娱乐数据继续保留。');return records.length;
};
$('backupFile').onchange=async event=>{const file=event.target.files?.[0];try{if(!file)return;if(file.size>BACKUP_LIMIT)throw new Error('备份文件过大');window.focusImportBackup(await file.text());}catch(error){showToast(error instanceof SyntaxError?'文件格式不正确，原有记录未改动。':error.message);}finally{event.target.value='';}};
const guide=node('dialog','records-dialog');guide.id='guideDialog';guide.setAttribute('aria-labelledby','guideTitle');
guide.innerHTML='<div class="dialog-head"><h2 id="guideTitle"></h2><button class="dialog-close" aria-label="关闭小示例">×</button></div><div class="guide-visual" id="guideVisual"></div><p class="guide-copy" id="guideCopy"></p><div class="guide-actions"><button id="skipGuide" type="button">跳过示例</button><button id="dismissGuide" type="button">知道了</button></div>';
document.body.appendChild(guide);
const examples=[['1 → 2 → 3 → … → 25','数字位置和颜色会变化。只看数值，按顺序依次点击。'],['白  →  选「蓝」','当“白”字显示为蓝色时，回答蓝。答的是颜色，不是字义。'],['8　1　7　4\n1 → 4 → 7 → 8','不论字写得多大，都按数值从小到大选择四个数字。'],['🐱 → 🍎 → 🐶 → 🚗 → 🐰 → 🕒','先依次观察六项，再从打乱的选项中按原顺序选出。提交后才核对。'],['「变小」 ↗\n实际变大 → 选「变大」','观察完整过程再作答。可在开始前调整 1–2 秒观察时长；没看清可以重播。'],['女 ＋ 子 → 好','保留左右或上下位置，在脑中组合后输入一个汉字。输入法选字不会直接判题。']];
examples.push(['● ● ○ ○','记住亮起的目标球。变成同色并运动后，根据停止时的编号多选答案。'],['68　24　68','选择两个 68 的位置，再提交；在提交前不揭晓答案。'],['钥匙、苹果、杯子 → ？','先记住整组物品，重排后输入缺失物品名称。记物品，不记顺序。'],['未　未　末　未','目标是“末”：上横较长。每题点一次，结束后再核对。']);
examples.push(['单双：7 → 奇数\n大小：8 → 大于 5','先看本题规则。可在开始前做 8 题教学，教学不保存正式成绩。'],['自然呼吸 → 察觉 → 返回','每段结束如实报告。发现更多走神不表示能力变差；自报不作为自动测量或排名。'],['中心 ○ ＋ 右上 ★','短暂同时看见中心图形与周边目标，遮挡后分别回答。'],['○ 点击　△ 不点击','圆形要按，三角要忍住。每项窗口固定，连点只计首次。可先做 10 题教学。'],['左耳 3 / 右耳 8\n只听左耳 → 3','先连接立体声耳机并主动完成声道检查。教学可重播，正式题不重播。'],['K → 4 → M → 7 → H','同一位置连续呈现；结束后分别选出第一个和第二个数字。异常时序单独标记。']);
function maybeGuide(id){
 if(preferences.seen.includes(id)||activeModule!==id)return;
 preferences.seen.push(id);try{localStorage.setItem(UI_KEY,JSON.stringify(preferences));}catch{}
 $('guideTitle').textContent=modules[id-1].title+' · 小示例';$('guideVisual').textContent=examples[id-1][0];
 if(id===2){$('guideVisual').replaceChildren();const word=node('span',null,'白');word.style.color='#2c61ae';$('guideVisual').append(word,node('span',null,' → 选「蓝」'));}
 $('guideCopy').textContent=examples[id-1][1];guide.style.setProperty('--guide-tint',visuals[id-1].color);guide.style.setProperty('--guide-accent',modules[id-1].accent);guide.showModal();
}
for(const button of guide.querySelectorAll('button'))button.onclick=()=>guide.close();
const preferencesDialog=node('dialog','records-dialog app-help');preferencesDialog.id='preferencesDialog';preferencesDialog.setAttribute('aria-label','界面设置');
preferencesDialog.innerHTML='<div class="dialog-head"><h2>按你的节奏</h2><button class="dialog-close" aria-label="关闭界面设置">×</button></div><label class="preference-row"><span>减少动画</span><input id="reduceMotion" type="checkbox"></label><p class="preference-note">关闭装饰性漂浮和过渡。系统要求减少动画时会自动生效；动态识别题中的实际变化仍会保留。</p><p class="help-note">当前版本 __APP_VERSION__ · 完全离线</p>';
document.body.appendChild(preferencesDialog);preferencesDialog.querySelector('button').onclick=()=>preferencesDialog.close();
$('reduceMotion').checked=preferences.reduced;
$('reduceMotion').onchange=()=>{preferences.reduced=$('reduceMotion').checked;try{localStorage.setItem(UI_KEY,JSON.stringify(preferences));}catch{showToast('界面设置未能保存。');}updateMotion();};
$('preferencesButton').onclick=()=>preferencesDialog.showModal();
const help=node('dialog','records-dialog app-help');help.id='appHelp';help.setAttribute('aria-label','使用说明');help.innerHTML='<div class="dialog-head"><h2>你的小小练习空间</h2><button class="dialog-close" aria-label="关闭使用说明">×</button></div><p>六项训练都在安装包中，断网也能使用。每轮结束后，可再练一轮、进入下一项或返回目录。</p><p>「练习足迹」保存最近 200 轮，支持项目筛选、删除、清空和备份。旧记录会保留原始成绩；从新版开始保存训练条件，最佳标记只比较相同条件的完整轮次。</p><p>切到后台会结束未完成的一轮。卸载或换机前，请先导出备份。更新时直接覆盖安装，保留本机数据。</p><p>在「界面设置」中可以减少装饰动画。动态识别题本身的变化属于题目内容，会继续正常播放。</p><p class="help-note">版本 __APP_VERSION__ · 不登录、不联网、不上传成绩。练习不提供医疗诊断或治疗。</p>';
help.querySelector('p').textContent='十六项训练均内置，断网可用。本版保留原十项，增加规则切换、呼吸聚焦、中央与周边辨认、持续监测、双耳分听与串行双目标识别。双耳分听仅在主动进入并确认声道后播放内置声音。';
help.appendChild(node('p',null,'新项目只比较相同模式、参数和规则版本。中途退出单独标记，不计今日完成或最佳成绩。历史娱乐数据不再展示，但保留在本机与完整备份中。'));
document.body.appendChild(help);help.querySelector('button').onclick=()=>help.close();$('helpButton').onclick=()=>help.showModal();
buildDirectory();updateToday();updateMotion();route();
requestAnimationFrame(()=>requestAnimationFrame(()=>window.FocusDevice?.contentReady?.()));
