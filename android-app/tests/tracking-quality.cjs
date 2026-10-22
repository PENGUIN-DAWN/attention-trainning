const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');
const {APP,ROOT,VERSION,playwright,browserExecutable}=require('./support.cjs');
const HTML=path.join(APP,'assets/index.html'),OUT=path.join(ROOT,'安卓手机版');
const report={version:VERSION,html_sha256:crypto.createHash('sha256').update(fs.readFileSync(HTML)).digest('hex'),checks:[],errors:[],observations:{}};
(async()=>{
  const browser=await playwright.chromium.launch({executablePath:browserExecutable,headless:true});
  async function open(fallback=false){
    const context=await browser.newContext({viewport:{width:320,height:780},isMobile:true,hasTouch:true});
    await context.addInitScript(()=>localStorage.setItem('focus-universe-ui-v1',JSON.stringify({seen:[7],reduced:false})));
    const page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));
    await page.goto(pathToFileURL(HTML).href+'#train/7');await page.waitForFunction(()=>settledModule===7&&frameReady.has(7));
    const frame=await (await page.locator('iframe').elementHandle()).contentFrame();
    if(fallback)await frame.evaluate(()=>{Element.prototype.animate=undefined;});
    await frame.locator('#start').click();await frame.waitForFunction(()=>toolState.phase==='motion');
    await page.waitForTimeout(180);
    return {context,page,frame};
  }
  try{
    const run=await open();
    const edge=await run.frame.evaluate(()=>{
      const s=getComputedStyle(document.querySelector('.tracking-arena'),'::before');
      return {background:s.backgroundColor,border:s.borderTopWidth,shadow:s.boxShadow,pointerEvents:s.pointerEvents,pixel:[...document.querySelector('canvas').getContext('2d').getImageData(300,300,1,1).data]};
    });
    assert.equal(edge.background,'rgba(0, 0, 0, 0)');assert.equal(edge.border,'1px');assert.equal(edge.pointerEvents,'none');
    assert.deepEqual(edge.pixel,[243,245,250,255]);assert.match(edge.shadow,/5px/);
    await run.page.screenshot({path:path.join(OUT,'小球浅色边缘微光-'+VERSION+'.png')});report.observations.edge=edge;
    report.checks.push('320px layout has a transparent, noninteractive one-pixel border halo with a five-pixel falloff; original field center pixels unchanged');
    await run.page.setViewportSize({width:420,height:844});await run.page.waitForTimeout(150);
    const match=await run.frame.evaluate(()=>{
      const nodes=[...document.querySelectorAll('.tracking-ball')],animations=document.getAnimations().filter(a=>a.effect?.target?.classList.contains('tracking-ball'));
      const plan=new FocusTrackingPlan(toolState.question.balls,toolState.condition.motionMs),out=nodes.map(()=>({}));
      plan.sample(1357,out);const width=document.querySelector('.tracking-layer').getBoundingClientRect().width;
      animations.forEach(a=>{a.pause();a.currentTime=1357;});
      return {count:animations.length,width,errors:nodes.map((n,i)=>{const m=new DOMMatrixReadOnly(getComputedStyle(n).transform);return Math.hypot(m.m41-out[i].x*width,m.m42-out[i].y*width);})};
    });
    assert.equal(match.count,10);assert.ok(match.errors.every(v=>v<.01));report.observations.resized=match;
    await run.page.evaluate(()=>focusAndroidSuspend());
    assert.equal(await run.frame.evaluate(()=>document.getAnimations().filter(a=>a.playState==='running').length),0);
    await run.context.close();
    report.checks.push('All ten native transform animations share the analytic path; resized geometry matches the 1357ms position within .01px and background cancels playback');
    const fallback=await open(true);
    assert.equal(await fallback.frame.evaluate(()=>document.getAnimations().length),0);
    const before=await fallback.frame.locator('.tracking-ball').first().getAttribute('style');
    await fallback.page.waitForTimeout(150);
    const after=await fallback.frame.locator('.tracking-ball').first().getAttribute('style');
    assert.notEqual(before,after);assert.equal(await fallback.frame.evaluate(()=>toolState.phase),'motion');
    await fallback.frame.waitForFunction(()=>toolState.phase==='answer',{},{timeout:20000});
    const labels=await fallback.frame.evaluate(()=>[...document.querySelectorAll('.tracking-ball')].map((n,i)=>({actual:new DOMMatrixReadOnly(n.style.transform).m41,expected:toolState.question.balls[i].x*document.querySelector('.tracking-layer').getBoundingClientRect().width})));
    assert.ok(labels.every(v=>Math.abs(v.actual-v.expected)<.01));await fallback.context.close();
    report.checks.push('Missing Web Animations API preserves sequential entrance and falls back to rAF interpolation of the same path; final answer positions remain exact');
    assert.deepEqual(report.errors,[]);console.log('PASS tracking quality',report.checks.length);
  }catch(error){report.errors.push(error.stack);throw error;}
  finally{fs.writeFileSync(path.join(OUT,'小球流畅度验收-'+VERSION+'.json'),JSON.stringify(report,null,2));await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
