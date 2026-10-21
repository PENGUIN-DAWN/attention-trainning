/* New projects 11–16: pure configuration, generators, scoring, summaries and import validation. */
(function(root){
 'use strict';
 const VERSION=1,AUDIO_VERSION='zh-huihui-1';
 const CONFIG={
  11:{project:'rule-switching',mode:'fixed',rounds:60,cueMs:400,limitMs:3000,feedbackMs:400},
  12:{project:'breath-return',mode:'self-report-adaptive',rounds:null,practiceMs:180000,initialMs:20000,minMs:10000,maxMs:60000,stepMs:5000},
  13:{project:'central-peripheral',mode:'fixed',rounds:30,fixationMs:800,maskMs:200,presets:{entry:{displayMs:500,distractors:0},middle:{displayMs:350,distractors:3},strong:{displayMs:200,distractors:7}}},
  14:{project:'go-no-go',mode:'fixed-continuous',rounds:120,goCount:96,stimulusMs:600,blankMs:600,windowMs:1200},
  15:{project:'dichotic-digits',mode:'fixed',rounds:30,cueMs:600,audioVersion:AUDIO_VERSION,presets:['left','right','switch']},
  16:{project:'serial-dual-target',mode:'fixed',rounds:30,fixationMs:800,length:12,itemMs:150,shortLags:[2,3],longLags:[5,6]}
 };
 const DIGITS=[1,2,3,4,6,7,8,9],LETTERS=[...'ACEFHKMNPRSTUVWXYZ'];
 const DIRECTIONS=['上','右上','右','右下','下','左下','左','左上'];
 const shuffle=(values,rng=Math.random)=>{const a=[...values];for(let i=a.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
 const median=a=>{if(!a.length)return null;const b=[...a].sort((x,y)=>x-y),m=Math.floor(b.length/2);return b.length%2?b[m]:(b[m-1]+b[m])/2;};
 const deviation=a=>a.length?Math.sqrt(a.reduce((n,x)=>n+(x-a.reduce((n,v)=>n+v,0)/a.length)**2,0)/a.length):null;
 function condition(id,settings={}){if(!CONFIG[id])throw Error('未知训练');const c={ruleVersion:VERSION,...CONFIG[id]};delete c.presets;
  if(id===13){c.preset=Object.prototype.hasOwnProperty.call(CONFIG[id].presets,settings.preset)?settings.preset:'entry';Object.assign(c,CONFIG[id].presets[c.preset]);c.layout='eight-directions-v1';}
  if(id===15)c.preset=CONFIG[id].presets.includes(settings.preset)?settings.preset:'left';
  return c;
 }
 function switchingRules(total,rng){let a;for(let n=0;n<200;n++){a=shuffle(Array.from({length:total},(_,i)=>i<total/2?'parity':'size'),rng);const ratio=a.slice(1).filter((x,i)=>x!==a[i]).length/(total-1);if(ratio>=.4&&ratio<=.6)return a;}return Array.from({length:total},(_,i)=>Math.floor(i/2)%2?'size':'parity');}
 function generate(id,c,rng=Math.random,teaching=false){const total=teaching?({11:8,14:10,15:8}[id]||c.rounds):c.rounds;
  if(id===11){const rules=switchingRules(total,rng);return rules.map((rule,i)=>({rule,value:DIGITS[Math.floor(rng()*DIGITS.length)],switch:i?rule!==rules[i-1]:null}));}
  if(id===12)return [];
  if(id===13)return Array.from({length:total},()=>{const target=Math.floor(rng()*8);return {center:rng()<.5?'circle':'square',target,distractors:shuffle(Array.from({length:8},(_,i)=>i).filter(i=>i!==target),rng).slice(0,c.distractors)};});
  if(id===14)return shuffle(Array.from({length:total},(_,i)=>({go:i<(teaching?8:c.goCount)})),rng);
  if(id===15){const ears=c.preset==='switch'?shuffle(Array.from({length:total},(_,i)=>i<total/2?'left':'right'),rng):Array(total).fill(c.preset);return ears.map(ear=>{const numbers=shuffle([1,2,3,4,5,6,7,8,9],rng);return {ear,left:numbers[0],right:numbers[1]};});}
  const bands=shuffle(Array.from({length:total},(_,i)=>i<total/2?'short':'long'),rng);
  return bands.map(band=>{const pool=band==='short'?c.shortLags:c.longLags,lag=pool[Math.floor(rng()*pool.length)],first=2+Math.floor(rng()*3),second=first+lag,digits=shuffle([2,3,4,5,6,7,8,9],rng).slice(0,2),sequence=Array.from({length:12},()=>LETTERS[Math.floor(rng()*LETTERS.length)]);sequence[first]=String(digits[0]);sequence[second]=String(digits[1]);return {sequence,first,second,lag,band};});
 }
 function breathNext(c,current,streak,answer){if(answer==='held'){streak++;if(streak>=2){current=Math.min(c.maxMs,current+c.stepMs);streak=0;}}else{current=Math.max(c.minMs,current-c.stepMs);streak=0;}return {nextMs:current,streak};}
 function score(id,q,answer,timeout=false){
  if(id===11){const expected=q.rule==='parity'?Number(q.value%2===0):Number(q.value>5);return {correct:!timeout&&answer===expected,timeout,expected};}
  if(id===12)return {report:answer};
  if(id===13){const central=answer?.center===q.center,peripheral=answer?.position===q.target;return {correct:central&&peripheral,central,peripheral};}
  if(id===14){const clicked=answer!==null;return {correct:q.go===clicked,outcome:q.go?(clicked?'hit':'omission'):(clicked?'commission':'inhibition')};}
  if(id===15){const expected=q[q.ear],other=q[q.ear==='left'?'right':'left'];return {correct:answer===expected,outcome:answer===expected?'correct':answer===other?'intrusion':'other',expected};}
  const t1=String(answer?.[0])===q.sequence[q.first],t2=String(answer?.[1])===q.sequence[q.second];return {correct:t1&&t2,t1,t2};
 }
 function cleanQuestion(id,q,c,i,previous){
  if(!q||typeof q!=='object')throw Error('题目无效');
  if(id===11){if(!['parity','size'].includes(q.rule)||!DIGITS.includes(q.value)||q.switch!==(i?q.rule!==previous.rule:null))throw Error('切换题无效');return {rule:q.rule,value:q.value,switch:q.switch};}
  if(id===12){if(!Number.isInteger(q.segmentMs)||q.segmentMs<1||q.segmentMs>60000)throw Error('呼吸段长无效');return {segmentMs:q.segmentMs};}
  if(id===13){if(!['circle','square'].includes(q.center)||!Number.isInteger(q.target)||q.target<0||q.target>7||!Array.isArray(q.distractors)||q.distractors.length!==c.distractors||new Set(q.distractors).size!==c.distractors||q.distractors.some(v=>!Number.isInteger(v)||v<0||v>7||v===q.target))throw Error('周边布局无效');return {center:q.center,target:q.target,distractors:[...q.distractors]};}
  if(id===14){if(typeof q.go!=='boolean')throw Error('刺激无效');return {go:q.go};}
  if(id===15){if(!['left','right'].includes(q.ear)||c.preset!=='switch'&&q.ear!==c.preset||![q.left,q.right].every(x=>Number.isInteger(x)&&x>=1&&x<=9)||q.left===q.right)throw Error('双耳题无效');return {ear:q.ear,left:q.left,right:q.right};}
  if(!Array.isArray(q.sequence)||q.sequence.length!==12||!Number.isInteger(q.first)||q.first<2||q.first>4||!['short','long'].includes(q.band)||!(q.band==='short'?c.shortLags:c.longLags).includes(q.lag)||q.second!==q.first+q.lag||q.second>11)throw Error('串行位置无效');
  if(!q.sequence.every((s,j)=>typeof s==='string'&&(j===q.first||j===q.second?/^[2-9]$/.test(s):LETTERS.includes(s)))||q.sequence[q.first]===q.sequence[q.second])throw Error('串行内容无效');
  return {sequence:[...q.sequence],first:q.first,second:q.second,lag:q.lag,band:q.band};
 }
 function validAnswer(id,a){if(id===11)return a===null||a===0||a===1;if(id===12)return ['held','returned','unsure',null].includes(a);if(id===13)return a&&['circle','square'].includes(a.center)&&Number.isInteger(a.position)&&a.position>=0&&a.position<8;if(id===14)return a===null||a===true;if(id===15)return Number.isInteger(a)&&a>=1&&a<=9;return Array.isArray(a)&&a.length===2&&a.every(x=>typeof x==='string'&&/^[2-9]$/.test(x));}
 function detail(id,c,input,status='complete',device={}){
  if(!['complete','interrupted'].includes(status)||!Array.isArray(input)||input.length>(id===12?20:c.rounds)||status==='complete'&&id!==12&&input.length!==c.rounds)throw Error('轮次无效');
  const results=[];let nextMs=c.initialMs,streak=0,planned=0;
  for(let i=0;i<input.length;i++){
   const raw=input[i],q=cleanQuestion(id,raw.q,c,i,results[i-1]?.q),a=raw.answer;
   if(!validAnswer(id,a)||!Number.isFinite(raw.responseMs)||raw.responseMs<0||raw.responseMs>604800000||typeof raw.invalid!=='boolean'||typeof raw.timeout!=='boolean')throw Error('回答无效');
   if(raw.timeout&&id!==11||id===11&&(raw.responseMs>3000||raw.timeout!==(a===null)))throw Error('超时无效');
   if(id===14&&raw.responseMs>1200||id===14&&a===null&&raw.responseMs!==0)throw Error('窗口无效');
   const durations=raw.durations||[];
   const expectedLength={11:0,12:1,13:1,14:2,15:1,16:12}[id];
   if(!Array.isArray(durations)||durations.length!==expectedLength||durations.some(v=>!Number.isFinite(v)||v<0||v>3600000)||!Number.isFinite(raw.maxGapMs)||raw.maxGapMs<0||raw.maxGapMs>3600000)throw Error('时序无效');
   let invalid=raw.invalid;
   if(id===13)invalid=invalid||raw.maxGapMs>50||durations[0]<c.displayMs-2||durations[0]>c.displayMs+50;
   if(id===16)invalid=invalid||raw.maxGapMs>50||durations.some(ms=>ms<c.itemMs-2||ms>c.itemMs+50);
   if(id===14)invalid=invalid||raw.maxGapMs>50||Math.abs(durations[0]-600)>50||durations[1]<1200-2||durations[1]>1250;
   if(id===12){if(planned>=c.practiceMs||q.segmentMs!==Math.min(nextMs,c.practiceMs-planned))throw Error('自报序列无效');planned+=q.segmentMs;if(a!==null){const n=breathNext(c,nextMs,streak,a);nextMs=n.nextMs;streak=n.streak;}else if(status==='complete'||i!==input.length-1)throw Error('未完成自报');}
   results.push({q,answer:a,responseMs:raw.responseMs,timeout:raw.timeout,invalid,durations:[...durations],maxGapMs:raw.maxGapMs,...score(id,q,a,raw.timeout)});
  }
  if(status==='complete'){
   if(id===12&&planned!==c.practiceMs)throw Error('练习时长不足');
   if(id===11){const count=results.filter(r=>r.q.rule==='parity').length,ratio=results.slice(1).filter(r=>r.q.switch).length/(results.length-1);if(count!==30||ratio<.4||ratio>.6)throw Error('切换比例无效');}
   if(id===14&&results.filter(r=>r.q.go).length!==96)throw Error('Go 比例无效');
   if(id===15&&c.preset==='switch'&&results.filter(r=>r.q.ear==='left').length!==15)throw Error('声道比例无效');
   if(id===16&&results.filter(r=>r.q.band==='short').length!==15)throw Error('间隔比例无效');
  }
  const usable=results.filter(r=>!r.invalid),correct=id===12?null:usable.filter(r=>r.correct).length;
  const cleanDevice={};for(const k of ['width','height','dpr','refreshMs','audioSampleRate'])if(Number.isFinite(device[k])&&device[k]>0&&device[k]<1000000)cleanDevice[k]=device[k];
  return {schema:3,project:c.project,ruleVersion:VERSION,mode:c.mode,params:c,condition:label(id,c),status,results,total:id===12?results.length:c.rounds,validTotal:usable.length,correct,errors:id===12?null:usable.filter(r=>!r.correct).length,seconds:(id===12?results.reduce((n,r)=>n+(r.durations[0]||0),0):results.reduce((n,r)=>n+r.responseMs,0))/1000,device:cleanDevice};
 }
 function cleanDetail(id,d){try{if(!CONFIG[id]||!d||d.schema!==3||d.ruleVersion!==VERSION||d.project!==CONFIG[id].project||!['complete','interrupted'].includes(d.status))return;const c=condition(id,d.params||{});if(JSON.stringify(c)!==JSON.stringify(d.params))return;return detail(id,c,d.results,d.status,d.device);}catch{return;}}
 function label(id,c){if(id===11)return '单双/大小随机切换 · 60 题 · 3 秒';if(id===12)return '自然呼吸 · 累计 3 分钟 · 分段自报';if(id===13)return `八方向 · ${c.displayMs} 毫秒 · ${c.distractors} 个干扰`;if(id===14)return '连续 120 项 · 96 按 / 24 不按 · 1200 毫秒窗口';if(id===15)return ({left:'固定左耳',right:'固定右耳',switch:'提示切换左右耳'}[c.preset])+' · 中文数字';return '12 字符 · 每字符 150 毫秒 · 长短间隔混合';}
 function metrics(id,d){const rs=d.results.filter(r=>!r.invalid),lines=[];
  if(id===11){const switches=rs.filter(r=>r.q.switch===true),holds=rs.filter(r=>r.q.switch===false);const usable=d.results.filter((r,i)=>i>0&&!r.invalid&&r.correct&&!r.timeout&&!d.results[i-1].invalid&&d.results[i-1].correct&&!d.results[i-1].timeout),a=usable.filter(r=>r.q.switch).map(r=>r.responseMs),b=usable.filter(r=>r.q.switch===false).map(r=>r.responseMs);const stats=(name,list)=>name+' '+list.filter(r=>r.correct).length+'/'+list.length;lines.push(stats('切换题',switches),stats('保持题',holds));lines.push(a.length>=10&&b.length>=10?'切换额外时间 '+Math.round(median(a)-median(b))+' 毫秒':'切换时间差：样本不足（每类需 10 个有效试次）');if(a.length)lines.push('切换中位 '+Math.round(median(a))+' 毫秒 / n='+a.length);if(b.length)lines.push('保持中位 '+Math.round(median(b))+' 毫秒 / n='+b.length);}
  if(id===12){for(const [key,title]of [['held','基本保持'],['returned','走神后返回'],['unsure','记不清']])lines.push(title+' '+rs.filter(r=>r.answer===key).length+' 段');lines.push('自报不是自动测量，不按走神次数排名。');}
  if(id===13)lines.push('中心正确 '+rs.filter(r=>r.central).length+'/'+rs.length,'周边正确 '+rs.filter(r=>r.peripheral).length+'/'+rs.length);
  if(id===14){const go=rs.filter(r=>r.q.go),no=rs.filter(r=>!r.q.go),rt=go.filter(r=>r.outcome==='hit').map(r=>r.responseMs);lines.push('漏按 '+go.filter(r=>r.outcome==='omission').length+'/'+go.length,'误按 '+no.filter(r=>r.outcome==='commission').length+'/'+no.length,'正确抑制 '+no.filter(r=>r.outcome==='inhibition').length+'/'+no.length);if(rt.length)lines.push('正确点击中位 '+Math.round(median(rt))+' 毫秒；波动（标准差）'+Math.round(deviation(rt))+' 毫秒');for(const [title,rows]of [['前半段',d.results.slice(0,60)],['后半段',d.results.slice(60)]]){const valid=rows.filter(r=>!r.invalid),g=valid.filter(r=>r.q.go),n=valid.filter(r=>!r.q.go);lines.push(title+'：漏按 '+g.filter(r=>r.outcome==='omission').length+'/'+g.length+'，误按 '+n.filter(r=>r.outcome==='commission').length+'/'+n.length);}}
  if(id===15){for(const ear of ['left','right']){const r=rs.filter(r=>r.q.ear===ear);lines.push((ear==='left'?'左耳':'右耳')+' '+r.filter(x=>x.correct).length+'/'+r.length);}lines.push('干扰耳侵入 '+rs.filter(r=>r.outcome==='intrusion').length+'；其他错误 '+rs.filter(r=>r.outcome==='other').length);}
  if(id===16){for(const band of ['short','long']){const r=rs.filter(r=>r.q.band===band),given=r.filter(r=>r.t1);lines.push((band==='short'?'短间隔':'长间隔')+'：T1 '+given.length+'/'+r.length+'；T1 正确时 T2 '+given.filter(r=>r.t2).length+'/'+given.length);for(const lag of band==='short'?[2,3]:[5,6]){const v=r.filter(x=>x.q.lag===lag),t=v.filter(x=>x.t1);lines.push('  '+lag*150+' 毫秒：T1 '+t.length+'/'+v.length+'；条件 T2 '+t.filter(x=>x.t2).length+'/'+t.length);}}}
  const invalid=d.results.filter(r=>r.invalid).length;if(invalid)lines.push('时序异常 '+invalid+' 题，未计入正常准确率/比较。');
  return lines.join('\n');
 }
 function main(id,d){if(id===12)return '练习 '+d.seconds.toFixed(1)+' 秒 · 自报 '+d.results.filter(r=>r.answer!==null).length+' 段';if(id===14)return '漏按 '+d.results.filter(r=>!r.invalid&&r.outcome==='omission').length+' · 误按 '+d.results.filter(r=>!r.invalid&&r.outcome==='commission').length;return '答对 '+d.correct+' / '+d.validTotal+' 有效题';}
 root.FocusAdvancedRules={VERSION,AUDIO_VERSION,CONFIG,DIRECTIONS,DIGITS,LETTERS,shuffle,median,deviation,condition,generate,breathNext,score,detail,cleanDetail,label,metrics,main};
})(globalThis);
