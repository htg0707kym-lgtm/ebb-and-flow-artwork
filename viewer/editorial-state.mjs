const limits={patchOpacity:[0,1],variation:[0,.8],memory:[0,.8],exchangeSec:[.5,12],motifGain:[0,3],editorialExposure:[.2,1.5],guitarMove:[0,6],guitarGlow:[0,6],guitarLayers:[0,3],vocalLayer:[0,3],bassLayers:[0,3],whiteProgress:[0,1],signalOffsetSec:[-2,2]};
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
export function editorialGroup(type){return type==='speed'?'speed':['noise','dawn'].includes(type)?'insert':['build','accent','blackout'].includes(type)?'light':'transform';}
export function prepareEditorial(settings){
 const state=settings.editorialState,plan=state?.plans?.find(p=>p.id===state.selectedPlanId),enabled=Boolean(state?.enabled&&plan),active=Boolean(enabled&&state.amount>0);
 const manual=(settings.automationEvents||[]).filter(e=>!state||state.manualEnabled||e.origin==='manual-live');
 const sections=plan?.sections.slice().sort((a,b)=>a.timeSec-b.timeSec)||[];
 const events=active?plan.events.filter(e=>e.enabled!==false&&sections.findLast(s=>s.timeSec<=e.timeSec)?.enabled!==false&&state.typeEnabled[editorialGroup(e.type)]!==false).map(e=>({...e,origin:'editorial',strength:clamp(e.strength*(e.type==='dawn'?1:state.amount),0,3),...(e.type==='speed'?{rateMode:'hz',rateHz:clamp((e.rateMode==='bpm'?e.bpm/60*e.division:e.rateHz)*(e.id.includes('-transient20-')?1:state.amount),.25,20)}:{})})):[];
 return {state,plan,active,events:[...events,...manual]};
}
export function editorialSettingsAt(settings,prepared,t){
 const {state,plan,active,events}=prepared;
 if(!active)return {...settings,automationEvents:events};
 const sections=plan.sections.filter(s=>s.enabled!==false).slice().sort((a,b)=>a.timeSec-b.timeSec);
 const index=sections.findLastIndex(s=>s.timeSec<=t),current=sections[index],previous=sections[index-1];
 const u=current&&index>0?clamp((t-current.timeSec)/4,0,1):1,p=u*u*(3-2*u),result={...settings,automationEvents:events};
 for(const [key,[min,max]]of Object.entries(limits)){
  if(state.typeEnabled.settings===false&&key!=='whiteProgress')continue;
  if(key==='whiteProgress'&&state.typeEnabled.palette===false){delete result.whiteProgress;continue;}
  const base=plan.settings[key]??settings[key]??(key==='editorialExposure'?1:undefined);
  if(base===undefined)continue;
  if(key==='whiteProgress'){
   const next=sections[index+1],a=current?.settings[key]??base,b=next?.settings[key]??a;
   const progress=current&&next?clamp((t-current.timeSec)/(next.timeSec-current.timeSec),0,1):0;
   const ease=progress*progress*(3-2*progress);result[key]=clamp(a+(b-a)*ease,min,max);continue;
  }
  const a=previous?.settings[key]??base,b=current?.settings[key]??base,value=a+(b-a)*p;
  result[key]=clamp((settings[key]??base)+(value-(settings[key]??base))*state.amount,min,max);
 }
 if(state.typeEnabled.settings===false)return result;
 result.seed=plan.seed;result.editorialMaterialSeed=plan.seed;result.editorialLayoutSeed=plan.seed;
 result.editorialSection=current?.id;result.editorialPlan=plan.id;
 return result;
}
export function manualIsActive(t,events){return events.some(e=>e.origin!=='editorial'&&e.strength>0&&t>=e.timeSec&&t<e.timeSec+e.durationSec);}
export function effectiveEvents(t,events){return manualIsActive(t,events)?events.filter(e=>e.origin!=='editorial'):events;}
