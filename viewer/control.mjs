import {evaluatePerformance} from './performance.mjs';
import {effectiveEvents,manualIsActive} from './editorial-state.mjs';
export const clamp=(n,lo=0,hi=1)=>Math.min(hi,Math.max(lo,n));
const smoothstep=(a,b,v)=>{const p=clamp((v-a)/(b-a));return p*p*(3-2*p);};
export function sample(feature,channel,seconds) {
  const values=feature?.channels?.[channel];
  if(!values?.length) return 0;
  const at=clamp(seconds*feature.sampleRateHz,0,values.length-1);
  const i=Math.floor(at), b=Math.min(i+1,values.length-1);
  return values[i]+(values[b]-values[i])*(at-i);
}
export function permutation(length,seed) {
  const values=Array.from({length},(_,i)=>i);
  let state=Number(seed)>>>0;
  for(let i=length-1;i>0;i--) {
    state=(Math.imul(state,1664525)+1013904223)>>>0;
    const j=state%(i+1);
    [values[i],values[j]]=[values[j],values[i]];
  }
  return values;
}
export function frameState(frame,config,overrides={}) {
  const s={...config.settings,...overrides};
  const t=clamp(frame/config.fps,0,config.durationSec);
  const rawEvents=s.automationEvents || config.recordedEvents || [],events=effectiveEvents(t,rawEvents);
  const performance=evaluatePerformance(t,events,x=>config.automation?sample(config.automation,'variationClock',x):x);
  const clock=performance.materialClock;
  const time=clock/Math.max(0.5,Number(s.exchangeSec));
  const order=permutation(config.materials.length,s.seed);
  const index=Math.floor(time);
  const current=order[config.materialPolicy==='once'?Math.min(index,order.length-1):index%order.length], next=order[config.materialPolicy==='once'?Math.min(index+1,order.length-1):(index+1)%order.length];
  const f=config.features;
  const bassActivity=clamp(sample(f.bass,'rawRms',t)/0.004);
  const guitarActivity=clamp(sample(f.guitar,'rawRms',t)/0.003);
  const stages=config.visualStages || [];
  const stageTime=config.collageMode?evaluatePerformance(t,events.filter(e=>e.type==='hold')).visualTime:performance.visualTime;
  const stageIndex=Math.max(0,stages.findLastIndex(stage=>stageTime>=stage.startSec));
  const stage=stages[stageIndex],previous=stages[Math.max(0,stageIndex-1)];
  const materialIndex=id=>Math.max(0,config.materials.findIndex(m=>m.id===id));
  const anchorA=stage?materialIndex(previous.materialId):0;
  const anchorB=stage?materialIndex(stage.materialId):0;
  const anchorMix=stageIndex>0?clamp((stageTime-stage.startSec)/(stage.transitionSec || 20)):0;
  const density=config.automation?sample(config.automation,'density',t):0;
  const voice=sample(f.vocal,'rms',t)*clamp(sample(f.vocal,'rawRms',t)/.003)*clamp(Number(s.voiceSpace ?? 1),0,1);
  const ensemble=config.guitarEnsemble;
  const laneCount=sample(ensemble,ensemble?.channels?.softActiveCount?'softActiveCount':'activeCount',t),partCount=sample(ensemble,ensemble?.channels?.softPartCount?'softPartCount':'partCount',t);
  const solo001=sample(ensemble,'solo001',t);
  const guitarDensity=ensemble?ensemble.channels.densityDrive?sample(ensemble,'densityDrive',t):clamp((partCount-1)/4):0;
  const journey=smoothstep(.28,.80,t/config.durationSec);
  const openingCandidate=ensemble?.observations?.introSolo001Candidate;
  const closingCandidate=ensemble?.observations?.outroSolo001Candidate;
  // Retain the intended endpoints through the pre-guitar opening and final decay.
  const openingHold=openingCandidate?1-smoothstep(openingCandidate.startSec,openingCandidate.startSec+2,t):0;
  const closingHold=closingCandidate?smoothstep(closingCandidate.endSec-2,closingCandidate.endSec,t):0;
  const introSolo=ensemble?.channels?.introScene?sample(ensemble,'introScene',t):Math.max(solo001,openingHold)*(1-journey);
  const outroSolo=ensemble?.channels?.outroScene?sample(ensemble,'outroScene',t):Math.max(solo001,closingHold)*journey;
  const movement=ensemble?Number(s.guitarMove ?? 1):1;
  const luminousIndex=materialIndex(config.luminousMaterialId || '');
  return {t,stageTime,manualOverride:manualIsActive(t,rawEvents),seed:Number(s.seed),current,next,phase:time-index,variation:clamp(Number(s.variation)),stageIndex,performance,
    ensembleEnabled:ensemble?1:0,laneCount,partCount,solo001,guitarDensity,introSolo,outroSolo,luminousIndex,
    dynamics:ensemble?clamp(Number(s.dynamics ?? 1.4),0,3):0,
    guitarMove:movement,guitarGlow:ensemble?Number(s.guitarGlow ?? 1):1,
    guitarSpread:ensemble?Number(s.guitarSpread ?? 1):1,
    guitarTrail:ensemble?Number(s.guitarTrail ?? 1):1,
    introDark:ensemble?clamp(Number(s.introDark ?? .85)):0,
    outroLight:ensemble?clamp(Number(s.outroLight ?? .9)):0,
    soloCalm:ensemble?clamp(Number(s.soloCalm ?? .85)):0,
    anchorA,anchorB,anchorMix,density,voice,
    memory:clamp(Number(s.memory || 0)),
    drums:sample(f.drums,'impulse',t)*clamp(sample(f.drums,'rawRms',t)/.008)*clamp(Number(s.drums || 0),0,2),
    piano:sample(f.piano,'rms',t)*clamp(sample(f.piano,'rawRms',t)/.003)*clamp(Number(s.piano || 0),0,2),
    bass:clamp(sample(f.bass,'rms',t)*bassActivity)*clamp(Number(s.bass),0,2),
    bassHit:clamp(sample(f.bass,'impulse',t)*bassActivity)*clamp(Number(s.bass),0,2),
    guitar:clamp((ensemble?sample(ensemble,'energy',t):sample(f.guitar,'rms',t)*guitarActivity))*clamp(Number(s.guitar),0,4),
    guitarHit:clamp(sample(f.guitar,'impulse',t)*guitarActivity)*clamp(Number(s.guitar),0,2),
    pan:sample(ensemble || f.guitar,'pan',t),width:sample(ensemble || f.guitar,ensemble?'spread':'width',t)*clamp(Number(s.guitar),0,4),
    guitarLeft:ensemble?sample(ensemble,'left',t):0,guitarRight:ensemble?sample(ensemble,'right',t):0,
    guitarHigh:ensemble?sample(ensemble,'high',t):0};
}
