const clamp=(v,a=0,b=1)=>Math.min(b,Math.max(a,v));
const smooth=v=>{const p=clamp(v);return p*p*(3-2*p);};
export function evaluatePerformance(t,events=[],clockAt=x=>x){
 const safe=events.filter(e=>Number.isFinite(e.timeSec)&&Number.isFinite(e.durationSec)&&e.durationSec>0).slice().sort((a,b)=>a.timeSec-b.timeSec);
 const holds=[];
 for(const e of safe.filter(e=>e.type==='hold')){const a=e.timeSec,b=a+e.durationSec,last=holds.at(-1);if(last&&a<=last[1])last[1]=Math.max(last[1],b);else holds.push([a,b]);}
 const stopped=holds.reduce((sum,[a,b])=>sum+Math.max(0,Math.min(t,b)-a),0);
 const heldClock=clockAt(t)-holds.reduce((sum,[a,b])=>sum+(t>a?clockAt(Math.min(t,b))-clockAt(a):0),0);
 let materialClock=heldClock;
 let build=0,accent=0,transition=0,noise=0,noiseId='',dawn=0,dawnId='';
 const effects={blackout:0,invert:0,zoom:0,mirror:0};
 const integral=(e,x)=>{const u=clamp((x-e.timeSec)/e.durationSec);return e.strength*2*e.durationSec*(u-Math.sin(2*Math.PI*u)/(2*Math.PI));};
 for(const e of safe){
  const u=(t-e.timeSec)/e.durationSec;if(u<0)continue;
  if(Object.hasOwn(effects,e.type) && t<e.timeSec+e.durationSec)effects[e.type]=Math.max(effects[e.type],clamp(e.strength,0,3));
  if(e.type==='build' && t<e.timeSec+e.durationSec)build=Math.max(build,clamp(e.strength,0,3));
  if(e.type==='accent' && t<e.timeSec+e.durationSec)accent=Math.max(accent,clamp(e.strength,0,3));
  if(e.type==='noise' && t<e.timeSec+e.durationSec){const amount=clamp(e.strength,0,3);if(amount>=noise){noise=amount;noiseId=e.id;}}
  if(e.type==='dawn' && t<e.timeSec+e.durationSec){const amount=clamp(e.strength,0,3);if(amount>=dawn){dawn=amount;dawnId=e.id;}}
  if(e.type==='accelerate')materialClock+=integral(e,t)-holds.reduce((sum,[a,b])=>sum+(t>a?integral(e,Math.min(t,b))-integral(e,a):0),0);
  if(e.type==='transition')transition+=72*clamp(e.strength,0,3)*smooth(u);
 }
 return {materialClock,visualTime:Math.max(0,t-stopped+transition+(materialClock-heldClock)*4),build,accent,noise,noiseId,dawn,dawnId,effects,held:holds.some(([a,b])=>t>=a&&t<b)};
}
