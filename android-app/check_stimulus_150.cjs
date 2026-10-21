const {chromium}=require('C:/Users/panhu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('assert/strict'),fs=require('fs'),path=require('path'),os=require('os'),crypto=require('crypto');const {pathToFileURL}=require('url');
const HTML=path.resolve(__dirname,'assets/index.html'),OUT=path.resolve(__dirname,'../安卓手机版');
const report={version:'1.50',checks:[],errors:[],html_sha256:crypto.createHash('sha256').update(fs.readFileSync(HTML)).digest('hex'),comparisons:{}};
const selectors={1:'.cell',2:'.word',3:'.number,.digit',4:'.stage,.stage-icon,.stage-name',5:'.viewport,#word',6:'.display,.parts,.part',7:'canvas',8:'.number-grid button',9:'.object,.object svg,.object span',10:'.char-grid button',11:'#stimulus',12:'#stimulus',13:'#stimulus,.spot',14:'#stimulus,.symbol',16:'#stimulus'};
async function collect(browser,file){
 const c=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});await c.addInitScript(()=>{localStorage.setItem('focus-universe-ui-v1',JSON.stringify({reduced:true,seen:Array.from({length:16},(_,i)=>i+1)}));let seed=1097;Math.random=()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296);});
 const p=await c.newPage();p.on('pageerror',e=>report.errors.push(e.message));await p.goto(pathToFileURL(file).href);const result={};
 for(const id of Object.keys(selectors).map(Number)){
  await p.evaluate(id=>location.hash='#train/'+id,id);await p.waitForFunction(id=>settledModule===id&&frameReady.has(id),id);const f=await(await p.locator('iframe[title^="第'+id+'项"]').elementHandle()).contentFrame();await f.locator('#start').click();
  if(id<=6)await f.waitForFunction(id=>id===4?!['idle','result','countdown'].includes(state.phase):state.running,id).catch(async()=>{if(id!==4)throw Error('start '+id);});
  else if(id<=10)await f.waitForFunction(()=>!['idle','aborted'].includes(toolState.phase));
  else await f.waitForFunction(id=>id===11?advancedState.phase==='answer':id===12?advancedState.phase==='breath':id===13?advancedState.phase==='stimulus':id===14?advancedState.phase==='monitor':advancedState.phase==='stimulus',id);
  result[id]=await f.locator(selectors[id]).evaluateAll(es=>es.map(e=>{const s=getComputedStyle(e);const keys=['color','backgroundColor','fontFamily','fontSize','fontWeight','lineHeight','letterSpacing','borderRadius','borderTopColor','borderTopWidth'];return {tag:e.tagName,...Object.fromEntries(keys.map(k=>[k,s[k]]))};}));
  assert.ok(result[id].length,'no stimulus elements '+id);
 }
 await c.close();return result;
}
(async()=>{const b=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});try{
 const old=await collect(b,path.join(os.homedir(),'.cache/focus-ui150-baseline.html')),current=await collect(b,HTML);
 for(const id of Object.keys(selectors)){assert.deepEqual(current[id],old[id],'Stimulus computed style changed for '+id);report.comparisons[id]={elements:current[id].length,matchedProperties:10};}
 report.checks.push('15 visual projects: deterministic first-trial colors, typefaces, sizes, weights, line heights and field borders/radii match 1.40 computed styles; root chrome differs intentionally');report.checks.push('Dichotic audio content is separately byte-identical in APK verification; no physical display or audio claim');assert.deepEqual(report.errors,[]);console.log('PASS stimulus style compatibility');
}catch(e){report.errors.push(e.stack||e.message);throw e;}finally{fs.writeFileSync(path.join(OUT,'题面兼容验收-1.50.json'),JSON.stringify(report,null,2));await b.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
