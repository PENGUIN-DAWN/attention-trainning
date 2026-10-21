/* Portable game, level, score and growth rules. No DOM, storage, clock or Android APIs. */
(function (root) {
  'use strict';
  const RULE_VERSION = 1;
  const COLORS = [{name:'红',ink:'#ff7979'},{name:'蓝',ink:'#71a6ff'},{name:'绿',ink:'#78dba5'},{name:'黄',ink:'#ffe271'},{name:'白',ink:'#ffffff'}];
  const PLANETS = [
    {id:'signal',name:'信号星',subtitle:'看见颜色，接通信号',accent:'#76518e',tint:'#eee2f5',decor:['极光纹理','双子卫星','暮色星云']},
    {id:'gravity',name:'引力星',subtitle:'看清数值，校准引力',accent:'#326d77',tint:'#dceef0',decor:['潮汐纹理','薄荷星环','晨光轨迹']}
  ];
  const LEVELS = PLANETS.flatMap(p => [1,2,3].map((stage,i) => ({
    id:p.id+'-'+stage,planet:p.id,stage,title:['初次着陆','深入探索','干扰挑战'][i],version:RULE_VERSION,total:5,
    conflicts:p.id==='signal'?[3,4,5][i]:undefined,
    sizes:p.id==='gravity'?[[24,26,29,32],[24,29,35,41],[24,32,40,48]][i]:undefined
  })));
  const DECOR = PLANETS.flatMap(p => ['texture','orbital','backdrop'].map((slot,i) => ({id:p.id+'-'+slot,planet:p.id,slot,threshold:[3,6,9][i],name:p.decor[i]})));
  const level = id => LEVELS.find(l => l.id===id);
  const stars = correct => correct>=3?correct-2:0;
  const empty = () => ({schema:1,records:[],progress:{},unlocked:[],equipped:{signal:[],gravity:[]},seen:[],lastLevel:null});
  function shuffle(values, random=Math.random) {
    const a=values.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;
  }
  function generate(id,random=Math.random) {
    const l=level(id);if(!l)throw new Error('关卡不存在');
    if(l.planet==='signal'){
      const inks=shuffle([0,1,2,3,4],random),flags=shuffle(Array.from({length:5},(_,i)=>i<l.conflicts),random);
      return inks.map((ink,i)=>({ink,word:flags[i]?shuffle([0,1,2,3,4].filter(n=>n!==ink),random)[0]:ink}));
    }
    return Array.from({length:5},()=>{
      const values=shuffle([1,2,3,4,5,6,7,8,9],random).slice(0,4),sorted=values.slice().sort((a,b)=>a-b);
      const sizes=shuffle(l.sizes,random);
      if(sorted.every((v,i)=>sizes[values.indexOf(v)]===l.sizes[i]))[sizes[0],sizes[1]]=[sizes[1],sizes[0]];
      return {values,sorted,sizes,colors:shuffle(['#75549a','#326b82','#387957','#9c566b','#876320'],random).slice(0,4)};
    });
  }
  function validRecord(r) {
    return r && level(r.level) && r.ruleVersion===RULE_VERSION && typeof r.id==='string' && r.id.length>0 && r.id.length<=150 && Number.isFinite(r.at) && r.at>0 && r.at<8640000000000000 && r.total===5 && Number.isInteger(r.correct) && r.correct>=0 && r.correct<=5 && Number.isFinite(r.responseMs) && r.responseMs>=0 && r.responseMs<=604800000;
  }
  function cleanRecord(r) { return validRecord(r)?{id:r.id,level:r.level,ruleVersion:RULE_VERSION,at:r.at,correct:r.correct,total:5,responseMs:r.responseMs}:null; }
  function totalStars(state,planet) { return LEVELS.filter(l=>l.planet===planet).reduce((sum,l)=>sum+(state.progress[l.id]?.stars||0),0); }
  function earned(state) { return DECOR.filter(d=>totalStars(state,d.planet)>=d.threshold).map(d=>d.id); }
  function clean(raw) {
    if(!raw||raw.schema!==1)throw new Error('娱乐数据格式无效');
    const next=empty();
    const records=new Map();
    for(const r of Array.isArray(raw.records)?raw.records:[]){const item=cleanRecord(r);if(item&&!records.has(item.id))records.set(item.id,item);}
    next.records=[...records.values()].sort((a,b)=>b.at-a.at).slice(0,200);
    for(const l of LEVELS){
      const p=raw.progress?.[l.id];
      if(!p||p.ruleVersion!==RULE_VERSION||!Number.isInteger(p.stars)||p.stars<0||p.stars>3)continue;
      const best=cleanRecord(p.best);
      next.progress[l.id]={ruleVersion:RULE_VERSION,stars:p.stars};
      if(best&&best.level===l.id&&stars(best.correct)===p.stars)next.progress[l.id].best=best;
    }
    // Known decorations are only valid when backed by the imported progress.
    next.unlocked=earned(next);
    for(const p of PLANETS)next.equipped[p.id]=[...new Set(Array.isArray(raw.equipped?.[p.id])?raw.equipped[p.id]:[])].filter(id=>next.unlocked.includes(id)&&DECOR.some(d=>d.id===id&&d.planet===p.id));
    next.seen=[...new Set(Array.isArray(raw.seen)?raw.seen:[])].filter(id=>PLANETS.some(p=>p.id===id));
    next.lastLevel=level(raw.lastLevel)?raw.lastLevel:null;
    return next;
  }
  function better(a,b) { return !b||a.correct>b.correct||a.correct===b.correct&&a.responseMs<b.responseMs; }
  function merge(current,incoming) {
    const a=clean(current),b=clean(incoming),next=clean(a);
    const records=new Map(a.records.map(r=>[r.id,r]));for(const r of b.records)if(!records.has(r.id))records.set(r.id,r);
    next.records=[...records.values()].sort((x,y)=>y.at-x.at).slice(0,200);
    for(const l of LEVELS){
      const x=a.progress[l.id],y=b.progress[l.id];if(!y)continue;
      if(!x||y.stars>x.stars)next.progress[l.id]=y;
      else if(y.stars===x.stars&&y.best&&better(y.best,x.best))next.progress[l.id]={...x,best:y.best};
    }
    next.unlocked=earned(next);
    for(const p of PLANETS)next.equipped[p.id]=[...new Set([...a.equipped[p.id],...b.equipped[p.id]])].filter(id=>next.unlocked.includes(id));
    next.seen=[...new Set([...a.seen,...b.seen])];next.lastLevel=a.lastLevel||b.lastLevel;
    return clean(next);
  }
  function complete(current,record) {
    const r=cleanRecord(record);if(!r)throw new Error('本轮成绩无效，未保存。');
    const next=clean(current),old=next.progress[r.level];
    if(next.records.some(item=>item.id===r.id)||old?.best?.id===r.id)return {state:next,unlocks:[],duplicate:true,improved:false};
    next.records=[r,...next.records].sort((a,b)=>b.at-a.at).slice(0,200);
    const improved=stars(r.correct)>=(old?.stars||0)&&better(r,old?.best);
    next.progress[r.level]={ruleVersion:RULE_VERSION,stars:Math.max(old?.stars||0,stars(r.correct))};
    if(improved&&stars(r.correct)>= (old?.stars||0))next.progress[r.level].best=r;
    else if(old?.best)next.progress[r.level].best=old.best;
    next.lastLevel=r.level;const previous=new Set(next.unlocked);next.unlocked=earned(next);
    return {state:next,unlocks:next.unlocked.filter(id=>!previous.has(id)),duplicate:false,improved};
  }
  root.FocusArcadeRules={RULE_VERSION,COLORS,PLANETS,LEVELS,DECOR,level,stars,empty,shuffle,generate,validRecord,clean,totalStars,merge,complete,better};
})(globalThis);
