import {sample,clamp} from './control.mjs';
function hash(text){let n=2166136261;for(const ch of text)n=Math.imul(n^ch.charCodeAt(0),16777619);return (n>>>0)/4294967295;}
const mix=(a,b,p)=>a+(b-a)*p;
export function layout(id,scene,pan=0){return {x:clamp(.5+pan*.24+(hash(id+scene+'x')-.5)*.26,.15,.85),y:.22+hash(id+scene+'y')*.56,scale:.45+hash(id+scene+'s')*.35,angle:(hash(id+scene+'a')-.5)*1.0};}
export function laneLayers(config,state,settings){
 const scene=state.stageIndex || 0,previous=Math.max(0,scene-1),p=config.collageMode?1:state.anchorMix;
 return (config.guitarLaneData?.tracks || []).map((track,i)=>{
  const feature={sampleRateHz:config.guitarLaneData.sampleRateHz,channels:track.channels};
  const signalTime=state.t+Number(settings.signalOffsetSec??0);
  const activity=sample(feature,'activity',signalTime),energy=sample(feature,'energy',signalTime),high=sample(feature,'high',signalTime);
  const a=layout(track.id,previous,track.meanPan || 0),b=layout(track.id,scene,track.meanPan || 0);
  const assignment=config.layerAssignments?.[scene]?.[track.id],old=config.layerAssignments?.[previous]?.[track.id];
  return {id:track.id,activity,energy,high,oldTile:old??assignment??0,tile:assignment??old??0,
   x:mix(a.x,b.x,p),y:mix(a.y,b.y,p),scale:mix(a.scale,b.scale,p),angle:mix(a.angle,b.angle,p),
   alpha:clamp(activity*(.12+energy*.26)*Number(settings.guitarLayers??1.4),0,.65),index:i};
 });
}
