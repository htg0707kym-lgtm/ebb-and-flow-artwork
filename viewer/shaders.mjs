export const vertexShader=`varying vec2 vUv;
void main(){vUv=uv;gl_Position=vec4(position.xy,0.0,1.0);}`;
export const fragmentShader=`
precision highp float;
varying vec2 vUv;
uniform sampler2D anchor, anchorNext, imageA, imageB,luminous;
uniform float time, seed, phase, variation, bass, bassHit, guitar, guitarHit, pan, stereoWidth;
uniform float anchorMix,density,voice,memory,drums,piano;
uniform float ensembleEnabled,guitarDensity,introSolo,outroSolo,dynamics,guitarMove,guitarGlow,guitarSpread,guitarTrail,introDark,outroLight,soloCalm,guitarLeft,guitarRight,guitarHigh;
uniform vec2 resolution;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7))+seed*.001)*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float n=0.0,a=.5;for(int i=0;i<4;i++){n+=a*noise(p);p=mat2(1.7,1.1,-1.1,1.7)*p+vec2(4.7,2.1);a*=.5;}return n;}
vec3 readPaint(sampler2D tex,vec2 uv){return texture2D(tex,clamp(uv,vec2(.002),vec2(.998))).rgb;}
void main(){
 vec2 uv=vUv, p=(uv-.5)*vec2(resolution.x/resolution.y,1.0);
 vec2 drift=vec2(fbm(p*2.8+vec2(time*.045,0.0)),fbm(p*3.1-vec2(0.0,time*.036)))-.5;
 float pressure=bass*.007+bassHit*.009+drums*.002;
 vec2 center=vec2(.19,-.13);
 vec2 radial=p-center;
 float radius=length(radial);
 vec2 field=normalize(radial+vec2(.001))*exp(-radius*3.0)*pressure;
 float calm=1.0-clamp(introSolo+outroSolo,0.0,1.0)*soloCalm*.82;
 vec2 warped=(uv-.5)*.975+.5+drift*(.012+guitar*.008*guitarMove)*calm+field*calm;
 warped.x+=(uv.y-.5)*pan*stereoWidth*.006*guitarSpread*calm;
 vec2 leftFlow=vec2(sin(uv.y*8.0+time*.27),cos(uv.x*5.0+time*.19))*guitarLeft*(1.0-uv.x);
 vec2 rightFlow=vec2(-cos(uv.y*6.0-time*.21),sin(uv.x*7.0-time*.16))*guitarRight*uv.x;
 warped+=ensembleEnabled*(leftFlow+rightFlow)*.006*guitarMove*guitarSpread*calm;
 float fiber=fbm(p*5.0+drift*3.0+vec2(time*.027,-time*.02));
 float threshold=phase*1.4-.2;
 float mask=smoothstep(fiber-.20,fiber+.20,threshold);
 vec3 a=readPaint(imageA,warped), b=readPaint(imageB,warped);
 vec3 changing=mix(a,b,mask);
 float migration=smoothstep(fiber-.17,fiber+.17,anchorMix*1.4-.2);
 vec3 foundation=mix(readPaint(anchor,warped),readPaint(anchorNext,warped),migration);
 // Variants appear only through dispersed pigment pockets, leaving a stable composition.
 float islands=smoothstep(.31,.72,fbm(p*2.7+vec2(time*.018,0.0)));
 float quiet=1.0-voice*.16;
 vec3 color=mix(foundation,changing,variation*(.28+.72*islands)*quiet*(1.0+density*.25)*calm);
 // Slow deterministic deposits: rare local accidents, never a frame-random flash.
 float deposit=smoothstep(.65,.79,fbm(p*3.3+vec2(time*.031,time*.017)));
 vec3 ghost=mix(readPaint(imageA,warped+drift*.04),readPaint(imageB,warped+drift*.04),mask);
 color=mix(color,ghost,deposit*memory*(.4+density*.35)*calm);
 // Imperfect bass circle belongs to the paint, not an equalizer overlay.
 float ringRadius=.10+bass*.045+bassHit*.018;
 float ring=exp(-pow((radius-ringRadius+drift.x*.012)/(.013+bass*.008),2.0));
 color+=vec3(.10,.14,.17)*ring*bass*.22;
 // A guitar-controlled luminous filament and long displaced echo.
 float path=.51+.12*sin(uv.y*5.5+time*.04)+drift.y*.055;
 float arc=exp(-pow((uv.x-path)/(.003+guitar*.003*guitarSpread),2.0));
 float lengthMask=smoothstep(.05,.30,uv.y)*(1.0-smoothstep(.75,.97,uv.y));
 color+=vec3(.18,.22,.25)*arc*lengthMask*(guitar*.30+guitarHit*.15)*guitarGlow*calm;
 color+=vec3(.012,.016,.02)*piano*exp(-length(p-vec2(-.3,.1))*2.5);
 vec2 echoUv=warped+vec2(.005+stereoWidth*.006,-.002)*guitarTrail*calm;
 vec3 echo=mix(readPaint(anchor,echoUv),readPaint(anchorNext,echoUv),migration);
 color=mix(color,echo,clamp(guitar*.055*islands*guitarTrail,0.0,.6)*calm);
 float lift=clamp(guitarDensity*dynamics*.36,0.0,.72)*calm;
 vec3 lightPaint=readPaint(luminous,warped);
 color=mix(color,lightPaint,lift*(.35+.65*islands));
 vec3 bright=max(color-vec3(.13),vec3(0.0));
 color+=bright*ensembleEnabled*guitarHigh*guitarGlow*guitarDensity*.30;
 // Opposite destinations for the same sparse 001 family: dark opening, pale release.
 color*=1.0-introSolo*introDark*.88;
 color=mix(color,vec3(.63,.72,.80),outroSolo*outroLight*.66);
 color*=1.0+guitarDensity*dynamics*.30;
 float grain=(hash(floor(uv*resolution))-.5)*.006;
 color+=grain;
 color*=.97+.035*bass;
 gl_FragColor=vec4(clamp(color,0.0,1.0),1.0);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
}`;
