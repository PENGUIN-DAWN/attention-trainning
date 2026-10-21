/* Presentation-only cleanup: an old abort hint must not accompany a new round/result. */
function installChromeStatus(){
 const notice=document.getElementById('notice'),play=document.getElementById('play'),result=document.getElementById('result');
 if(!notice||!play||!result)return;
 const refresh=()=>{notice.hidden=!play.hidden||!result.hidden;};
 const observer=new MutationObserver(refresh);
 for(const panel of [play,result])observer.observe(panel,{attributes:true,attributeFilter:['hidden']});
 refresh();window.addEventListener('pagehide',()=>observer.disconnect(),{once:true});
}
