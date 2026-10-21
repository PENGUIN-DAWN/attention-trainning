/* Browser-observed frame timing, not a photodiode/physical-display measurement. */
class FocusFrameClock{
 constructor(){this.generation=0;this.pending=new Map();}
 cancel(){this.generation++;for(const [frame,resolve]of this.pending){cancelAnimationFrame(frame);resolve?.(false);}this.pending.clear();}
 frame(){const gen=this.generation;return new Promise(resolve=>{const frame=requestAnimationFrame(now=>{this.pending.delete(frame);resolve(gen===this.generation?now:false);});this.pending.set(frame,resolve);});}
 async stable(){if(await this.frame()===false)return false;return await this.frame()!==false;}
 async span(draw,duration,onTick){let now=await this.frame();if(now===false)return false;draw?.();const start=now;let previous=now,maxGapMs=0;while(true){now=await this.frame();if(now===false)return false;maxGapMs=Math.max(maxGapMs,now-previous);previous=now;onTick?.(now-start);if(now-start>=duration)return {durationMs:now-start,maxGapMs,invalid:maxGapMs>50||now-start>duration+50};}}
 async series(items,itemMs,draw,onTick,onEnd){let now=await this.frame();if(now===false)return false;const durations=[];let i=0,start=now,previous=now,maxGapMs=0,overallGap=0;draw(items[i],i,start);while(true){now=await this.frame();if(now===false)return false;maxGapMs=Math.max(maxGapMs,now-previous);overallGap=Math.max(overallGap,maxGapMs);previous=now;onTick?.(now-start,i,now);if(now-start>=itemMs){const timing={durationMs:now-start,maxGapMs,invalid:maxGapMs>50||now-start>itemMs+50};durations.push(timing.durationMs);onEnd?.(items[i],i,timing,now);i++;if(i===items.length)return {durations,maxGapMs:overallGap,invalid:durations.some(v=>v>itemMs+50)||overallGap>50};start=now;maxGapMs=0;draw(items[i],i,start);}}}
}
globalThis.FocusFrameClock=FocusFrameClock;
