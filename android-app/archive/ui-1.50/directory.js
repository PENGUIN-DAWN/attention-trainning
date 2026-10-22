function buildDirectory(){
 const accents=['#a8d8c0','#c6b8f3','#a3d9e9','#e3b8cd','#9fc9fc','#e5cea6','#b2c8ee','#a6dccb','#e7cca4','#cbb9ed','#a9c9f2','#afd9b7','#e5cca9','#c6b8e8','#a3d3de','#deb8d1'];
 modules.forEach((module,index)=>{
  const link=document.createElement('a');link.href='#train/'+module.id;link.className='orb-shell training-card';link.id='orb'+module.id;
  link.setAttribute('aria-label','第'+module.id+'项，'+module.title+'，进入训练');link.style.setProperty('--card-accent',accents[index]);
  link.innerHTML='<div class="orb-float"><div class="bubble"><span class="orb-number">'+String(module.id).padStart(2,'0')+'</span><svg class="orb-icon" viewBox="0 0 64 64" aria-hidden="true">'+icons[index]+'</svg><h2>'+module.title+'</h2><p>'+module.short+'</p><span class="card-meta" id="cardMeta'+module.id+'">尚未开始</span><span class="enter">进入训练 <span aria-hidden="true">↗</span></span><span class="visit-mark" aria-label="今日已完成">✓</span></div></div>';
  $('bubbleField').appendChild(link);
  const tab=document.createElement('a');tab.className='module-tab';tab.href=link.hash;tab.id='tab'+module.id;
  tab.innerHTML='<span>'+String(module.id).padStart(2,'0')+'</span>'+module.title;$('moduleTabs').appendChild(tab);
 });
 for(let i=0;i<16;i++)$('todayProgress').appendChild(document.createElement('i'));
}
function updateDirectoryDetails(){
 for(const module of modules){const last=records.find(r=>r.module===module.id);$('cardMeta'+module.id).textContent=last?'最近练习 · '+new Intl.DateTimeFormat('zh-CN',{month:'numeric',day:'numeric',timeZone:'Asia/Shanghai'}).format(new Date(last.at)):'尚未开始';}
 const latest=records[0];$('recentCard').hidden=!latest;
 if(latest){$('recentCard').href='#train/'+latest.module;$('recentTitle').textContent=modules[latest.module-1].title;}
}
