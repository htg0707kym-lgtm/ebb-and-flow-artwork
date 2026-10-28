export const defaultViewerControls=Object.freeze({speed:1,warp:0,trail:0,flow:1,light:1,motif:1});
const bounded=(value,min,max,fallback=1)=>typeof value==='number'&&Number.isFinite(value)?Math.min(max,Math.max(min,value)):fallback;
export function viewerMotion(controls){return {speed:bounded(controls?.speed,0,3),warp:bounded(controls?.warp,0,1,0),trail:bounded(controls?.trail,0,1,0)};}
// Integrate speed changes without jumping phase. Seeks and explicit reset re-anchor.
export function advanceViewerClock(previous,songTime,controls,resetToken=0){
 const {speed}=viewerMotion(controls),dt=previous?songTime-previous.songTime:0;
 const reset=!controls||!previous||previous.resetToken!==resetToken||dt<0||dt>1.5;
 const phase=reset?songTime:previous.speed===1&&previous.phase===previous.songTime?songTime:previous.phase+dt*previous.speed;
 return {songTime,phase,speed,resetToken};
}
export function applyViewerControls(settings,controls){
 if(!controls)return settings;
 const flow=bounded(controls.flow,0,2.5),light=bounded(controls.light,.65,1.3),motif=bounded(controls.motif,0,2);
 if(flow===1&&light===1&&motif===1)return settings;
 return {...settings,guitarMove:Math.min(12,Number(settings.guitarMove??1)*flow),editorialExposure:Math.min(2,Number(settings.editorialExposure??1)*light),motifGain:Math.min(6,Number(settings.motifGain??1)*motif)};
}
