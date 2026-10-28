import {sample,permutation} from './control.mjs';
export function guitarGroupsAt(config,time){
 const hz=config.guitarLaneData.sampleRateHz,groups=new Map();
 for(const [index,track]of config.guitarLaneData.tracks.entries()){
  const id=track.group||track.id,feature={sampleRateHz:hz,channels:track.channels};
  if(!groups.has(id))groups.set(id,{id,index,members:[],activity:0,energy:0,high:0,pan:track.meanPan||0});
  const group=groups.get(id);group.members.push(track.id);
  group.activity=Math.max(group.activity,sample(feature,'activity',time));
  group.energy=Math.max(group.energy,sample(feature,'energy',time));
  group.high=Math.max(group.high,sample(feature,'high',time));
 }
 return [...groups.values()].sort((a,b)=>b.energy*b.activity-a.energy*a.activity||a.index-b.index);
}
export function audioAnchors(config){
 const drums=config.features.drums,hz=drums.sampleRateHz,a=drums.channels.onset||drums.channels.impulse;
 const positive=a.filter(x=>x>0).sort((a,b)=>a-b),threshold=positive[Math.floor(positive.length*.82)]??Infinity;
 const anchors=[];
 for(let i=1;i<a.length-1;i++)if(a[i]>=threshold&&a[i]>a[i-1]&&a[i]>=a[i+1])anchors.push({timeSec:i/hz,kind:'drum',value:a[i]});
 for(const track of Object.values(config.guitarEnsemble?.tracks||{}))for(const interval of track.activitySummary?.intervals||[])if(interval.durationSec>=.35)anchors.push({timeSec:interval.startSec,kind:'guitar',value:1});
 // A sustained gate is not a single sustained note. Pick attacks inside it too.
 const ghz=config.guitarLaneData.sampleRateHz;
 for(const track of config.guitarLaneData.tracks){
  const energy=track.channels.energy,diff=energy.map((v,i)=>i>1?Math.max(0,v-energy[i-2]):0),rises=diff.filter(x=>x>.015).sort((a,b)=>a-b);
  const edge=Math.max(.035,rises[Math.floor(rises.length*.85)]??Infinity);let last=-1;
  for(let i=2;i<diff.length-1;i++)if(diff[i]>=edge&&diff[i]>diff[i-1]&&diff[i]>=diff[i+1]&&i/ghz-last>.25){anchors.push({timeSec:i/ghz,kind:'guitar-attack',value:diff[i]});last=i/ghz;}
 }
 return anchors.sort((a,b)=>a.timeSec-b.timeSec);
}
export function nearestAnchor(anchors,time,maxDistance=.5){
 return anchors.filter(a=>Math.abs(a.timeSec-time)<=maxDistance).sort((a,b)=>Math.abs(a.timeSec-time)-Math.abs(b.timeSec-time)||a.timeSec-b.timeSec)[0];
}
export function musicalPartitionCues(config){
 const anchors=audioAnchors(config),cues=[{timeSec:0,count:2,seed:270126,kind:'opening'}];
 const add=(a,count)=>{if(a&&!cues.some(c=>Math.abs(c.timeSec-a.timeSec)<.6))cues.push({timeSec:a.timeSec,count,seed:(270126+Math.round(a.timeSec*30)*31)>>>0,kind:a.kind});};
 for(const cue of config.partitionCues||[])if(cue.timeSec>0)add(nearestAnchor(anchors,cue.timeSec,1.2),cue.count);
 // More motion early, but not a cut on every beat. All edges have an audio anchor.
 let last=0;
 for(const a of anchors.filter(a=>a.timeSec<95))if(a.timeSec-last>8){add(a,[3,5,2,4][Math.floor(a.timeSec/8)%4]);last=a.timeSec;}
 for(const a of anchors.filter(a=>a.kind==='guitar'))add(a,4);
 return cues.sort((a,b)=>a.timeSec-b.timeSec);
}
export function musicalOwners(config,cue,seed=0){
 const groups=guitarGroupsAt(config,cue.timeSec+.2).filter(g=>g.activity>.15&&g.energy>.025).slice(0,4);
 const count=Math.min(8,Math.max(cue.count,groups.length+1));
 const owners=groups.map(g=>g.index+2);
 const t=cue.timeSec+.15;
 if(sample(config.features.bass,'rawRms',t)>.0005)owners.push(0);
 if(sample(config.features.vocal,'rawRms',t)>.0005)owners.push(1);
 while(owners.length<count)owners.push(11);
 const chosen=owners.slice(0,count),order=permutation(count,(cue.seed^seed)>>>0);
 return {count,slots:order.map(i=>chosen[i]),groups:groups.map(g=>g.id)};
}
