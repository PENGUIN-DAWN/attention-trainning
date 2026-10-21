/* Functional tools: portable configuration, generators, scoring and validation. */
(function(root){
 'use strict';
 const VERSION=1;
 const CONFIG={
  7:{key:'multi-object-tracking',rounds:3,presets:{normal:{balls:10,targets:4,markMs:2500,motionMs:6000,speed:.16},strong:{balls:12,targets:5,markMs:2500,motionMs:8000,speed:.18}}},
  8:{key:'duplicate-number',rounds:5,rows:6,cols:6,min:10,max:99,presets:{'15':{limitMs:15000},'12':{limitMs:12000}}},
  9:{key:'missing-objects',rounds:3,count:12,observeMs:8000,maskMs:1000,presets:{one:{missing:1},two:{missing:2}}},
  10:{key:'similar-character',rounds:5,presets:{'8':{limitMs:8000},'6':{limitMs:6000},'5':{limitMs:5000}},grids:{mobile:{rows:6,cols:5},video:{rows:8,cols:10}}}
 };
 // Local vector drawings; names are displayed during study to make free recall unambiguous.
 const OBJECTS=[
  ['apple','苹果',['苹果','红苹果'],'M32 20C12 9 7 32 19 48Q32 59 45 48C57 32 52 9 32 20M32 20V9M32 14Q40 4 47 9Q42 19 32 14'],
  ['key','钥匙',['钥匙','锁匙'],'M27 23a10 10 0 1 1-20 0a10 10 0 1 1 20 0M25 30L51 53M39 42l7-7M45 48l7-7'],
  ['cup','杯子',['杯子','水杯','茶杯'],'M13 19h31v28Q28 59 13 47ZM44 24h6Q63 35 44 42M17 57h31'],
  ['umbrella','雨伞',['雨伞','伞'],'M7 31Q32-7 57 31Q46 21 39 31Q32 21 25 31Q18 21 7 31M32 13v39Q23 64 20 51'],
  ['camera','相机',['相机','照相机'],'M8 21h12l5-9h15l5 9h11v32H8ZM42 36a10 10 0 1 1-20 0a10 10 0 1 1 20 0M46 27h5'],
  ['scissors','剪刀',['剪刀'],'M21 40a9 9 0 1 1-18 0a9 9 0 1 1 18 0M42 48a9 9 0 1 1-18 0a9 9 0 1 1 18 0M19 34L49 6M36 40L15 7M27 28l6 7'],
  ['clock','闹钟',['闹钟','时钟','钟'],'M51 34a19 19 0 1 1-38 0a19 19 0 1 1 38 0M32 21v15l10 5M9 14l12-8M43 6l12 8M18 51l-5 8M45 51l5 8'],
  ['book','书本',['书','书本','图书'],'M32 17Q15 5 6 14v38Q19 44 32 56Q45 44 58 52V14Q47 5 32 17V56M13 23l12 3M39 26l12-3'],
  ['lamp','台灯',['台灯','灯'],'M23 7h18l9 26H14ZM32 33v22M19 57h26'],
  ['hat','帽子',['帽子','礼帽'],'M16 42l6-27h21l5 27M8 43Q32 59 57 43M19 34h27'],
  ['glasses','眼镜',['眼镜'],'M27 36a11 11 0 1 1-22 0a11 11 0 1 1 22 0M59 36a11 11 0 1 1-22 0a11 11 0 1 1 22 0M27 33q5-6 10 0M5 33L9 16M59 33l-4-17'],
  ['hammer','锤子',['锤子','榔头','铁锤'],'M27 26L8 7l10-4l21 13l-3 12ZM31 27L53 51l-8 8L23 34'],
  ['pencil','铅笔',['铅笔','笔'],'M9 43L44 8l12 12L21 55l-17 5ZM14 39l12 12M41 12l12 12M8 48l9 9'],
  ['lock','锁',['锁','锁头','挂锁'],'M12 28h40v29H12ZM21 28V16a11 11 0 0 1 22 0v12M32 39v9'],
  ['spoon','勺子',['勺子','汤匙','匙','调羹'],'M23 27Q4 11 18 5Q38 0 36 24L53 54l-7 5Z'],
  ['shoe','鞋子',['鞋子','鞋','运动鞋'],'M10 21l14 4l7 15l24 3v13H7V25ZM12 47h39M26 33l9-5M31 39l9-5'],
  ['bottle','瓶子',['瓶子','水瓶','瓶'],'M24 6h16v14l7 10v28H17V30l7-10ZM24 15h16M18 37h28'],
  ['leaf','树叶',['树叶','叶子','叶'],'M12 52Q-1 14 55 7Q61 58 12 52ZM8 59L47 17M23 44l-4-16M34 32l14 2']
 ].map(([id,name,aliases,path])=>({id,name,aliases,path}));
 const PAIRS=[{background:'未',target:'末',hint:'“末”的上横较长；“未”的下横较长。'},{background:'末',target:'未',hint:'“未”的下横较长；“末”的上横较长。'},{background:'已',target:'己',hint:'“己”的开口较大，竖弯钩起笔较低；“已”起笔接近上部。'},{background:'己',target:'已',hint:'“已”的竖弯钩起笔接近上部；“己”的开口较大。'}];
 function shuffle(a,rng=Math.random){a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
 function condition(id,settings={}){const c=CONFIG[id];if(!c)throw Error('未知项目');const preset=Object.hasOwn(c.presets,settings.preset)?settings.preset:Object.keys(c.presets)[0];const d={project:c.key,ruleVersion:VERSION,preset,rounds:c.rounds,...c.presets[preset]};if(id===8)Object.assign(d,{rows:6,cols:6,min:10,max:99});if(id===9)Object.assign(d,{count:12,observeMs:8000,maskMs:1000,answerMode:'free-recall'});if(id===10){d.grid=Object.hasOwn(c.grids,settings.grid)?settings.grid:'mobile';Object.assign(d,c.grids[d.grid]);}return d;}
 function generate(id,c,rng=Math.random){
  if(id===7){const ids=Array.from({length:c.balls},(_,i)=>i);return {targets:shuffle(ids,rng).slice(0,c.targets),labels:shuffle(ids.map(i=>i+1),rng),balls:ids.map(i=>({id:i,x:.12+(i%4)*.25,y:.13+Math.floor(i/4)*.31,vx:Math.cos(i*2.4+.3)*c.speed,vy:Math.sin(i*2.4+.3)*c.speed}))};}
  if(id===8){const pool=shuffle(Array.from({length:90},(_,i)=>i+10),rng).slice(0,35);const duplicate=pool[0],values=shuffle([...pool,duplicate],rng);return {values,duplicate,answer:values.flatMap((n,i)=>n===duplicate?[i]:[])};}
  if(id===9){const items=shuffle(OBJECTS,rng).slice(0,12),missing=shuffle(items,rng).slice(0,c.missing),survivors=items.filter(x=>!missing.some(m=>m.id===x.id));let remaining=shuffle(survivors,rng);if(remaining.every((x,i)=>x.id===survivors[i].id))remaining=[...remaining.slice(1),remaining[0]];return {items,missing,remaining};}
  const pair=PAIRS[Math.floor(rng()*PAIRS.length)],answer=Math.floor(rng()*c.rows*c.cols);return {pair,answer,values:Array.from({length:c.rows*c.cols},(_,i)=>i===answer?pair.target:pair.background)};
 }
 const normalize=s=>String(s).normalize('NFKC').trim().replace(/[\s，,。.!！?？]/g,'');
 function score(id,q,answer,timeout=false,skip=false){
  if(id===7){const selected=new Set(answer),hits=q.targets.filter(i=>selected.has(i)).length;return {hits,errors:selected.size-hits,correct:!skip&&hits===q.targets.length&&selected.size===q.targets.length,timeout:false,skip};}
  if(id===8)return {correct:!timeout&&answer.length===2&&q.answer.every(i=>answer.includes(i)),errors:timeout?0:answer.filter(i=>!q.answer.includes(i)).length,timeout,skip:false};
  if(id===9){const used=new Set();let hits=0,errors=0;for(const text of answer){const n=normalize(text);if(!n)continue;const item=q.missing.find(x=>x.aliases.some(a=>normalize(a)===n));if(item&&!used.has(item.id)){used.add(item.id);hits++;}else errors++;}return {correct:!skip&&hits===q.missing.length&&errors===0,hits,errors,timeout:false,skip};}
  return {correct:!timeout&&answer===q.answer,errors:timeout?0:Number(answer!==q.answer),timeout,skip:false};
 }
 // Equal-radius disks, reflective walls and pair separation; array identity never changes.
 function step(balls,dt){const r=.044;dt=Math.min(.025,Math.max(0,dt));for(const b of balls){b.x+=b.vx*dt;b.y+=b.vy*dt;for(const axis of ['x','y'])if(b[axis]<r||b[axis]>1-r){b[axis]=Math.max(r,Math.min(1-r,b[axis]));b['v'+axis]*=-1;}}for(let k=0;k<3;k++)for(let i=0;i<balls.length;i++)for(let j=i+1;j<balls.length;j++){const a=balls[i],b=balls[j],dx=b.x-a.x,dy=b.y-a.y,dist=Math.hypot(dx,dy);if(dist<2*r){const nx=dist?dx/dist:1,ny=dist?dy/dist:0,push=(2*r-dist)/2+.0001;a.x-=nx*push;a.y-=ny*push;b.x+=nx*push;b.y+=ny*push;const v=(b.vx-a.vx)*nx+(b.vy-a.vy)*ny;if(v<0){a.vx+=v*nx;a.vy+=v*ny;b.vx-=v*nx;b.vy-=v*ny;}for(const p of [a,b]){p.x=Math.max(r,Math.min(1-r,p.x));p.y=Math.max(r,Math.min(1-r,p.y));}}}return balls;}
 function detail(id,c,results,status='complete'){
  const correct=results.filter(r=>r.correct).length,seconds=results.reduce((n,r)=>n+r.responseMs,0)/1000;
  return {schema:2,ruleVersion:VERSION,project:CONFIG[id].key,mode:c.preset,params:c,condition:label(id,c),correct,total:c.rounds,errors:results.reduce((n,r)=>n+r.errors,0),seconds,status,results};
 }
 function label(id,c){if(id===7)return `${c.balls} 球 / ${c.targets} 目标 · 标记 ${c.markMs/1000} 秒 · 运动 ${c.motionMs/1000} 秒 · 速度 ${c.speed}`;if(id===8)return `6×6 · 两位数 · ${c.limitMs/1000} 秒`;if(id===9)return `12 件 / 缺 ${c.missing} 件 · 观察 8 秒 · 自由回忆`;return `${c.rows}×${c.cols} · ${c.limitMs/1000} 秒 · 末/未、己/已`;} 
 function cleanDetail(id,d){
  if(!CONFIG[id]||!d||d.schema!==2||d.ruleVersion!==VERSION||d.project!==CONFIG[id].key)return;
  const c=condition(id,{preset:d.params?.preset,grid:d.params?.grid});
  if(JSON.stringify(c)!==JSON.stringify(d.params)||d.total!==c.rounds||!['complete','interrupted'].includes(d.status)||!Array.isArray(d.results)||d.results.length>c.rounds||d.status==='complete'&&d.results.length!==c.rounds)return;
  const results=[];
  for(const r of d.results){
   if(!r||typeof r.correct!=='boolean'||typeof r.timeout!=='boolean'||typeof r.skip!=='boolean'||!Number.isFinite(r.responseMs)||r.responseMs<0||r.responseMs>604800000||!Number.isInteger(r.errors)||r.errors<0||r.errors>20||!Number.isInteger(r.hits??0)||(r.hits??0)<0||(r.hits??0)>12)return;
   if(r.skip&&id!==9||r.timeout&&![8,10].includes(id)||r.correct&&(r.timeout||r.skip))return;
   if(c.limitMs&&r.responseMs>c.limitMs)return;
   if(id===7&&((r.hits??0)+r.errors!==c.targets||r.correct!==((r.hits??0)===c.targets&&r.errors===0)))return;
   if(id===9&&((r.hits??0)+r.errors>c.missing||r.correct!==(!r.skip&&(r.hits??0)===c.missing&&r.errors===0)))return;
   if(id===8&&(r.errors>2||r.correct!==(!r.timeout&&r.errors===0)))return;
   if(id===10&&(r.errors>1||r.correct!==(!r.timeout&&r.errors===0)||!PAIRS.some(p=>r.pair===p.background+'/'+p.target)))return;
   results.push({correct:r.correct,timeout:r.timeout,skip:r.skip,errors:r.errors,hits:r.hits??0,responseMs:r.responseMs,...(typeof r.pair==='string'&&r.pair.length<=5?{pair:r.pair}:{})});
  }
  return detail(id,c,results,d.status);
 }
 root.FocusToolRules={VERSION,CONFIG,OBJECTS,PAIRS,shuffle,condition,generate,score,step,detail,label,cleanDetail};
})(globalThis);
