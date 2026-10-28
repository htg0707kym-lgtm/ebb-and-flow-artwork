import {permutation} from './control.mjs';
const hash=text=>{let n=2166136261;for(const c of text)n=Math.imul(n^c.charCodeAt(0),16777619);return n>>>0;};
export function collageSpeedEvents(events){return events.flatMap(e=>e.type==='speed'?[e]:e.type==='transition'||e.type==='accelerate'?[{...e,type:'speed',target:'all',rateMode:'hz',rateHz:e.type==='transition'?1:Math.min(12,Math.max(.25,4*e.strength)),seed:hash(e.id)}]:[]);}
export function speedRate(event){const rate=event.rateMode==='bpm'?event.bpm/60*event.division:event.rateHz;return Number.isFinite(rate)&&rate>=.25&&rate<=20?rate:0;}
export function matchesTarget(target,slot){return target==='all'||target===slot||(target==='instruments'&&slot!=='background');}
export function speedTransition(t,events,slot,bank,baseTile=0,{latch=false}={}){
 const neutral={active:false,a:baseTile,b:baseTile,mix:0,weight:0,rateHz:0,step:-1};
 const candidates=events.filter(e=>e.type==='speed'&&matchesTarget(e.target,slot)&&t>=e.timeSec&&(latch||t<e.timeSec+e.durationSec)&&speedRate(e)>0).sort((a,b)=>b.timeSec-a.timeSec||Number(b.target===slot)-Number(a.target===slot)||b.id.localeCompare(a.id));
 const e=candidates[0];if(!e||!bank?.length)return neutral;
 const rate=speedRate(e),elapsed=t-e.timeSec,at=Math.min(elapsed,Math.max(0,e.durationSec-1e-7))*rate,step=Math.floor(at),salt=hash(e.id+'|'+slot);
 const pick=n=>{if(n<0)return baseTile;const cycle=Math.floor(n/bank.length),order=permutation(bank.length,(e.seed^salt^Math.imul(cycle+1,2654435761))>>>0);if(cycle&&bank.length>1){const prior=permutation(bank.length,(e.seed^salt^Math.imul(cycle,2654435761))>>>0);if(order[0]===prior.at(-1))[order[0],order[1]]=[order[1],order[0]];}return bank[order[n%bank.length]];};
 const release=elapsed>=e.durationSec;
 return {active:true,eventId:e.id,a:pick(step),b:pick(step),mix:1,weight:1,rateHz:rate,step,latched:latch&&release};
}
