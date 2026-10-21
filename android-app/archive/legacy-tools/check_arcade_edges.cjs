const {chromium}=require('C:/Users/panhu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {pathToFileURL}=require('node:url');
const file=path.resolve(__dirname,'assets/index.html'),URL=pathToFileURL(file).href,checks=[];
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
 const errors=[];
 try{
  const context=await browser.newContext({viewport:{width:320,height:640},isMobile:true,hasTouch:true});
  const page=await context.newPage();page.setDefaultTimeout(10000);page.on('pageerror',e=>errors.push(e.message));
  const go=async hash=>{await page.evaluate(hash=>location.hash=hash,hash);await page.waitForFunction(hash=>location.hash===hash,hash);};
  const state=()=>page.evaluate(()=>FocusArcadeStore.state);
  await page.goto(URL+'#arcade/level/signal-1');await page.locator('#arcadeStart').click();
  await page.locator('#arcadeGuideClose').click();assert.deepEqual((await state()).seen,[]);
  await page.locator('#arcadeStart').click();await page.locator('#arcadeGuideStart').click();await page.waitForFunction(()=>FocusShell.session?.phase==='answer');
  const id=await page.evaluate(()=>FocusShell.session.id);await page.evaluate(()=>focusAndroidSuspend());assert.equal(await page.evaluate(()=>FocusShell.session.phase),'aborted');
  await page.getByRole('button',{name:'重新开始',exact:true}).click();await page.waitForFunction(()=>FocusShell.session.phase==='answer');assert.notEqual(await page.evaluate(()=>FocusShell.session.id),id);assert.equal((await state()).records.length,0);
  checks.push('Closing example keeps it available; background restart on the same route generates a fresh playable round');
  await page.evaluate(()=>focusAndroidSuspend());await go('#arcade/level/signal-1');
  await page.locator('#arcadeStart').evaluate(b=>{b.click();b.click();b.click();});await page.waitForFunction(()=>FocusShell.session.phase==='answer');
  const secondId=await page.evaluate(()=>FocusShell.session.id);await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));assert.equal(await page.evaluate(()=>FocusShell.session.id),secondId);
  // Deliberate dwell in response vs explanation, using the page monotonic clock.
  const choose=async correct=>{const ink=await page.evaluate(()=>FocusShell.session.items[FocusShell.session.index].ink);await page.locator('#arcadeAnswers button').nth(correct?ink:(ink+1)%5).click();};
  await page.evaluate(()=>new Promise(r=>setTimeout(r,120)));await choose(true);
  const first=await page.evaluate(()=>FocusShell.session.trials[0].responseMs);assert.ok(first>=110);
  await page.evaluate(()=>new Promise(r=>setTimeout(r,400)));await page.locator('#arcadeNext').click();await page.waitForFunction(()=>FocusShell.session.phase==='answer');
  await choose(true);await page.locator('#arcadeNext').click();await page.waitForFunction(()=>FocusShell.session.phase==='answer');
  await choose(true);await page.locator('#arcadeNext').click();await page.waitForFunction(()=>FocusShell.session.phase==='answer');
  await choose(true);await page.locator('#arcadeNext').click();await page.waitForFunction(()=>FocusShell.session.phase==='answer');
  await page.evaluate(()=>{window.qaStorage=Storage.prototype.setItem;window.qaFailed=false;Storage.prototype.setItem=function(k,v){if(k==='focus-universe-arcade-v1'&&!qaFailed){qaFailed=true;throw new DOMException('Quota','QuotaExceededError');}return qaStorage.call(this,k,v);};});
  await choose(true);await page.locator('#arcadeNext').click();await page.waitForURL(/#arcade\/result/);
  assert.match(await page.locator('#arcadeSaveStatus').textContent(),/保存失败/);assert.equal((await state()).records.length,0);assert.equal((await state()).progress['signal-1'],undefined);
  await page.getByRole('link',{name:'选择关卡',exact:true}).click();assert.equal(await page.locator('#arcadeConfirm').evaluate(d=>d.open),true);await page.locator('#arcadeCancel').click();
  await page.evaluate(()=>Storage.prototype.setItem=qaStorage);await page.getByRole('button',{name:'重试保存',exact:true}).click();assert.match(await page.locator('#arcadeSaveStatus').textContent(),/已保存在本机/);
  assert.equal((await state()).records.length,1);assert.equal((await state()).progress['signal-1'].stars,3);assert.equal((await state()).unlocked.length,1);
  assert.equal((await state()).records[0].responseMs,await page.evaluate(()=>FocusShell.session.trials.reduce((sum,t)=>sum+t.responseMs,0)));
  checks.push('Triple start guarded; actual response dwell recorded, 400ms explanation excluded; failed completion issues no stars, retry saves exactly once');
  // Multi-modal top layer must close before the parent dialog.
  await go('#arcade');await page.getByRole('button',{name:'探索记录',exact:true}).click();await page.locator('.arcade-record button').click();
  await page.evaluate(()=>focusAndroidBack());assert.equal(await page.locator('#arcadeConfirm').evaluate(d=>d.open),false);assert.equal(await page.locator('#arcadeRecords').evaluate(d=>d.open),true);
  await page.locator('#arcadeBackup').click();await page.evaluate(()=>focusAndroidBack());assert.equal(await page.locator('#completeBackup').evaluate(d=>d.open),false);assert.equal(await page.locator('#arcadeRecords').evaluate(d=>d.open),true);
  await page.evaluate(()=>focusAndroidBack());await page.locator('#preferencesButton').click();await page.getByRole('button',{name:'重置娱乐探索进度',exact:true}).click();
  await page.evaluate(()=>focusAndroidBack());assert.equal(await page.locator('#arcadeConfirm').evaluate(d=>d.open),false);assert.equal(await page.locator('#preferencesDialog').evaluate(d=>d.open),true);await page.evaluate(()=>focusAndroidBack());
  checks.push('Native back closes delete/reset confirmation and backup top layer before their underlying dialogs');
  // Interrupted multi-key import: recovery executes before training/arcade state load.
  const before=await page.evaluate(()=>{localStorage.setItem(STORAGE_KEY,JSON.stringify([{module:2,token:'recover',at:Date.now(),summary:'旧版记录'}]));localStorage.setItem(SETTINGS_KEY,JSON.stringify({5:{observationDuration:'1.7'}}));const keys=[STORAGE_KEY,SETTINGS_KEY,UI_KEY,FocusArcadeStore.KEY];const values=keys.map(k=>[k,localStorage.getItem(k)]);localStorage.setItem('focus-universe-transaction-v1',JSON.stringify(values));localStorage.setItem(STORAGE_KEY,'[]');localStorage.setItem(SETTINGS_KEY,'{}');localStorage.setItem(FocusArcadeStore.KEY,JSON.stringify(FocusArcadeRules.empty()));return values;});
  await page.reload();await page.waitForFunction(()=>FocusShell.screen==='home');
  assert.deepEqual(await page.evaluate(keys=>keys.map(([k])=>[k,localStorage.getItem(k)]),before),before);assert.equal(await page.evaluate(()=>localStorage.getItem('focus-universe-transaction-v1')),null);assert.equal((await state()).progress['signal-1'].stars,3);
  const malformed=await page.evaluate(()=>{const old=localStorage.getItem(FocusArcadeStore.KEY);let message;try{focusImportBackup(JSON.stringify({app:'focus-universe',version:2,records:[],arcade:{schema:99}}));}catch(e){message=e.message;}return {message,same:localStorage.getItem(FocusArcadeStore.KEY)===old};});assert.equal(malformed.same,true);assert.match(malformed.message,/格式无效/);
  checks.push('Interrupted transaction restored on reload before state load; malformed arcade backup rejected without writes');
  // Record retention does not control permanent progress or best results.
  const retention=await page.evaluate(()=>{const R=FocusArcadeRules;let s=R.empty();const record=(id,correct)=>({id,level:'signal-1',ruleVersion:1,at:Date.now(),correct,total:5,responseMs:1000});s=R.complete(s,record('first-best',5)).state;for(let i=0;i<220;i++)s=R.complete(s,record('r-'+i,0)).state;return {count:s.records.length,stars:s.progress['signal-1'].stars,best:s.progress['signal-1'].best.id,decor:s.unlocked};});assert.equal(retention.count,200);assert.equal(retention.stars,3);assert.equal(retention.best,'first-best');assert.deepEqual(retention.decor,['signal-texture']);
  checks.push('Over 200 entertainment records retain permanent star progress, unlocks and best result');
  assert.deepEqual(errors,[]);console.log('PASS',checks);
 }finally{
  fs.writeFileSync(path.resolve(__dirname,'../安卓手机版/边界补充验收-1.2.0.json'),JSON.stringify({version:'1.2.0',checks,errors,html_sha256:crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'),realAndroidDevice:false},null,2));await browser.close();
 }
})().catch(e=>{console.error(e);process.exitCode=1;});
