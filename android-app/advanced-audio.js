/* Offline mono samples combined into ONE two-channel buffer: shared onset/sample clock. */
class FocusStereoAudio{
 constructor(data){this.data=data;this.context=null;this.buffers={};this.source=null;this.finish=null;this.generation=0;}
 async ensure(){
  if(!this.context){const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)throw Error('此 WebView 不支持离线双声道音频。');this.context=new Audio();}
  await this.context.resume();if(this.context.state!=='running')throw Error('音频未能启动，请主动点击重试。');
  if(!this.buffers[1]){for(let n=1;n<=9;n++){const binary=atob(this.data.clips[n]),bytes=Uint8Array.from(binary,c=>c.charCodeAt(0));const buffer=await this.context.decodeAudioData(bytes.buffer);if(buffer.numberOfChannels!==1)throw Error('数字音频格式无效。');this.buffers[n]=buffer;}}
  return this.context;
 }
 static pair(context,buffers,left,right){const exemplar=buffers[left||right],length=exemplar.length,buffer=context.createBuffer(2,length,exemplar.sampleRate);if(left)buffer.copyToChannel(buffers[left].getChannelData(0),0);if(right)buffer.copyToChannel(buffers[right].getChannelData(0),1);return buffer;}
 stop(){this.generation++;const finish=this.finish;this.finish=null;if(this.source){this.source.onended=null;try{this.source.stop();}catch{}this.source.disconnect();this.source=null;}finish?.(false);}
 async play(left,right){this.stop();const ticket=this.generation;await this.ensure();if(ticket!==this.generation)return false;const ctx=this.context,buffer=FocusStereoAudio.pair(ctx,this.buffers,left,right),source=ctx.createBufferSource();source.buffer=buffer;source.connect(ctx.destination);this.source=source;return await new Promise((resolve,reject)=>{this.finish=resolve;source.onended=()=>{if(this.source!==source)return;this.source=null;this.finish=null;source.disconnect();resolve({durationMs:buffer.duration*1000,sampleRate:buffer.sampleRate,channels:2});};try{source.start(ctx.currentTime+.05);}catch(e){this.stop();reject(e);}});}
 suspend(){this.stop();this.context?.suspend().catch(()=>{});}
}
globalThis.FocusStereoAudio=FocusStereoAudio;
