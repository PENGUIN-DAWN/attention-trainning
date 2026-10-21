/* Platform adapter: gameplay rules remain independent of storage and rendering. */
(function(root){
  'use strict';
  const R=root.FocusArcadeRules,KEY='focus-universe-arcade-v1';
  let error=null;
  function read(){
    const raw=localStorage.getItem(KEY);return raw?R.clean(JSON.parse(raw)):R.empty();
  }
  let state;
  try{state=read();}catch(_){state=R.empty();error='娱乐进度未能读取，原数据已保留。请先导出备份，勿直接重置。';}
  function write(next){
    if(error)throw new Error(error);
    const clean=R.clean(next);root.FocusStorage.transaction([[KEY,JSON.stringify(clean)]]);state=clean;return state;
  }
  function refresh(){state=read();error=null;return state;}
  function commit(record){const result=R.complete(read(),record);write(result.state);return result;}
  root.FocusArcadeStore={KEY,get state(){return state;},get error(){return error;},write,refresh,commit,
    merge:raw=>R.merge(state,raw),
    export:()=>{if(error)throw new Error(error);return R.clean(state);},
    markSeen:planet=>write({...state,seen:[...new Set([...state.seen,planet])]}),
    equip:id=>{const d=R.DECOR.find(x=>x.id===id);if(!d||!state.unlocked.includes(id))throw new Error('装饰尚未解锁');const equipped=JSON.parse(JSON.stringify(state.equipped));equipped[d.planet]=equipped[d.planet].includes(id)?equipped[d.planet].filter(x=>x!==id):[...equipped[d.planet],id];return write({...state,equipped});},
    defaultLook:planet=>write({...state,equipped:{...state.equipped,[planet]:[]}}),
    deleteRecord:id=>write({...state,records:id===null?[]:state.records.filter(r=>r.id!==id)}),
    reset:()=>write(R.empty())
  };
})(globalThis);
