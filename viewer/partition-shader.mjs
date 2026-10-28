import {fragmentShader} from './shaders.mjs';

// Reuse Full v1 verbatim, adding the partition pass before its output transform.
const declarations=`
uniform sampler2D atlas;
uniform sampler2D dawnTexture;
uniform vec4 laneOld[9],laneNew[9],laneSignal[9],laneFastA[9],laneFastB[9],laneFast[9],laneGains[9];
uniform vec4 bassOld,bassNew,voiceOld,voiceNew,bassFastA,bassFastB,voiceFastA,voiceFastB,bassFast,voiceFast,bassGains,voiceGains,backgroundA,backgroundB,backgroundFast;
uniform float accent,build,cutScene,patchOpacity,voiceGain,bassGain,regionSlots[8];
uniform vec4 regionCuts[7],noiseRect,variantA,variantB;
uniform float useEditorialVariants,editorialExposure,pigmentFinish;
uniform float cutCount,cutSlant,noiseAmount,motifGain;
uniform float fxBlackout,fxInvert,fxZoom,fxMirror;
uniform float dawnAmount;
uniform vec4 foundationA,foundationB,guitarPigment,bassPigment;
uniform float motifBlueAmount;
uniform vec4 regionBounds[8];
uniform float motifStudy,releaseGlow;
uniform float viewerMotionTime,viewerWarp,viewerTrail;
uniform sampler2D lyricMask,lyricResidualMask;
uniform float lyricReadable,lyricDistortion,lyricResidue,lyricAge;
uniform sampler2D lyricMemoryMask;
uniform vec2 lyricMemoryAnchor;
uniform float lyricMemoryAmount;
float lyricAlpha(vec2 uv){return texture2D(lyricMask,clamp(uv,0.0,1.0)).a;}
vec2 lyricWarp(vec2 uv){
 vec2 px=vec2(1.0/1536.0,1.0/864.0);
 vec2 slope=vec2(lyricAlpha(uv+vec2(px.x,0.0))-lyricAlpha(uv-vec2(px.x,0.0)),lyricAlpha(uv+vec2(0.0,px.y))-lyricAlpha(uv-vec2(0.0,px.y)));
 return slope*lyricDistortion*.012;
}
vec3 lyricComposite(vec3 color,vec2 uv){
 float lightness=dot(max(color,vec3(0.0)),vec3(.2126,.7152,.0722));
 vec3 ink=mix(vec3(.86,.91,.95),vec3(.055,.12,.19),smoothstep(.28,.60,lightness));
 vec2 drift=vec2(fbm(uv*5.0+time*.035)-.45,fbm(uv*4.3-time*.027)-.45)*.008;
 float blurred=(lyricAlpha(uv+drift+vec2(.0018,0.0))+lyricAlpha(uv+drift-vec2(.0018,0.0))+lyricAlpha(uv+drift+vec2(0.0,.0025))+lyricAlpha(uv+drift-vec2(0.0,.0025)))*.25;
 float remnant=(texture2D(lyricResidualMask,uv+drift).a+texture2D(lyricResidualMask,uv+drift*1.6).a)*.5;
 color=mix(color,ink,remnant*lyricResidue);
 color=mix(color,ink,blurred*lyricDistortion*.45);
 float clear=lyricAlpha(uv);
 // Keep the reading layer intact; erosion is confined to its delayed echo.
 return mix(color,ink,clear*lyricReadable*.9);
}
vec3 atlasPaint(vec4 r,vec2 uv){return texture2D(atlas,r.xy+clamp(uv,vec2(.006),vec2(.994))*r.zw).rgb;}
vec3 regionPaint(vec3 foundation,vec2 uv,vec4 oldR,vec4 newR,vec4 fastA,vec4 fastB,vec4 fast,vec4 gains,vec4 signal){
 vec2 flow=vec2(fbm(uv*4.0+vec2(viewerMotionTime*.09,cutScene)),fbm(uv*3.3-vec2(viewerMotionTime*.07,cutScene)))-.45;
 vec2 ink=uv+flow*(.018+signal.y*.09)*guitarMove;
 ink+=vec2(sin(viewerMotionTime*.19+uv.y*4.0),cos(viewerMotionTime*.13+uv.x*3.0))*signal.y*.018*guitarMove;
 ink+=vec2(sin(uv.y*7.0+viewerMotionTime*.72),cos(uv.x*6.0-viewerMotionTime*.58))*.055*viewerWarp;
 float pigment=fbm(uv*5.0+flow*2.0+cutScene);
 float migration=smoothstep(pigment-.17,pigment+.17,anchorMix*1.4-.2);
 vec3 paint=mix(atlasPaint(oldR,ink),atlasPaint(newR,ink),migration);
 vec3 rush=mix(atlasPaint(fastA,ink)*gains.x,atlasPaint(fastB,ink)*gains.y,fast.x);
 paint=mix(paint,rush,fast.y);
 if(viewerTrail>0.0){
  vec2 echoOffset=vec2(sin(viewerMotionTime*.31+uv.y*3.0),cos(viewerMotionTime*.23-uv.x*2.0))*.065*viewerTrail;
  vec3 echo=atlasPaint(oldR,ink+echoOffset);
  paint=mix(paint,echo,viewerTrail*(.18+signal.y*.16));
 }
 vec3 legacy=paint*(.80+signal.y*.36+signal.z*pigment*.3);
 legacy=mix(legacy,legacy*vec3(.73,.91,1.12),pigment*signal.y*.35);
 float amount=clamp(signal.w*patchOpacity,0.0,1.0);
 // Keep straight region boundaries. Select an opaque region rather than invent
 // organic cutout islands or double-expose two complete pictures.
 float coverage=step(.001,amount);
 if(amount<.001)coverage=0.0;if(amount>.999)coverage=1.0;
 vec3 opaque=paint*(.94+signal.y*.18+signal.z*pigment*.16);
 // Let the foundation's existing white pigment survive a much darker source.
 // This is image-driven knockout, not another translucent layer or random mask.
 float baseLight=dot(foundation,vec3(.2126,.7152,.0722)),paintLight=dot(opaque,vec3(.2126,.7152,.0722));
 if(baseLight>.55&&paintLight<baseLight*.2)opaque=mix(opaque,foundation,.15);
 return mix(mix(foundation,legacy,amount*.85),mix(foundation,opaque,coverage),pigmentFinish);
}
float regionAt(vec2 uv){
 vec2 cutUv=clamp(vec2(uv.x+(uv.y-.5)*cutSlant,uv.y),0.0,1.0);
 float region=0.0;
 ${Array.from({length:7},(_,i)=>`if(cutCount>${i+.5}&&abs(region-regionCuts[${i}].w)<.1&&dot(cutUv,regionCuts[${i}].xy)>regionCuts[${i}].z)region=${i+1}.0;`).join('\n')}
 return region;
}
float ownerAt(float region){
 float slot=regionSlots[0];
 ${Array.from({length:7},(_,i)=>`if(region>${i+.5})slot=regionSlots[${i+1}];`).join('\n')}
 return slot;
}
vec3 materialMark(vec3 color,vec2 uv,float region,float slot){
 if(motifStudy<.5||slot>10.5||(slot>.5&&slot<1.5))return color;
 vec4 bounds=regionBounds[0];
 ${Array.from({length:7},(_,i)=>`if(region>${i+.5})bounds=regionBounds[${i+1}];`).join('\n')}
 vec2 cutUv=vec2(uv.x+(uv.y-.5)*cutSlant,uv.y);
 vec2 q=clamp((cutUv-bounds.xy)/max(bounds.zw,vec2(.01)),0.0,1.0);
 float grain=fbm(q*8.0+vec2(cutScene*.7,0.0));
 float blue=smoothstep(.12,.88,motifBlueAmount),mark=0.0,signal=0.0;
 vec3 pigment=atlasPaint(guitarPigment,uv);
 if(slot<.5){
  // Bass is pressure in a material, not a floating oscilloscope circle.
  float d=length((q-vec2(.48,.54))*vec2(1.0,.82))+(.5-grain)*.10;
  mark=exp(-pow((d-.29)/.045,2.0))*smoothstep(.25,.65,grain+q.x*.2);
  if(motifStudy>1.5)mark=exp(-pow((q.y-.58+(grain-.5)*.12)/.10,2.0))*smoothstep(.02,.3,q.x)*(1.0-smoothstep(.78,1.0,q.x));
  signal=bass*.8+bassHit*.35; pigment=atlasPaint(bassPigment,uv.yx);
 }else{
  float energy=0.0;
  ${Array.from({length:9},(_,i)=>`if(abs(slot-${i+2}.0)<.1)energy=laneSignal[${i}].y;`).join('\n')}
  float path=.48+.13*sin(q.y*4.0+cutScene*.3)+(grain-.5)*.08;
  mark=exp(-pow((q.x-path)/.015,2.0))*smoothstep(.02,.18,q.y)*(1.0-smoothstep(.80,.98,q.y));
  if(motifStudy>1.5)mark=max(mark,exp(-pow((q.x-path-.055)/.006,2.0))*.45);
  signal=energy*.8;
 }
 float amount=clamp(mark*signal*patchOpacity*motifGain,0.0,.85);
 color=mix(color,mix(vec3(.80,.87,.92),pigment,blue),amount);
 return color;
}
vec3 memoryPigment(vec3 color,vec2 uv){
 if(lyricMemoryAmount<=0.0)return color;
 // A fragment belongs to one material region, not a second full-frame subtitle.
 if(abs(regionAt(uv)-regionAt(lyricMemoryAnchor))>.1)return color;
 vec2 drift=vec2(fbm(uv*4.7+time*.017)-.45,fbm(uv*5.1-time*.013)-.45);
 vec2 q=uv+drift*vec2(.018,.032);
 float glyph=(texture2D(lyricMemoryMask,q).a+texture2D(lyricMemoryMask,q+vec2(.0015,-.002)).a)*.5;
 float erosion=smoothstep(.26,.60,fbm(uv*17.0+cutScene*.13));
 float lightness=dot(max(color,vec3(0.0)),vec3(.2126,.7152,.0722));
 vec3 ink=mix(vec3(.52,.64,.76),vec3(.025,.09,.17),smoothstep(.22,.72,lightness));
 return mix(color,ink,glyph*erosion*lyricMemoryAmount);
}
vec3 partitions(vec3 color,vec2 uv){
 float region=regionAt(uv),slot=ownerAt(region);
 if(slot<.5)return materialMark(regionPaint(color,uv,bassOld,bassNew,bassFastA,bassFastB,bassFast,bassGains,vec4(bass,bass,.1,bassGain)),uv,region,slot);
 if(slot<1.5)return regionPaint(color,uv,voiceOld,voiceNew,voiceFastA,voiceFastB,voiceFast,voiceGains,vec4(voice,voice,.2,voiceGain));
 ${Array.from({length:9},(_,i)=>`if(slot<${i+2.5})return materialMark(regionPaint(color,uv,laneOld[${i}],laneNew[${i}],laneFastA[${i}],laneFastB[${i}],laneFast[${i}],laneGains[${i}],laneSignal[${i}]),uv,region,slot);`).join('\n')}
 return color;
}
`;
const output=' gl_FragColor=vec4(clamp(color,0.0,1.0),1.0);';
if(!fragmentShader.includes(output))throw new Error('Full v1 output contract changed');
export const partitionShader=fragmentShader.replace('void main(){',declarations+'\nvoid main(){')
 .replaceAll('time*.045','viewerMotionTime*.045').replaceAll('time*.036','viewerMotionTime*.036')
 .replaceAll('time*.027','viewerMotionTime*.027').replaceAll('time*.02','viewerMotionTime*.02')
 .replaceAll('time*.018','viewerMotionTime*.018').replaceAll('time*.031','viewerMotionTime*.031')
 .replace('color+=vec3(.10,.14,.17)*ring*bass*.22;','')
 .replace('color+=vec3(.18,.22,.25)*arc*lengthMask*(guitar*.30+guitarHit*.15)*guitarGlow*calm;','')
 .replaceAll('readPaint(anchor,warped)','atlasPaint(foundationA,warped)')
 .replaceAll('readPaint(anchorNext,warped)','atlasPaint(foundationB,warped)')
 .replaceAll('readPaint(anchor,echoUv)','atlasPaint(foundationA,echoUv)')
 .replaceAll('readPaint(anchorNext,echoUv)','atlasPaint(foundationB,echoUv)')
 .replace('vec3 a=readPaint(imageA,warped), b=readPaint(imageB,warped);','vec3 a=mix(readPaint(imageA,warped),atlasPaint(variantA,warped),useEditorialVariants), b=mix(readPaint(imageB,warped),atlasPaint(variantB,warped),useEditorialVariants);')
 .replace('vec2 uv=vUv, p=',`vec2 uv=vUv;
 uv=(uv-.5)/(1.0+.6*clamp(fxZoom,0.0,2.0))+.5;
 if(fxMirror>0.0)uv.x=mix(uv.x,abs(uv.x-.5)*2.0,clamp(fxMirror,0.0,1.0));
 uv+=lyricWarp(uv);
 vec2 p=`).replace(output,`
 vec3 rush=mix(atlasPaint(backgroundA,warped)*backgroundFast.z,atlasPaint(backgroundB,warped)*backgroundFast.w,backgroundFast.x);
 color=mix(color,rush,backgroundFast.y);
 color=partitions(color,uv);
 // Reassert the original musical motifs above the region treatment, not below it.
 float blueInk=smoothstep(.12,.88,motifBlueAmount);
 float motifOwner=ownerAt(regionAt(uv));
 float guitarClip=step(1.5,motifOwner)*(1.0-step(10.5,motifOwner))*float(motifStudy<.5);
 float bassClip=(1.0-step(.5,motifOwner))*float(motifStudy<.5);
 float guitarMark=arc*lengthMask*clamp((guitar*.75+guitarHit*.4)*guitarGlow*patchOpacity*motifGain,0.0,1.0)*guitarClip;
 color+=vec3(.18,.22,.25)*guitarMark*(1.0-blueInk);
 vec2 pigmentUv=warped+vec2(fbm(uv*8.0+time*.02)*.07,0.0);
 vec3 guitarInk=atlasPaint(guitarPigment,pigmentUv);
 color=mix(color,guitarInk,guitarMark*blueInk);
 float opening=1.0-smoothstep(36.0,55.0,time);
 float bassMark=ring*clamp(bass*(.65+opening*.75)*patchOpacity*motifGain,0.0,1.0)*bassClip;
 color+=vec3(.10,.14,.17)*bassMark*(1.0-blueInk);
 color=mix(color,atlasPaint(bassPigment,pigmentUv.yx),bassMark*blueInk);
 // Preserve the intro/outro relationship without crushing most of the song.
 float exposure=editorialExposure<1.0?mix(editorialExposure,1.0-(1.0-editorialExposure)*.45,pigmentFinish):editorialExposure;
 color*=exposure;
 if(pigmentFinish>0.0){
  vec3 original=max(color,vec3(0.0));
  float luminance=dot(original,vec3(.2126,.7152,.0722));
  float high=max(original.r,max(original.g,original.b)),low=min(original.r,min(original.g,original.b));
  float saturation=1.0+.18*(1.0-smoothstep(.40,.80,luminance))*(1.0-smoothstep(.25,.75,(high-low)/max(high,.001)));
  vec3 vivid=max(mix(vec3(luminance),original,saturation),vec3(0.0));
  vivid=vivid*1.36+vivid*vivid*.20;
  vivid=mix(vivid,original*1.04,smoothstep(.65,.95,luminance));
  color=mix(color,vivid,pigmentFinish);
 }
 // Brighten existing near-neutral pigment; do not cover blue with flat white.
 float lightness=dot(max(color,vec3(0.0)),vec3(.2126,.7152,.0722));
 float chroma=max(color.r,max(color.g,color.b))-min(color.r,min(color.g,color.b));
 color+=max(vec3(.98)-color,vec3(0.0))*releaseGlow*smoothstep(.18,.8,lightness)*(1.0-smoothstep(.12,.5,chroma));
 // Distinct VJ punches: exposure lift versus an almost-white full-frame hit.
 if(build>0.0)color=mix(color,vec3(1.0)-exp(-max(color,vec3(0.0))*3.8)+vec3(.10,.12,.14),clamp(build,0.0,1.0));
 color=mix(color,vec3(.93,.97,1.0),clamp(accent*.91,0.0,1.0));
 // Temporal noise: the generated image itself, with hard entry and exit.
 if(noiseAmount>0.0)color=mix(color,atlasPaint(noiseRect,uv),clamp(noiseAmount,0.0,1.0));
 if(dawnAmount>0.0)color=mix(color,texture2D(dawnTexture,uv).rgb,clamp(dawnAmount,0.0,1.0));
 color=memoryPigment(color,uv);
 color=lyricComposite(color,vUv);
 color=mix(color,vec3(1.0)-clamp(color,0.0,1.0),clamp(fxInvert,0.0,1.0));
 color*=1.0-clamp(fxBlackout,0.0,1.0);
 ${output}`);
