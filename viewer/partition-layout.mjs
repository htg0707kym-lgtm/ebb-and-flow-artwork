import {permutation} from './control.mjs';
export function partitionLayout(t,config,seedOffset=0){
 const cues=config.partitionCues || [{timeSec:0,count:3,seed:7}];
 const index=Math.max(0,cues.findLastIndex(c=>t>=c.timeSec)),cue=cues[index];
 let seed=(cue.seed^seedOffset)>>>0;const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
 const leaves=[{id:0,x:0,y:0,w:1,h:1}],cuts=[];
 for(let i=0;i<cue.count-1;i++){
  leaves.sort((a,b)=>b.w*b.h-a.w*a.h);
  const leaf=leaves.shift(),vertical=leaf.w/leaf.h>(.8+random()*.4),f=.23+random()*.54;
  const offset=vertical?leaf.x+leaf.w*f:leaf.y+leaf.h*f;
  cuts.push([vertical?1:0,vertical?0:1,offset,leaf.id]);
  const a={...leaf},b={...leaf,id:i+1};
  if(vertical){a.w*=f;b.x=offset;b.w*=1-f;}else{a.h*=f;b.y=offset;b.h*=1-f;}
  leaves.push(a,b);
 }
 return {index,count:cue.count,cuts,regions:Array.from({length:cue.count},(_,id)=>{const r=leaves.find(r=>r.id===id);return [r.x,r.y,r.w,r.h];}),slant:(random()-.5)*.46,order:permutation(8,(cue.seed^seedOffset)>>>0)};
}

// Onset-selected artistic cues, not asserted verse/chorus annotations.
export function makePartitionCues(config){
 const feature=config.features.drums,a=feature.channels.impulse,hz=feature.sampleRateHz;
 const sorted=a.filter(v=>v>0).sort((x,y)=>x-y),threshold=sorted[Math.floor(sorted.length*.72)]??Infinity;
 const counts=[2,5,3,8,2,6,4,7],cues=[];
 for(const [scene,stage]of config.visualStages.entries()){
  cues.push({timeSec:stage.startSec,count:counts[scene%counts.length],seed:270126+scene*811});
  const end=config.visualStages[scene+1]?.startSec??config.durationSec;
  let cursor=stage.startSec+6,turn=scene;
  while(cursor<end-5){
   const window=[9,17,7,23][turn%4];let best=-1;
   for(let i=Math.ceil(cursor*hz);i<Math.min(a.length,Math.floor(Math.min(end-5,cursor+window)*hz));i++)if(a[i]>threshold&&(best<0||a[i]>a[best]))best=i;
   if(best>=0){const timeSec=best/hz;cues.push({timeSec,count:counts[(turn+3)%counts.length],seed:270126+Math.round(timeSec*30)*31});cursor=timeSec+6;}else cursor+=window;
   turn++;
  }
 }
 return cues.sort((a,b)=>a.timeSec-b.timeSec);
}
