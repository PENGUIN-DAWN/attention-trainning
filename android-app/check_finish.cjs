const {chromium}=require('C:/Users/panhu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const {pathToFileURL}=require('node:url');
const path=require('node:path');
const fs=require('node:fs');
const crypto=require('node:crypto');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
 const checks=[];
 try{
  for(const reduced of [false,true]){
   const context=await browser.newContext({viewport:{width:390,height:640},isMobile:true,hasTouch:true});
   const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto(pathToFileURL(path.resolve(__dirname,'assets/index.html')).href+'#train/1');
   await page.locator('#dismissGuide').click();await page.evaluate(r=>{preferences.reduced=r;updateMotion();},reduced);
   const frame=await(await page.locator('iframe').elementHandle()).contentFrame();
   await frame.locator('.training-settings').evaluate(e=>e.open=true);await frame.locator('#mode').selectOption('complete');
   await frame.locator('#start').click();for(let i=1;i<=25;i++)await frame.locator('#grid button').filter({hasText:new RegExp('^'+i+'$')}).click();
   await page.waitForFunction(()=>{const f=frames.get(1),a=f.getBoundingClientRect(),b=f.contentDocument.querySelector('.result-actions').getBoundingClientRect();return a.top+b.bottom<=innerHeight&&a.top+b.top>=0;});
   await frame.locator('#resultNext').click();await page.waitForFunction(()=>activeModule===2&&settledModule===2);assert.ok(await page.evaluate(()=>scrollY<2));
   if(await page.locator('#guideDialog').evaluate(e=>e.open))await page.locator('#dismissGuide').click();
   await page.evaluate(()=>location.hash='#train/1');await page.waitForFunction(()=>activeModule===1&&settledModule===1);
   await frame.locator('.training-settings').evaluate(e=>e.open=true);await frame.locator('#mode').selectOption('challenge');await frame.locator('#again').click();
   await frame.waitForFunction(()=>state.running);await frame.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
   // Exercise the 30s timeout boundary without spending 30 seconds idling.
   await frame.evaluate(()=>{state.started=performance.now()-31000;});
   await frame.waitForFunction(()=>!state.running&&state.records[0]?.reason==='timeout');
   await page.waitForFunction(()=>records.length===2);
   const stored=await page.evaluate(()=>JSON.parse(localStorage.getItem(STORAGE_KEY)));
   assert.equal(stored[0].detail.mode,'challenge');assert.equal(stored[0].detail.seconds,30);
   assert.equal(stored[1].detail.mode,'complete');assert.deepEqual(errors,[]);
   checks.push('390x640 completion actions all visible, next-page scroll stable and challenge timeout boundary; reduced='+reduced);
   await context.close();
  }
  const html=fs.readFileSync(path.resolve(__dirname,'assets/index.html'));
  fs.writeFileSync(path.resolve(__dirname,'../安卓手机版/完成页补充验收-1.2.0.json'),JSON.stringify({checks,html_sha256:crypto.createHash('sha256').update(html).digest('hex')},null,2));
  console.log('PASS:',checks);
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
