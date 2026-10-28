import {vertexShader} from './shaders.mjs';
export {vertexShader};
const calls=Array.from({length:9},(_,i)=>`color=paint(color,laneOld[${i}],laneNew[${i}],laneLayout[${i}],laneSignal[${i}].x*layersGain,laneSignal[${i}].y,laneSignal[${i}].z,macroMix);`).join('\n');
export const materialLayerShader=`precision highp float;
varying vec2 vUv;
uniform sampler2D anchor,anchorNext,atlas;
uniform vec4 laneOld[9],laneNew[9],laneLayout[9],laneSignal[9];
uniform vec4 bassOld,bassNew,voiceOld,voiceNew,bassLayout,voiceLayout;
uniform float seed,macroMix,introSolo,outroSolo,introDark,outroLight,soloCalm,guitarDensity,dynamics,guitarMove,guitarGlow,guitarSpread,guitarTrail,bass,vocal,voiceGain,bassGain,layersGain,build,accent;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7))+seed*.001)*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float n=0.0,a=.5;for(int i=0;i<3;i++){n+=a*noise(p);p=mat2(1.7,1.1,-1.1,1.7)*p+vec2(4.7,2.1);a*=.5;}return n;}
vec3 tile(vec4 r,vec2 q){return texture2D(atlas,r.xy+clamp(q,vec2(.005),vec2(.995))*r.zw).rgb;}
vec3 paint(vec3 color,vec4 oldRect,vec4 newRect,vec4 placement,float alpha,float energy,float treble,float blend){
 float calm=1.0-clamp(introSolo+outroSolo,0.0,1.0)*soloCalm*.55;
 vec2 center=placement.xy+vec2(energy*.012*guitarMove*calm,energy*.007*guitarMove*calm);
 float scale=placement.z*(1.0+energy*.04*guitarMove*calm);
 vec2 q=(vUv-center)/scale;float a=placement.w;
 q=mat2(cos(a),sin(a),-sin(a),cos(a))*q+vec2(.5);
 float edge=smoothstep(0.0,.18,q.x)*smoothstep(0.0,.18,q.y)*(1.0-smoothstep(.82,1.0,q.x))*(1.0-smoothstep(.82,1.0,q.y));
 float contour=length((q-.5)*vec2(1.1,1.4))+(fbm(q*5.0+newRect.xy*12.0)-.5)*.4;
 float mask=edge*(1.0-smoothstep(.2,.56,contour))*(.3+.7*fbm(q*4.0));
 vec3 source=mix(tile(oldRect,q),tile(newRect,q),smoothstep(0.0,1.0,blend));
 float bright=dot(source,vec3(.2126,.7152,.0722));
 float opacity=clamp(alpha*mask*(.3+.7*smoothstep(.015,.4,bright))*(1.0+build*.45),0.0,.75);
 vec3 ink=source*(1.0+treble*guitarGlow*.25+guitarDensity*dynamics*.15);
 return mix(color,ink,opacity);
}
void main(){
 vec2 uv=vUv;float field=fbm(uv*4.0);
 float migration=smoothstep(field-.16,field+.16,macroMix*1.3-.15);
 vec3 color=mix(texture2D(anchor,uv).rgb,texture2D(anchorNext,uv).rgb,migration);
 color=paint(color,bassOld,bassNew,bassLayout,bass*.34*bassGain,bass,0.0,macroMix);
 ${calls}
 color=paint(color,voiceOld,voiceNew,voiceLayout,vocal*.48*voiceGain,vocal,.3,macroMix);
 color*=1.0+guitarDensity*dynamics*.20+build*.12;
 color+=max(color-vec3(.06),vec3(0.0))*(1.4*(1.0-exp(-accent)));
 color*=1.0-introSolo*introDark*.88;
 color=mix(color,vec3(.63,.72,.80),outroSolo*outroLight*.66);
 gl_FragColor=vec4(clamp(color,0.0,1.0),1.0);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
}`;
