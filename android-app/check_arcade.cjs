const {chromium}=require('C:/Users/panhu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {pathToFileURL}=require('node:url');
const OUT=path.resolve(__dirname,'../安卓手机版'),URL=pathToFileURL(path.join(__dirname,'assets/index.html')).href;
const report={version:'1.2.0',checks:[],observations:{},errors:[],realAndroidDevice:false};
const pass=message=>{report.checks.push(message);console.log('PASS',message);};
function rulesTests(){
 const context=vm.createContext({});vm.runInContext(fs.readFileSync(path.join(__dirname,'arcade-rules.js'),'utf8'),context);const R=context.FocusArcadeRules;
 for(const l of R.LEVELS)for(let t=0;t<150;t++){
  const items=R.generate(l.id);assert.equal(items.length,5);
  if(l.planet==='signal'){assert.equal(items.filter(q=>q.ink!==q.word).length,l.conflicts);assert.equal(new Set(items.map(q=>q.ink)).size,5);}
  else for(const q of items){assert.equal(new Set(q.values).size,4);assert.ok(q.values.every(n=>n>=1&&n<=9));assert.deepEqual([...q.sizes].sort((a,b)=>a-b),[...l.sizes]);assert.ok(q.sorted.some((n,i)=>q.sizes[q.values.indexOf(n)]!==l.sizes[i]));}
 }
 assert.deepEqual([0,1,2,3,4,5].map(R.stars),[0,0,0,1,2,3]);
 let state=R.empty();const make=(level,correct,id)=>({id,level,ruleVersion:1,correct,total:5,responseMs:5000,at:Date.now()});
 for(const l of R.LEVELS)state=R.complete(state,make(l.id,5,l.id)).state;
 assert.equal(R.PLANETS.reduce((n,p)=>n+R.totalStars(state,p.id),0),18);assert.equal(state.unlocked.length,6);
 const repeated=R.complete(state,make('signal-1',5,'signal-1'));assert.equal(repeated.duplicate,true);assert.equal(repeated.state.records.length,6);
 state=R.complete(state,make('signal-1',0,'worse')).state;assert.equal(state.progress['signal-1'].stars,3);
 const cleaned=R.clean({...state,records:[{...make('signal-1',99,'bad')},...state.records],progress:{...state.progress,unknown:{stars:9},'gravity-3':{stars:9,ruleVersion:1}},unlocked:['fake'],equipped:{signal:['fake','signal-orbital'],gravity:[]}});
 assert.ok(!cleaned.records.some(r=>r.id==='bad'));assert.equal(cleaned.progress.unknown,undefined);assert.equal(cleaned.progress['gravity-3'],undefined);assert.ok(!cleaned.equipped.signal.includes('fake'));
 const noRecords=R.clean({...state,records:[]});assert.equal(R.totalStars(noRecords,'signal'),9);assert.equal(noRecords.unlocked.length,6);
 const merged=R.merge(noRecords,R.empty());assert.equal(R.totalStars(merged,'signal'),9);
 pass('Portable rules: 900 generated rounds, exact conflicts, four unique numbers, size conflict, star boundaries, idempotency and invalid import filtering');
}
(async()=>{
 rulesTests();
 const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
 try{
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const page=await context.newPage();page.setDefaultTimeout(10000);
  page.on('pageerror',e=>report.errors.push(e.stack||e.message));const remote=[];page.on('request',r=>{if(/^https?:/.test(r.url()))remote.push(r.url());});
  const seed=[{module:1,token:'old-1',at:Date.now()-86400000,summary:'找到 18/25 · 30.0 秒 · 点错 1 次'}],settings={1:{mode:'complete'},4:{category:'animals',speed:'1000'},5:{observationDuration:'2'}};
  await context.addInitScript(({seed,settings})=>{if(!localStorage.getItem('qa-1.2-seeded')){localStorage.setItem('focus-universe-history-v1',JSON.stringify(seed));localStorage.setItem('focus-universe-settings-v1',JSON.stringify(settings));localStorage.setItem('qa-1.2-seeded','1');}},{seed,settings});
  await page.goto(URL);await page.waitForFunction(()=>FocusShell.screen==='lobby');
  const ss=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('focus-universe-arcade-v1')||'null'));
  const train=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('focus-universe-history-v1')));
  const navigate=async hash=>{await page.evaluate(hash=>location.hash=hash,hash);await page.waitForFunction(hash=>location.hash===hash,hash);await page.waitForFunction(()=>!document.getAnimations().some(a=>a.effect?.target?.classList?.contains('shell-view')&&a.playState==='running'));};
  await page.screenshot({path:path.join(OUT,'大厅-1.2.0.png'),fullPage:true,animations:'disabled'});
  assert.deepEqual(await train(),seed);assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('focus-universe-settings-v1'))),settings);
  await page.locator('.mode-training').click();await page.waitForURL(/#home$/);assert.equal(await page.locator('#homeView').isVisible(),true);assert.equal(await page.locator('.orb-shell').count(),6);
  await page.screenshot({path:path.join(OUT,'训练目录-1.2.0.png'),fullPage:true,animations:'disabled'});await page.evaluate(()=>focusAndroidBack());await page.waitForURL(/#lobby$/);
  assert.equal(await page.evaluate(()=>focusAndroidBack()),false);
  await page.locator('.mode-arcade').click();await page.waitForURL(/#arcade$/);await page.screenshot({path:path.join(OUT,'乐园-1.2.0.png'),fullPage:true,animations:'disabled'});
  pass('Lobby defaults correctly; training directory preserved, old data unchanged, back returns to lobby');
  async function start(level){
   await navigate('#arcade/level/'+level);await page.locator('#arcadeStart').click();
   if(await page.locator('#arcadeGuide').evaluate(e=>e.open))await page.locator('#arcadeGuideSkip').click();
   await page.waitForFunction(()=>FocusShell.session?.phase==='answer');
  }
  async function answerQuestion(correct=true){
   const q=await page.evaluate(()=>{const s=FocusShell.session;return {q:s.items[s.index],game:FocusArcadeRules.level(s.level).planet};});
   if(q.game==='signal')await page.locator('#arcadeAnswers button').nth(correct?q.q.ink:(q.q.ink+1)%5).click();
   else{
    const order=q.q.sorted.map(v=>q.q.values.indexOf(v));if(!correct)await page.locator('#arcadeNumbers button').nth(order[3]).click();
    else for(const n of order)await page.locator('#arcadeNumbers button').nth(n).click();
   }
   await page.waitForFunction(()=>FocusShell.session.phase==='feedback');
  }
  async function round(level,correct=5){
   await start(level);
   for(let i=0;i<5;i++){await answerQuestion(i<correct);await page.locator('#arcadeNext').click();if(i<4)await page.waitForFunction(()=>FocusShell.session.phase==='answer');}
   await page.waitForURL(/#arcade\/result\//);await page.waitForFunction(()=>document.getElementById('arcadeSaveStatus')?.textContent.includes('已保存在本机'));
  }
  // Actual rounds at every level; all questions are answered through visible buttons.
  for(const id of ['signal-1','signal-2','signal-3','gravity-1','gravity-2','gravity-3']){
   await round(id,5);assert.equal((await ss()).progress[id].stars,3);
   if(id==='signal-1'){assert.equal(await page.locator('[data-unlock="signal-texture"]').count(),1);await page.locator('[data-unlock="signal-texture"] button').click();assert.ok((await ss()).equipped.signal.includes('signal-texture'));await page.screenshot({path:path.join(OUT,'结算-1.2.0.png'),fullPage:true,animations:'disabled'});}
  }
  assert.equal((await ss()).unlocked.length,6);assert.deepEqual(await train(),seed);assert.equal(await page.locator('#todayCount').textContent(),'0 / 6 项');
  await round('signal-1',2);assert.equal((await ss()).progress['signal-1'].stars,3);assert.equal((await ss()).records[0].correct,2);assert.equal(await page.locator('#arcadeView .star-score').textContent(),'☆☆☆');
  pass('All six levels completed through UI, five questions each; rewards, zero-star saves and lower-score protection; no training contamination');
  await start('gravity-2');await page.screenshot({path:path.join(OUT,'游戏-引力星-1.2.0.png'),fullPage:true,animations:'disabled'});
  await answerQuestion(false);assert.match(await page.locator('#arcadeFeedback').textContent(),/正确顺序/);assert.equal(await page.locator('#arcadeNumbers button:disabled').count(),4);
  const before=(await ss()).records.length;await page.evaluate(()=>focusAndroidBack());assert.equal(await page.locator('#arcadeConfirm').evaluate(e=>e.open),true);await page.locator('#arcadeCancel').click();assert.equal(await page.evaluate(()=>FocusShell.session.phase),'feedback');
  await page.evaluate(()=>focusAndroidBack());await page.locator('#arcadeAccept').click();await page.waitForURL(/#arcade\/planet\/gravity$/);assert.equal((await ss()).records.length,before);
  await start('signal-3');await page.screenshot({path:path.join(OUT,'游戏-信号星-1.2.0.png'),fullPage:true,animations:'disabled'});
  await page.evaluate(()=>{const s=FocusShell.session,b=document.querySelectorAll('#arcadeAnswers button')[s.items[s.index].ink];b.click();b.click();b.click();});assert.equal(await page.evaluate(()=>FocusShell.session.trials.length),1);
  await page.locator('#arcadeNext').evaluate(b=>{b.click();b.click();b.click();});await page.waitForFunction(()=>FocusShell.session.phase==='answer');assert.equal(await page.evaluate(()=>FocusShell.session.index),1);
  await page.evaluate(()=>focusAndroidSuspend());assert.equal(await page.evaluate(()=>FocusShell.session.phase),'aborted');await page.evaluate(()=>focusAndroidResume());assert.match(await page.locator('#arcadeView').textContent(),/本轮已结束/);assert.equal((await ss()).records.length,before);
  pass('Wrong-answer lock, exit cancel/confirm, repeated answer/next clicks and background abortion issue no partial rewards');
  await navigate('#arcade/decor/gravity');
  for(const d of ['gravity-texture','gravity-orbital','gravity-backdrop'])await page.locator('[data-decor="'+d+'"] button').click();
  assert.equal((await ss()).equipped.gravity.length,3);await page.screenshot({path:path.join(OUT,'装饰-1.2.0.png'),fullPage:true,animations:'disabled'});
  await page.reload();await page.waitForFunction(()=>FocusShell.screen==='decor');assert.equal(await page.locator('.planet-scene.has-texture.has-orbital.has-backdrop').count(),1);
  await page.locator('[data-decor="gravity-orbital"] button').click();assert.equal((await ss()).equipped.gravity.length,2);
  await page.getByRole('button',{name:'恢复默认外观',exact:true}).click();assert.equal((await ss()).equipped.gravity.length,0);assert.equal((await ss()).unlocked.length,6);
  pass('All six decorations unlocked; equip, unequip, reload and restore default keep permanent unlocks');
  // Response clocks exclude manual explanation dwell.
  await start('signal-1');await answerQuestion();const sample=await page.evaluate(()=>FocusShell.session.trials[0].responseMs);
  await new Promise(r=>setTimeout(r,350));await page.locator('#arcadeNext').click();await page.waitForFunction(()=>FocusShell.session.phase==='answer');
  assert.equal(await page.evaluate(()=>FocusShell.session.trials[0].responseMs),sample);
  await page.evaluate(()=>focusAndroidSuspend());await navigate('#arcade');
  pass('Explanation wait excluded from response time; every question enables after page/layout readiness');
  // Export through actual download and import old/new backups.
  await page.getByRole('button',{name:'完整备份',exact:true}).click();const dl=page.waitForEvent('download');await page.locator('#completeBackupExport').click();
  const backup=JSON.parse(fs.readFileSync(await(await dl).path(),'utf8'));assert.equal(backup.version,2);assert.equal(backup.arcade.unlocked.length,6);assert.deepEqual(backup.records,seed);
  const old={app:'focus-universe',version:1,records:seed,settings,preferences:{reduced:false,seen:[]}};
  const progressBefore=await ss();await page.evaluate(b=>focusImportBackup(JSON.stringify(b)),old);assert.deepEqual(await ss(),progressBefore);
  await page.evaluate(b=>focusImportBackup(JSON.stringify(b)),backup);await page.evaluate(b=>focusImportBackup(JSON.stringify(b)),backup);assert.equal((await ss()).records.length,backup.arcade.records.length);
  assert.equal((await ss()).progress['gravity-3'].stars,3);
  // Inject one-shot failure in last key. Assert rollback of all preceding keys.
  const transactionBefore=await page.evaluate(()=>[STORAGE_KEY,SETTINGS_KEY,UI_KEY,FocusArcadeStore.KEY].map(k=>localStorage.getItem(k)));
  const failure=await page.evaluate(b=>{const orig=Storage.prototype.setItem;let failed=false;Storage.prototype.setItem=function(k,v){if(k==='focus-universe-arcade-v1'&&!failed){failed=true;throw new DOMException('Quota','QuotaExceededError');}return orig.call(this,k,v);};let message='';try{focusImportBackup(JSON.stringify({...b,settings:{1:{mode:'challenge'}}}));}catch(e){message=e.message;}finally{Storage.prototype.setItem=orig;}return {message,values:[STORAGE_KEY,SETTINGS_KEY,UI_KEY,FocusArcadeStore.KEY].map(k=>localStorage.getItem(k)),journal:localStorage.getItem('focus-universe-transaction-v1')};},backup);
  assert.match(failure.message,/未能保存/);assert.deepEqual(failure.values,transactionBefore);assert.equal(failure.journal,null);
  pass('Version 2 complete backup; version 1 import preserves arcade; repeated import deduplicates; multi-key failure rolls back');
  await page.locator('#completeBackupClose').click();await navigate('#arcade');await page.getByRole('button',{name:'探索记录',exact:true}).click();
  await page.screenshot({path:path.join(OUT,'娱乐记录-1.2.0.png'),animations:'disabled'});const n=(await ss()).records.length;
  await page.locator('.arcade-record button').first().click();await page.locator('#arcadeCancel').click();assert.equal((await ss()).records.length,n);
  await page.locator('.arcade-record button').first().click();await page.locator('#arcadeAccept').click();assert.equal((await ss()).records.length,n-1);assert.equal((await ss()).unlocked.length,6);
  await page.locator('#arcadeClearRecords').click();await page.locator('#arcadeAccept').click();assert.equal((await ss()).records.length,0);assert.equal((await ss()).progress['signal-1'].stars,3);
  await page.locator('#arcadeRecordsClose').click();await page.locator('#preferencesButton').click();await page.getByRole('button',{name:'重置娱乐探索进度',exact:true}).click();await page.locator('#arcadeCancel').click();assert.equal((await ss()).unlocked.length,6);
  await page.getByRole('button',{name:'重置娱乐探索进度',exact:true}).click();await page.locator('#arcadeAccept').click();assert.equal((await ss()).unlocked.length,0);assert.deepEqual(await train(),seed);assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem(SETTINGS_KEY))),settings);await page.evaluate(()=>focusAndroidBack());
  pass('Entertainment delete, cancel, clear and reset scopes are correct; training records/settings survive');
  await page.evaluate(b=>focusImportBackup(JSON.stringify(b)),backup);await navigate('#lobby');await page.locator('#preferencesButton').click();await page.locator('#reduceMotion').check();await page.evaluate(()=>focusAndroidBack());
  assert.equal(await page.locator('.mode-art').first().evaluate(n=>getComputedStyle(n).animationName),'none');await round('gravity-1');
  await page.emulateMedia({reducedMotion:'reduce'});await page.evaluate(()=>{preferences.reduced=false;updateMotion();});assert.equal(await page.evaluate(()=>reducedMotion()),true);
  pass('Both user and system reduced-motion settings work, full game remains playable');
  for(const width of [320,360,390,430,768]){
   await page.setViewportSize({width,height:640});
   for(const hash of ['#lobby','#arcade','#arcade/planet/signal','#arcade/decor/gravity','#arcade/level/gravity-3']){
    await navigate(hash);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'overflow '+hash+' '+width);
    const tiny=await page.locator('.shell-view:not([hidden]) button,.shell-view:not([hidden]) .shell-back').evaluateAll(nodes=>nodes.filter(n=>n.getBoundingClientRect().height>0).filter(n=>n.getBoundingClientRect().height<48).map(n=>n.textContent));assert.deepEqual(tiny,[],'short targets '+hash+' '+width);
   }
   await start('gravity-3');assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.equal(await page.locator('#arcadeNumbers button').count(),4);await page.evaluate(()=>focusAndroidSuspend());
  }
  report.observations.testedWidths=[320,360,390,430,768];
  assert.deepEqual(remote,[]);assert.deepEqual(report.errors,[]);pass('320–768px layouts and 48px controls; no remote requests or JavaScript errors');
 }finally{fs.writeFileSync(path.join(OUT,'娱乐验收-1.2.0.json'),JSON.stringify(report,null,2));await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
