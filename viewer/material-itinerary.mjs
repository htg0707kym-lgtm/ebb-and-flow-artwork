import {matchesTarget,speedRate} from './speed-transition.mjs';
// Precompute in chronological order. No mutable render-time counters: seeking
// and exporting must choose the same image as uninterrupted playback.
export function allocateMaterials(requests,materials,ranking,seed=0){
 const white=new Map((ranking||[]).map(r=>[r.id,r.whiteFraction]));
 const counts=materials.map(()=>0),last=materials.map(()=>-Infinity),assignments=new Map();
 for(const r of requests.slice().sort((a,b)=>a.time-b.time||a.key.localeCompare(b.key))){
  if(assignments.has(r.key))continue;
  const pool=materials.map((m,i)=>({i,d:Math.abs((white.get(m.id)??0)-r.progress)}));
  // Keep the narrative palette; expand the pool well beyond the old nine images.
  const nearby=pool.filter(x=>x.d<=.28),eligible=nearby.length>=8?nearby:pool.sort((a,b)=>a.d-b.d).slice(0,Math.min(16,pool.length));
  eligible.sort((a,b)=>counts[a.i]-counts[b.i] || last[a.i]-last[b.i] || a.d-b.d || (((a.i+seed)>>>0)%materials.length)-(((b.i+seed)>>>0)%materials.length));
  const chosen=eligible[0];if(!chosen)continue;
  assignments.set(r.key,chosen.i);counts[chosen.i]++;last[chosen.i]=r.time;
 }
 return {assignments,counts,requests:assignments.size,unique:counts.filter(Boolean).length,timeline:requests.slice().sort((a,b)=>a.time-b.time||a.key.localeCompare(b.key))};
}
export function buildMaterialItinerary(config,events,progressAt,seed=0,exchange=5){
 const requests=[],slots=['background','bass','vocal',...(config.guitarLaneData?.tracks||[]).map(t=>t.id)];
 const add=(key,time)=>requests.push({key,time,progress:progressAt(time)});
 config.visualStages.forEach((s,scene)=>slots.forEach(slot=>add(`scene:${scene}:${slot}`,s.startSec)));
 for(let i=0;i<config.materials.length;i++)add(`variant:${i}`,Math.min(config.durationSec,i*Math.max(.5,exchange)));
 for(const e of events){
  const rate=speedRate(e);if(!rate)continue;
  const ticks=Math.min(2400,Math.floor(Math.max(0,e.durationSec-1e-7)*rate)+1);
  for(let step=0;step<ticks;step++)for(const slot of slots)if(matchesTarget(e.target,slot))add(`speed:${e.id}:${slot}:${step}`,e.timeSec+step/rate);
 }
 const result=allocateMaterials(requests,config.materials,config.storyPalette?.ranking,seed);
 for(const e of events.filter(e=>e.id.endsWith('-memory'))){
  const quoted=result.assignments.get('scene:0:bass');
  if(quoted!==undefined)for(const key of result.assignments.keys())if(key.startsWith(`speed:${e.id}:`)){const old=result.assignments.get(key);result.counts[old]--;result.counts[quoted]++;result.assignments.set(key,quoted);}
 }
 result.unique=result.counts.filter(Boolean).length;
 return result;
}
