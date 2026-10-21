async function capture(page,options){await page.waitForTimeout(250);const training=await page.evaluate(()=>location.hash.startsWith('#train/'));return page.screenshot({...options,fullPage:training?false:options.fullPage});}
const { chromium } = require('C:/Users/panhu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const crypto = require('node:crypto');
const {pathToFileURL} = require('node:url');
const OUT=path.resolve(__dirname,'../安卓手机版');
const URL=pathToFileURL(path.join(__dirname,'assets/index.html')).href;
const seedRecords=[{module:1,token:'old-1.0.1-a',at:Date.now()-86400000,summary:'找到 18/25 · 30.0 秒 · 点错 1 次'},{module:5,token:'old-1.0.1-b',at:Date.now()-86400000,summary:'答对 17/20 题 · 观察 1.0 秒'}];
const seedSettings={1:{mode:'complete'},4:{category:'animals',speed:'1000'},5:{observationDuration:'2'}};
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
 const report={version:'1.50',checks:[],observations:{},errors:[],html_sha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(__dirname,'assets/index.html'))).digest('hex')};
 try{
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  await context.addInitScript(({seedRecords,seedSettings})=>{
   if(!localStorage.getItem('qa-migration-seeded')){localStorage.setItem('focus-universe-history-v1',JSON.stringify(seedRecords));localStorage.setItem('focus-universe-settings-v1',JSON.stringify(seedSettings));localStorage.setItem('qa-migration-seeded','yes');}
  },{seedRecords,seedSettings});
  const page=await context.newPage();page.setDefaultTimeout(10000);
  page.on('pageerror',e=>report.errors.push(e.message));
  const remote=[];page.on('request',r=>{if(/^https?:/.test(r.url()))remote.push(r.url());});
  await page.goto(URL+'#home');await page.waitForFunction(()=>!document.getElementById('homeView').classList.contains('home-enter'));
  assert.equal(await page.locator('.orb-shell').count(),16);
  assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('focus-universe-settings-v1'))),seedSettings);
  assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('focus-universe-history-v1'))),seedRecords);
  await capture(page,{path:path.join(OUT,'训练目录-1.50.png'),fullPage:true,animations:'disabled'});
  const visited=new Set();
  async function go(id){
   await page.evaluate(id=>location.hash='#train/'+id,id);
   await page.waitForFunction(id=>activeModule===id&&settledModule===id&&frameReady.has(id),id);
   const guideOpen=await page.locator('#guideDialog').evaluate(e=>e.open);
   if(visited.has(id))assert.equal(guideOpen,false,'guide repeated for module '+id);
   if(guideOpen)await page.locator(id===1?'#skipGuide':'#dismissGuide').click();visited.add(id);
   const handle=await page.locator('iframe[title^="第'+id+'项"]').elementHandle();
   return await handle.contentFrame();
  }
  async function start(f,id){await f.locator('#start').click();await f.waitForFunction(id=>id===4?state.phase!=='idle':state.running,id);}
  async function saved(f){await f.waitForFunction(()=>document.querySelector('.result-status').textContent.includes('已保存在本机'));}
  const storage=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('focus-universe-history-v1')));
  let f;
  if(!process.env.FOCUS_QA_TAIL){
  f=await go(1);assert.equal(await f.locator('#mode').inputValue(),'complete');
  await start(f,1);const colors=await f.locator('#grid button').evaluateAll(nodes=>[...new Set(nodes.map(n=>getComputedStyle(n).color))]);assert.ok(colors.length>=4);
  for(let n=1;n<=25;n++)await f.locator('#grid button').filter({hasText:new RegExp('^'+n+'$')}).click();
  await saved(f);assert.equal((await storage())[0].detail.mode,'complete');assert.equal((await storage())[0].detail.correct,25);
  assert.equal(await f.locator('.result-actions button').count(),3);
  report.checks.push('Schulte 25 colored cells, complete round, structured score and completion actions');console.log('PASS module 1');
  f=await go(2);await start(f,2);
  for(let i=0;i<20;i++){await f.waitForFunction(()=>state.running&&!state.busy);const ink=await f.evaluate(()=>state.items[state.index].ink);if(ink===4)assert.equal(await f.locator('.word.active').evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(44, 59, 61)');await f.locator('#answers button').nth(i===0?(ink+1)%5:ink).click();if(i===0)assert.equal(await f.evaluate(()=>state.errors),1);}
  await saved(f);assert.equal((await storage())[0].detail.correct,19);report.checks.push('Stroop 20 trials, wrong-answer feedback, all actual colors including white remain legible');console.log('PASS module 2');
  f=await go(3);await start(f,3);assert.equal(await f.locator('#numbers button').count(),4);
  assert.equal(await f.locator('.digit').first().evaluate(e=>getComputedStyle(e).color),'rgb(57, 50, 71)');
  await capture(page,{path:path.join(OUT,'训练页-1.50.png'),fullPage:true,animations:'disabled'});
  for(let i=0;i<20;i++){await f.waitForFunction(()=>state.running&&!state.busy);const order=await f.evaluate(()=>state.items[state.index].sorted.map(v=>state.items[state.index].values.indexOf(v)));if(i===0){await f.locator('#numbers button').nth(order[3]).click();assert.equal(await f.evaluate(()=>state.errors),1);}for(const position of order)await f.locator('#numbers button').nth(position).click();}
  await saved(f);assert.equal((await storage())[0].detail.correct,19);report.checks.push('Four-number sorting, all 20 trials, wrong-answer recovery, sizes preserved');console.log('PASS module 3');
  f=await go(4);assert.equal(await f.locator('#category').inputValue(),'animals');assert.equal(await f.locator('#speed').inputValue(),'1000');
  await f.evaluate(()=>{window.qaMemory=[];let phase=state.phase;Object.defineProperty(state,'phase',{get(){return phase},set(value){if(value==='memorize')qaMemory.push({start:performance.now()});if(value==='gap'&&qaMemory.length)qaMemory.at(-1).end=performance.now();phase=value;}});});
  await start(f,4);await f.waitForFunction(()=>state.phase==='recall',null,{timeout:20000});
  const timings=await f.evaluate(()=>qaMemory.map(t=>t.end-t.start));assert.equal(timings.length,6);for(const t of timings)assert.ok(t>=999,'memory interval was shortened: '+t);report.observations.memory1000ms=timings;
  const names=await f.evaluate(()=>state.items.map(item=>item.name));for(const name of names)await f.getByRole('button',{name,exact:true}).click();await f.locator('#submit').click();await saved(f);
  assert.equal((await storage())[0].detail.correct,6);report.checks.push('Six-item animal memory, 1000ms full visibility per item, correct recall');console.log('PASS module 4',timings.map(Math.round));
  f=await go(5);await f.locator('.training-settings').evaluate(d=>d.open=true);await f.locator('#observationDuration').fill('1');await f.locator('#observationDuration').dispatchEvent('change');
  await f.evaluate(()=>{window.qaObservation=[];let phase=state.phase;Object.defineProperty(state,'phase',{get(){return phase},set(value){if(value==='observing')qaObservation.push({start:performance.now()});if(value==='ready'&&qaObservation.length)qaObservation.at(-1).end=performance.now();phase=value;}});});
  await start(f,5);await f.waitForFunction(()=>state.phase==='ready');await f.locator('#replay').click();await f.waitForFunction(()=>state.phase==='ready');
  let intervals=await f.evaluate(()=>qaObservation.filter(t=>t.end).map(t=>t.end-t.start));assert.equal(intervals.length,2);for(const t of intervals)assert.ok(t>=999,'dynamic interval shortened: '+t);report.observations.dynamic1000ms=intervals;
  await f.locator('#stop').click();const beforeFull=(await storage()).length;
  await f.locator('.training-settings').evaluate(d=>d.open=true);await f.locator('#observationDuration').fill('2');await f.locator('#observationDuration').dispatchEvent('change');
  await page.evaluate(()=>{preferences.reduced=true;updateMotion();});
  await start(f,5);await f.waitForFunction(()=>state.phase==='observing');const t0=await f.locator('#word').evaluate(e=>e.style.transform);
  assert.equal(await f.locator('#word').evaluate(e=>getComputedStyle(e).color),'rgb(57, 50, 71)');
  if(await f.evaluate(()=>state.items[state.index].motion!==2))await f.waitForFunction(initial=>document.getElementById('word').style.transform!==initial,t0); // Essential motion survives reduced-animation mode.
  for(let i=0;i<20;i++){await f.waitForFunction(()=>state.phase==='ready');const motion=await f.evaluate(()=>state.items[state.index].motion);await f.locator('#answers button').nth(motion).click();}
  await saved(f);assert.equal((await storage()).length,beforeFull+1);assert.equal((await storage())[0].detail.observationMs,2000);
  intervals=await f.evaluate(()=>qaObservation.filter(t=>t.end).slice(2).map(t=>t.end-t.start));assert.equal(intervals.length,20);for(const t of intervals)assert.ok(t>=1999);report.observations.dynamic2000ms=intervals;
  report.checks.push('Dynamic 1s, replay 1s, all 20 trials at 2s; essential motion works with reduced animations');console.log('PASS module 5',Math.min(...intervals).toFixed(1));
  }else{
   await page.evaluate(()=>{
    for(let id=1;id<=5;id++){
     const raw={found:25,correct:id===4?6:20,perfect:20,completed:20,total:40,seconds:40,errors:0,average:1,mode:'complete',category:'animals',duration:1000,observationMs:2000};
     records.unshift({module:id,token:'tail-fixture-'+id,at:Date.now(),summary:'测试成绩',detail:detailFor(id,raw)});
    }
    localStorage.setItem(STORAGE_KEY,JSON.stringify(records));preferences.reduced=true;updateMotion();updateToday();
   });
   report.checks.push('Targeted tail run: synthetic records only seed record/layout tests; full core suite is separate');
  }
  f=await go(6);await start(f,6);
  assert.equal(await f.locator('.part').first().evaluate(e=>getComputedStyle(e).color),'rgb(57, 50, 71)');
  await f.locator('#answerInput').dispatchEvent('compositionstart');await f.locator('#answerInput').fill('木');await f.locator('#answerInput').press('Enter');assert.equal(await f.evaluate(()=>state.trials.length),0);await f.locator('#answerInput').dispatchEvent('compositionend');
  await page.setViewportSize({width:390,height:420});
  await f.locator('#answerInput').focus();await page.waitForFunction(()=>document.body.classList.contains('keyboard-open'));
  await page.waitForFunction(()=>{const frame=frames.get(6),r=frame.getBoundingClientRect(),field=frame.contentDocument.querySelector('.answer-form').getBoundingClientRect();return r.top+field.bottom<innerHeight+20;});
  await page.setViewportSize({width:390,height:844});
  for(let i=0;i<20;i++){const answer=await f.evaluate(()=>state.items[state.index].answer);await f.locator('#answerInput').fill(answer);await f.locator('#submit').click();if(i<19)await f.locator('#next').click();}
  await saved(f);assert.equal((await storage())[0].detail.correct,20);report.checks.push('20 split-character trials, Chinese composition Enter guard, simulated keyboard inset and input visibility');console.log('PASS module 6');
  await page.evaluate(()=>window.focusAndroidBack());await page.waitForURL(/#home$/);await page.locator('#recordsButton').click();
  assert.equal(await page.locator('.record-row').count(),8);assert.equal(await page.locator('.best-tag').count(),6);
  const conditionCheck=await page.evaluate(()=>{
   const original=records;
   try{
    const make=(token,observationMs,correct)=>({module:5,token,at:Date.now(),summary:'分组测试',detail:{schema:1,correct,total:20,seconds:99,condition:'分组测试',observationMs}});
    records=[...original,make('1s-15',1000,15),make('1s-19',1000,19),make('2s-18',2000,18)];
    const best=bestRecords();return {oneSecondBest:best.has('1s-19'),oneSecondWorse:best.has('1s-15'),twoSecondWorse:best.has('2s-18'),originalStructured:original.filter(r=>r.module===5&&r.detail).every(r=>best.has(r.token))};
   }finally{records=original;}
  });
  assert.deepEqual(conditionCheck,{oneSecondBest:true,oneSecondWorse:false,twoSecondWorse:false,originalStructured:true});
  await page.locator('.record-filter[data-module="5"]').click();assert.equal(await page.locator('.record-row').count(),2);assert.equal(await page.locator('.best-tag').count(),1);
  await page.locator('.record-filter[data-module="0"]').click();await capture(page,{path:path.join(OUT,'训练记录-1.50.png'),animations:'disabled'});
  const downloadEvent=page.waitForEvent('download');await page.locator('#exportBackup').click();const downloaded=JSON.parse(fs.readFileSync(await(await downloadEvent).path(),'utf8'));assert.equal(downloaded.records.length,8);assert.equal(downloaded.records.filter(r=>r.detail).length,6);
  const storedBefore=await storage();let invalid=false;try{await page.evaluate(()=>focusImportBackup('{"app":"wrong","records":[]}'));}catch{invalid=true;}assert.equal(invalid,true);assert.deepEqual(await storage(),storedBefore);
  await page.locator('.record-filter[data-module="5"]').click();const toDelete=await page.locator('.record-row').first().getAttribute('data-token');await page.locator('.record-delete').first().click();await page.locator('#cancelDelete').click();assert.equal((await storage()).length,8);
  await page.locator('.record-delete').first().click();await page.evaluate(()=>{window.qaSetItem=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key==='focus-universe-history-v1')throw new DOMException('Quota','QuotaExceededError');return qaSetItem.call(this,key,value);};});await page.locator('#confirmDelete').click();assert.equal((await storage()).length,8);assert.equal(await page.locator('#deleteRecordsDialog').evaluate(e=>e.open),true);await page.evaluate(()=>Storage.prototype.setItem=qaSetItem);await page.locator('#cancelDelete').click();
  await page.locator('.record-delete').first().click();assert.equal(await page.evaluate(()=>focusAndroidBack()),true);assert.equal(await page.locator('#recordsDialog').evaluate(e=>e.open),true);
  await page.locator('.record-delete').first().click();await page.locator('#confirmDelete').click();assert.equal((await storage()).some(r=>r.token===toDelete),false);assert.equal(await page.locator('.record-row').count(),1);assert.equal(await page.locator('#todayCount').textContent(),'5 / 16 项');
  await page.reload();await page.locator('#recordsButton').click();assert.equal(await page.locator('.record-row').count(),7);assert.equal((await storage()).some(r=>r.token===toDelete),false);
  assert.equal(await page.evaluate(b=>focusImportBackup(JSON.stringify(b)),downloaded),8);assert.equal(await page.evaluate(b=>focusImportBackup(JSON.stringify(b)),downloaded),8);
  assert.equal((await storage()).filter(r=>r.detail).length,6);assert.equal((await storage()).find(r=>r.token==='old-1.0.1-a').detail,undefined);
  await page.locator('.record-filter[data-module="1"]').click();await page.locator('#clearRecords').click();await page.locator('#cancelDelete').click();assert.equal((await storage()).length,8);await page.locator('#clearRecords').click();await page.locator('#confirmDelete').click();assert.equal((await storage()).length,0);assert.equal(await page.locator('#todayCount').textContent(),'0 / 16 项');assert.equal(await page.locator('#clearRecords').isDisabled(),true);assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('focus-universe-settings-v1'))['5'].observationDuration),'2');
  report.checks.push('Old records/settings preserved, structured same-condition best tags, all-project filtering, backup compatibility, import deduplication, deletion/cancel/clear across filters and statistics');
  await page.locator('#closeRecords').click();await page.evaluate(()=>{preferences.seen=[1,2,3,4,5,6];localStorage.setItem('focus-universe-ui-v1',JSON.stringify(preferences));});
  await page.evaluate(()=>window.scrollTo(0,10000));const directoryScroll=await page.evaluate(()=>scrollY);await page.locator('#orb6').evaluate(b=>b.click());await page.waitForFunction(()=>activeModule===6&&settledModule===6);await page.evaluate(()=>focusAndroidBack());await page.waitForURL(/#home$/);await page.waitForFunction(expected=>Math.abs(scrollY-expected)<2,directoryScroll);
  for(let round=0;round<3;round++){await page.evaluate(()=>{location.hash='#train/1';location.hash='#train/3';location.hash='#train/6';});await page.waitForFunction(()=>activeModule===6&&settledModule===6);assert.equal(await page.locator('iframe:not([hidden])').count(),1);await page.evaluate(()=>focusAndroidBack());await page.waitForURL(/#home$/);}
  f=await go(1);await f.locator('#start').evaluate(button=>{button.click();button.click();button.click();});await f.waitForFunction(()=>state.running);await page.evaluate(()=>focusAndroidSuspend());await f.waitForFunction(()=>!state.running);assert.equal((await storage()).length,0);await page.evaluate(()=>focusAndroidResume());assert.equal(await f.locator('#start').isDisabled(),false);
  await page.evaluate(()=>focusAndroidBack());await page.waitForURL(/#home$/);
  for(const width of [320,360,390,430,768]){await page.setViewportSize({width,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);for(let id=1;id<=6;id++){const frame=await go(id);assert.equal(await frame.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'frame overflow '+id+' width '+width);const sizes=await frame.locator('.primary,.secondary').evaluateAll(buttons=>buttons.map(b=>b.getBoundingClientRect().height).filter(h=>h>0));assert.ok(sizes.every(h=>h>=48),'short target '+id+' width '+width+' sizes '+sizes);}await page.evaluate(()=>focusAndroidBack());}
  await page.setViewportSize({width:390,height:844});await page.locator('#preferencesButton').click();await page.locator('#reduceMotion').check();assert.equal(await page.locator('.orb-float').first().evaluate(e=>getComputedStyle(e).animationName),'none');await page.evaluate(()=>focusAndroidBack());await page.emulateMedia({reducedMotion:'reduce'});await page.evaluate(()=>{preferences.reduced=false;updateMotion();});assert.equal(await page.evaluate(()=>document.documentElement.dataset.reduced),'true');
  report.checks.push('Rapid navigation and repeated start, background interruption/resume, 320–768px layouts, 48px primary controls, system and user reduced-motion preferences');
  assert.deepEqual(report.errors,[]);assert.deepEqual(remote,[]);report.checks.push('No JavaScript errors and no HTTP(S) requests during browser tests');
  console.log('PASS: experience acceptance checks');
 }finally{fs.writeFileSync(path.join(OUT,'浏览器验收-1.50'+(process.env.FOCUS_QA_TAIL?'-tail':'')+'.json'),JSON.stringify(report,null,2));await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
