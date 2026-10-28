import {useEffect,useLayoutEffect,useMemo,useState} from 'react';import {delayRender,continueRender,getRemotionEnvironment,cancelRender} from 'remotion';import * as THREE from 'three';
import {assetFile as staticFile} from './asset-file.mjs';
import {lyricFrame,lyricSection,lyricEmphasis,validateLyricTimeline} from './lyric-state.mjs';
import {lyricMemoryFrame} from './lyric-memory.mjs';
const WIDTH=1536,HEIGHT=864,cache=new Map();
function makeMask(){const canvas=document.createElement('canvas');canvas.width=WIDTH;canvas.height=HEIGHT;const texture=new THREE.CanvasTexture(canvas);texture.minFilter=THREE.LinearFilter;texture.magFilter=THREE.LinearFilter;texture.generateMipmaps=false;texture.colorSpace=THREE.NoColorSpace;return {canvas,texture};}
function drawMask(mask,cue,font,scale){
 const ctx=mask.canvas.getContext('2d');ctx.clearRect(0,0,WIDTH,HEIGHT);
 if(cue&&font){
  const section=lyricSection(cue.start),emphasis=lyricEmphasis(cue.text);let size=WIDTH*.029*section.scale*scale*(emphasis?1.12:1);
  ctx.font=`${font.weight} ${size}px "${font.family}"`;
  const maxWidth=WIDTH*(section.align==='left'?.74:.82),measure=ctx.measureText(cue.text).width;
  if(measure>maxWidth){size*=maxWidth/measure;ctx.font=`${font.weight} ${size}px "${font.family}"`;}
  ctx.fillStyle='#fff';ctx.textBaseline='middle';ctx.textAlign=section.align;ctx.fillText(cue.text,WIDTH*section.x,HEIGHT*section.y);
 }mask.texture.needsUpdate=true;
}
export function useLyricTextures(time,settings,busy,enabled){
 const [readyHold]=useState(()=>enabled?delayRender('Preparing lyric textures'):null);
 const masks=useMemo(()=>[makeMask(),makeMask(),makeMask()],[]),[data,setData]=useState(null),[font,setFont]=useState(null),[error,setError]=useState(null);
 useEffect(()=>{if(!enabled)return;let alive=true;const hold=delayRender('Loading verified lyric timeline');
  Promise.all(['lyric-visual.json','lyric-fonts/manifest.json'].map(p=>fetch(staticFile(p)).then(r=>{if(!r.ok)throw Error('Lyric asset '+r.status);return r.json();})))
   .then(([timeline,manifest])=>{validateLyricTimeline(timeline);if(alive)setData({cues:timeline.cues,manifest});}).catch(e=>{if(alive){setError(e.message);if(getRemotionEnvironment().isRendering)cancelRender(e);}}).finally(()=>continueRender(hold));
  return()=>{alive=false;};
 },[enabled]);
 useEffect(()=>{if(!data||!enabled)return;let alive=true;const hold=delayRender('Loading local lyric font'),choice=data.manifest.fonts.find(f=>f.id===(settings.lyricFont??data.manifest.defaultFontId))||data.manifest.fonts[0];
  if(!choice){setError('No lyric font');continueRender(hold);return;}
  const key=choice.url+'|'+choice.family;
  if(!cache.has(key))cache.set(key,new FontFace(choice.family,`url("${staticFile(choice.url)}")`,{weight:String(choice.weight)}).load().then(face=>{document.fonts.add(face);return choice;}).catch(e=>{cache.delete(key);throw e;}));
  cache.get(key).then(f=>{if(alive){setFont(f);setError(null);}}).catch(e=>{if(alive){setFont(null);setError(e.message);if(getRemotionEnvironment().isRendering)cancelRender(e);}}).finally(()=>continueRender(hold));
  return()=>{alive=false;};
 },[data,enabled,settings.lyricFont]);
 const state=lyricFrame(time,data?.cues||[],{enabled:enabled&&settings.lyricsEnabled!==false&&Boolean(font),intensity:settings.lyricIntensity??.35,busy});
 const memory=lyricMemoryFrame(time,data?.cues||[],{enabled:enabled&&settings.lyricsEnabled!==false&&settings.lyricMemoryEnabled!==false&&Boolean(font),strength:settings.lyricMemoryStrength??.5,busy});
 useLayoutEffect(()=>{drawMask(masks[0],state.active,font,settings.lyricScale??1);},[masks,font,state.active?.id,settings.lyricScale]);
 useLayoutEffect(()=>{drawMask(masks[1],state.residual,font,settings.lyricScale??1);},[masks,font,state.residual?.id,settings.lyricScale]);
 useLayoutEffect(()=>{
  const ctx=masks[2].canvas.getContext('2d');ctx.clearRect(0,0,WIDTH,HEIGHT);
  if(memory.event&&font){const e=memory.event;ctx.save();ctx.translate(e.x*WIDTH,e.y*HEIGHT);ctx.rotate(e.angle);ctx.scale(e.mirror?-e.stretch:e.stretch,e.compress);ctx.font=`${font.weight} ${WIDTH*.045}px "${font.family}"`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#fff';ctx.fillText(memory.text,0,0);ctx.restore();}
  masks[2].texture.needsUpdate=true;
 },[masks,font,memory.event?.id]);
 // Keep offline capture blocked until committed masks have reached the canvas.
 useLayoutEffect(()=>{
  if(readyHold===null||(!font&&!error&&enabled))return;
  let second;const first=requestAnimationFrame(()=>{second=requestAnimationFrame(()=>continueRender(readyHold));});
  return()=>{cancelAnimationFrame(first);if(second)cancelAnimationFrame(second);};
 },[readyHold,font,error,enabled]);
 useEffect(()=>()=>{for(const m of masks)m.texture.dispose();},[masks]);
 return {...state,memory,masks,font,error};
}
