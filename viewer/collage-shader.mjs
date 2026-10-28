const laneCalls=Array.from({length:9},(_,i)=>`color=collagePatch(color,laneOld[${i}],laneNew[${i}],laneFastA[${i}],laneFastB[${i}],laneLayout[${i}],laneSignal[${i}],laneShape[${i}],laneFast[${i}],laneGains[${i}]);`).join('\n');
export const collageShader=`precision highp float;
varying vec2 vUv;
uniform sampler2D anchor,anchorNext,atlas;
uniform vec4 laneOld[9],laneNew[9],laneFastA[9],laneFastB[9],laneLayout[9],laneSignal[9],laneShape[9],laneFast[9],laneGains[9];
uniform vec4 bassOld,bassNew,voiceOld,voiceNew,bassLayout,voiceLayout,bassShape,voiceShape,bassFastA,bassFastB,voiceFastA,voiceFastB,bassFast,voiceFast,bassGains,voiceGains,backgroundA,backgroundB,backgroundFast;
uniform float time,seed,macroMix,bass,vocal,voiceGain,bassGain,guitarMove,guitarGlow,guitarDensity,dynamics,build,accent,introSolo,outroSolo,introDark,outroLight,backgroundMotion,edgeFeather,patchOpacity;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7))+seed*.001)*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float n=0.0,a=.5;for(int i=0;i<3;i++){n+=a*noise(p);p=mat2(1.7,1.1,-1.1,1.7)*p+vec2(4.7,2.1);a*=.5;}return n;}
vec3 tile(vec4 r,vec2 q){return texture2D(atlas,r.xy+clamp(q,vec2(.006),vec2(.994))*r.zw).rgb;}
float cutMask(vec2 q,float shape,float key){vec2 p=q-.5;float d;
 p.x+=.12*(noise(vec2(p.y*5.0,key))-.5);p.y+=.10*(noise(vec2(p.x*6.0,key+8.0))-.5);
 if(shape<.5)d=abs(p.x)*.8+abs(p.y)*1.15-.43;
 else if(shape<1.5)d=max(abs(p.y-.09*sin(p.x*7.0))-.14,abs(p.x)-.47);
 else if(shape<2.5)d=max(max(p.y*.8+p.x*.7-.23,p.y*.8-p.x*.7-.23),-p.y-.35);
 else if(shape<3.5)d=max(abs(p.x)-.40,abs(p.y)-.32)+(fbm(q*8.0)-.45)*.14;
 else if(shape<4.5)d=length(p*vec2(1.0,1.3))-.39+(fbm(q*6.0)-.45)*.07;
 else d=max(abs(p.y+p.x*.45)-.17,abs(p.x)-.46)+(noise(q*18.0)-.5)*.04;
 d+=(fbm(q*(5.0+mod(key,5.0))+key)-.45)*.13;
 return 1.0-smoothstep(-edgeFeather,edgeFeather,d);}
vec3 collagePatch(vec3 color,vec4 oldR,vec4 newR,vec4 fastA,vec4 fastB,vec4 place,vec4 signal,vec4 shape,vec4 fast,vec4 gains){
 vec2 center=place.xy;
 float scale=place.z;
 vec2 q=(vUv-center)/scale;float a=place.w;q=mat2(cos(a),sin(a),-sin(a),cos(a))*q+.5;
 float mask=cutMask(q,shape.y,shape.z);
 vec2 flow=vec2(fbm(q*4.0+vec2(time*.17,shape.z)),fbm(q*5.0-vec2(time*.13,shape.z)))-.45;
 vec2 inkUv=q+flow*(.012+signal.y*.065)*guitarMove;
 vec3 regular=mix(tile(oldR,inkUv),tile(newR,inkUv),smoothstep(0.0,1.0,macroMix));
 vec3 rushing=mix(tile(fastA,inkUv)*gains.x,tile(fastB,inkUv)*gains.y,fast.x);
 vec3 source=mix(regular,rushing,fast.y);
 float coverage=mask*smoothstep(.02,.65,signal.x)*patchOpacity;
 float pigment=fbm(q*6.0+flow*2.0+shape.z);
 source*=.88+signal.y*.25+signal.z*guitarGlow* pigment*.28+build*.12;
 source=mix(source,source*vec3(.72,.88,1.13),clamp(pigment*signal.y*.35,0.0,.3));
 return mix(color,source,clamp(coverage,0.0,1.0));}
void main(){vec2 uv=vUv;
 vec2 drift=(vec2(fbm(uv*3.0+vec2(time*.015,0)),fbm(uv*3.7-vec2(0,time*.012)))-.45)*backgroundMotion*.009;
 vec2 bgUv=clamp((uv-.5)*.985+.5+drift,vec2(.002),vec2(.998));
 float field=fbm(uv*4.0+vec2(time*.008,0.0));
 float migration=smoothstep(field-.16,field+.16,macroMix*1.3-.15);
 vec3 color=mix(texture2D(anchor,bgUv).rgb,texture2D(anchorNext,bgUv).rgb,migration);
 vec3 burst=mix(tile(backgroundA,bgUv)*backgroundFast.z,tile(backgroundB,bgUv)*backgroundFast.w,backgroundFast.x);
 color=mix(color,burst,backgroundFast.y);
 color=collagePatch(color,bassOld,bassNew,bassFastA,bassFastB,bassLayout,vec4(clamp(bass*bassGain*4.0,0.0,1.0),bass,0,0),bassShape,bassFast,bassGains);
 ${laneCalls}
 color=collagePatch(color,voiceOld,voiceNew,voiceFastA,voiceFastB,voiceLayout,vec4(clamp(vocal*voiceGain*3.0,0.0,1.0),vocal,.2,0),voiceShape,voiceFast,voiceGains);
 color*=1.0+guitarDensity*dynamics*.12;
 color+=max(color-.06,vec3(0))*(1.4*(1.0-exp(-accent)));
 color*=1.0-introSolo*introDark*.88;color=mix(color,vec3(.63,.72,.80),outroSolo*outroLight*.66);
 gl_FragColor=vec4(clamp(color,0.0,1.0),1);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
}`;
