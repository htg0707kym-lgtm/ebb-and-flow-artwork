import React,{useEffect,useLayoutEffect,useMemo,useRef,useState} from 'react';
import {Audio,continueRender,delayRender,cancelRender,useCurrentFrame,useVideoConfig,getRemotionEnvironment} from 'remotion';
import {assetFile as staticFile} from './asset-file.mjs';
import {ThreeCanvas} from '@remotion/three';
import {useLoader,useThree} from '@react-three/fiber';
import * as THREE from 'three';
import {frameState,permutation} from './control.mjs';
import {prepareEditorial,editorialSettingsAt} from './editorial-state.mjs';
import {fragmentShader,vertexShader} from './shaders.mjs';
import {materialLayerShader} from './material-layer-shader.mjs';
import {laneLayers,layout} from './layer-state.mjs';
import {collageShader} from './collage-shader.mjs';
import {partitionShader} from './partition-shader.mjs';
import {partitionLayout} from './partition-layout.mjs';
import {speedTransition,matchesTarget,collageSpeedEvents} from './speed-transition.mjs';
import {materialStoryIndex} from './material-story.mjs';
import {buildMaterialItinerary} from './material-itinerary.mjs';
import {useLyricTextures} from './use-lyric-textures.jsx';
import {guitarGroupsAt,musicalPartitionCues,musicalOwners} from './musical-layout.mjs';
import {applyViewerControls,viewerMotion,advanceViewerClock} from './viewer-controls.mjs';

function StablePainting({config,settings:inputSettings,viewerControls,viewerResetToken}){
 const frame=useCurrentFrame(),{width,height}=useVideoConfig(),{gl,advance}=useThree();
 const editorial=useMemo(()=>prepareEditorial(inputSettings),[inputSettings]);
 const settings=applyViewerControls(editorialSettingsAt(inputSettings,editorial,frame/config.fps),viewerControls);
 const viewerClock=useRef(null);
 const variantOrder=useMemo(()=>permutation(config.materials.length,editorial.plan?.seed??0),[config,editorial.plan?.seed]);
 const textureMaterials=useMemo(()=>config.partitionMode?[...config.foundationMaterials,...(config.dawnMaterial?[config.dawnMaterial]:[])]:config.materials,[config]);
 const textures=useLoader(THREE.TextureLoader,textureMaterials.map(m=>staticFile(m.url)));
 const atlas=useLoader(THREE.TextureLoader,staticFile(config.atlas.url));
 const uniforms=useMemo(()=>{
  const u=Object.fromEntries(['anchor','anchorNext','atlas','seed','macroMix','introSolo','outroSolo','introDark','outroLight','soloCalm','guitarDensity','dynamics','guitarMove','guitarGlow','guitarSpread','guitarTrail','bass','vocal','voiceGain','bassGain','layersGain','build','accent','time','backgroundMotion','edgeFeather','patchOpacity'].map(k=>[k,{value:0}]));
  for(const k of ['laneOld','laneNew','laneLayout','laneSignal','laneFastA','laneFastB','laneShape','laneFast','laneGains'])u[k]={value:Array.from({length:9},()=>new THREE.Vector4())};
  for(const k of ['bassOld','bassNew','voiceOld','voiceNew','bassLayout','voiceLayout','bassShape','voiceShape','backgroundA','backgroundB','backgroundFast','bassFastA','bassFastB','voiceFastA','voiceFastB','bassFast','voiceFast','bassGains','voiceGains'])u[k]={value:new THREE.Vector4()};return u;
 },[]);
 const fullConfig=useMemo(()=>config.partitionMode?{...config,materials:config.foundationMaterials,materialPolicy:config.foundationMaterialPolicy,guitarEnsemble:undefined}:null,[config]);
 const sectionScores=useMemo(()=>config.visualStages.map((stage,index)=>{
  const start=stage.startSec,end=config.visualStages[index+1]?.startSec??config.durationSec;
  const mean=(values,hz)=>{const a=values?.slice(Math.floor(start*hz),Math.ceil(end*hz));return a?.length?a.reduce((s,v)=>s+v,0)/a.length:0;};
  return {lanes:config.guitarLaneData.tracks.map(t=>mean(t.channels.activity,config.guitarLaneData.sampleRateHz)),bass:mean(config.features.bass.channels.rawRms,config.features.bass.sampleRateHz)>.0005,vocal:mean(config.features.vocal.channels.rawRms,config.features.vocal.sampleRateHz)>.0005};
 }),[config]);
 const state=frameState(frame,config,settings);
 const musicalCues=useMemo(()=>config.partitionMode?musicalPartitionCues(config):null,[config]);
 const storyMaps=useMemo(()=>{
  const time=config.visualStages[state.stageIndex]?.startSec??0,progress=config.partitionMode?editorialSettingsAt(inputSettings,editorial,time).whiteProgress:-1;
  const build=materials=>materials?.map((_,i)=>materialStoryIndex(i,materials,config.storyPalette?.ranking,progress));
  return {main:build(config.materials),foundation:build(config.foundationMaterials)};
 },[config,inputSettings,editorial,state.stageIndex]);
 const speedEvents=useMemo(()=>collageSpeedEvents(editorial.events),[editorial.events]);
 const lyricBusy=speedEvents.some(e=>state.t>=e.timeSec&&state.t<e.timeSec+e.durationSec);
 const lyrics=useLyricTextures(state.t,inputSettings,lyricBusy,Boolean(config.partitionMode));
 const itinerary=useMemo(()=>config.partitionMode&&editorial.active&&editorial.state.typeEnabled.palette!==false&&editorial.plan.settings.whiteProgress!==undefined&&config.storyPalette?.ranking?buildMaterialItinerary(config,speedEvents,t=>editorialSettingsAt(inputSettings,editorial,t).whiteProgress??0,editorial.plan.seed,editorial.plan.settings.exchangeSec):null,[config,speedEvents,inputSettings,editorial]);
 const eventScenes=useMemo(()=>new Map(speedEvents.map(e=>[e.id,frameState(Math.round(e.timeSec*config.fps),config,{...inputSettings,automationEvents:editorial.events}).stageIndex])),[config,inputSettings,editorial.events,speedEvents]);
 useLayoutEffect(()=>{
  for(const texture of [...textures,atlas]){texture.colorSpace=THREE.SRGBColorSpace;texture.minFilter=THREE.LinearFilter;texture.magFilter=THREE.LinearFilter;}
  const textureAt=i=>textures[textureMaterials.findIndex(m=>m.id===config.materials[i]?.id)] || textures[0];
  uniforms.anchor.value=textureAt(state.anchorA);uniforms.anchorNext.value=textureAt(state.anchorB);uniforms.atlas.value=atlas;
  if(config.partitionMode){
   viewerClock.current=advanceViewerClock(viewerClock.current,state.t,viewerControls,viewerResetToken);
   const motion=viewerMotion(viewerControls);
   window.__mvViewerMotion={...viewerClock.current,...motion};
   for(const [key,value]of [['viewerMotionTime',viewerClock.current.phase],['viewerWarp',motion.warp],['viewerTrail',motion.trail]]){uniforms[key]??={value};uniforms[key].value=value;}
   for(const [key,value]of [['lyricMask',lyrics.masks[0].texture],['lyricResidualMask',lyrics.masks[1].texture],['lyricReadable',lyrics.readable],['lyricDistortion',lyrics.distortion],['lyricResidue',lyrics.residue],['lyricAge',lyrics.age??0]]){uniforms[key]??={value};uniforms[key].value=value;}
   uniforms.lyricMemoryMask??={value:lyrics.masks[2].texture};uniforms.lyricMemoryMask.value=lyrics.masks[2].texture;
   uniforms.lyricMemoryAmount??={value:0};uniforms.lyricMemoryAmount.value=lyrics.memory.opacity;
   uniforms.lyricMemoryAnchor??={value:new THREE.Vector2()};uniforms.lyricMemoryAnchor.value.set(lyrics.memory.event?.x??.5,1-(lyrics.memory.event?.y??.5));
   window.__mvLyricMemory={id:lyrics.memory.event?.id??null,sourceId:lyrics.memory.event?.sourceId??null,text:lyrics.memory.text,opacity:lyrics.memory.opacity};
   window.__mvLyrics={active:lyrics.active?.id??null,text:lyrics.active?.text??null,residual:lyrics.residual?.id??null,readable:lyrics.readable,distortion:lyrics.distortion,residue:lyrics.residue,font:lyrics.font?.id??null,error:lyrics.error};
  }
  if(config.partitionMode){
   const foundation=frameState(frame,fullConfig,settings);
   const reactive=settings.signalOffsetSec?frameState(frame+settings.signalOffsetSec*config.fps,fullConfig,settings):foundation;
   const sceneTime=config.visualStages[state.stageIndex]?.startSec??0;
   const storyProgress=settings.whiteProgress===undefined?-1:editorialSettingsAt(inputSettings,editorial,sceneTime).whiteProgress;
   const storyIndex=(i,materials=config.materials)=>(materials===config.materials?storyMaps.main:storyMaps.foundation)?.[i]??i;
   for(const [key,index,scene]of [['foundationA',state.anchorA,Math.max(0,state.stageIndex-1)],['foundationB',state.anchorB,state.stageIndex]]){uniforms[key]??={value:new THREE.Vector4()};uniforms[key].value.fromArray(config.atlas.rects[itinerary?.assignments.get(`scene:${scene}:background`)??storyIndex(index)].rect);}
   uniforms.motifBlueAmount??={value:0};uniforms.motifBlueAmount.value=settings.whiteProgress??0;
   const bluePool=(config.storyPalette?.ranking||[]).filter(r=>r.whiteFraction<.12).map(r=>config.materials.findIndex(m=>m.id===r.id)).filter(i=>i>=0);
   const motifPosition=Math.floor(foundation.performance.materialClock/Math.max(.5,settings.exchangeSec));
   for(const [key,offset]of [['guitarPigment',0],['bassPigment',7]]){uniforms[key]??={value:new THREE.Vector4()};uniforms[key].value.fromArray(config.atlas.rects[bluePool[(motifPosition+offset)%Math.max(1,bluePool.length)]??0].rect);}
   uniforms.editorialExposure??={value:1};uniforms.editorialExposure.value=settings.editorialExposure??1;
   uniforms.pigmentFinish??={value:1};uniforms.pigmentFinish.value=Number(settings.pigmentFinish??1);
   uniforms.dawnTexture??={value:null};uniforms.dawnTexture.value=config.dawnMaterial?textures.at(-1):textures[0];
   uniforms.dawnAmount??={value:0};uniforms.dawnAmount.value=config.dawnMaterial?(state.performance.dawn??0):0;
   uniforms.useEditorialVariants??={value:0};uniforms.useEditorialVariants.value=itinerary||settings.editorialMaterialSeed!==undefined?1:0;
   const position=Math.floor(foundation.performance.materialClock/Math.max(.5,settings.exchangeSec));
   for(const [key,index]of [['variantA',position],['variantB',position+1]]){const n=Math.min(Math.max(index,0),variantOrder.length-1);uniforms[key]??={value:new THREE.Vector4()};uniforms[key].value.fromArray(config.atlas.rects[itinerary?.assignments.get(`variant:${n}`)??storyIndex(variantOrder[n])].rect);}
   const texture=i=>textures[storyIndex(i,config.foundationMaterials)];
   for(const [key,index] of [['imageA',foundation.current],['imageB',foundation.next],['luminous',foundation.luminousIndex]]){uniforms[key]??={value:null};uniforms[key].value=texture(index);}
   for(const key of ['guitar','guitarHit','bassHit','pan','phase','anchorMix','variation','density','voice','memory','drums','piano','guitarLeft','guitarRight','guitarHigh']){uniforms[key]??={value:0};uniforms[key].value=(['guitar','guitarHit','bassHit','pan','phase','anchorMix','variation','memory'].includes(key)?foundation:reactive)[key];}
   uniforms.resolution??={value:new THREE.Vector2(width,height)};uniforms.stereoWidth??={value:0};uniforms.stereoWidth.value=foundation.width;
   uniforms.ensembleEnabled??={value:0};uniforms.ensembleEnabled.value=0;
   const cue=musicalCues[Math.max(0,musicalCues.findLastIndex(c=>c.timeSec<=state.t))];
   const ownership=musicalOwners(config,cue,settings.editorialLayoutSeed??0);
   const division=partitionLayout(state.t,{...config,partitionCues:musicalCues.map(c=>c===cue?{...c,count:ownership.count}:c)},settings.editorialLayoutSeed??0);
   window.__mvMusicalLayout={cue,groups:ownership.groups,slots:ownership.slots};
   uniforms.cutScene??={value:0};uniforms.cutScene.value=division.index;
   uniforms.cutCount??={value:0};uniforms.cutCount.value=division.count-1;
   uniforms.cutSlant??={value:0};uniforms.cutSlant.value=division.slant;
   uniforms.motifStudy??={value:2};uniforms.motifStudy.value=Number(settings.motifStudy??2);
   uniforms.releaseGlow??={value:0};uniforms.releaseGlow.value=settings.whiteProgress===undefined?0:Math.max(0,Math.min(1,(state.t-196)/(config.durationSec-196)))*.6;
   uniforms.regionBounds??={value:Array.from({length:8},()=>new THREE.Vector4())};
   for(let i=0;i<8;i++)uniforms.regionBounds.value[i].fromArray(division.regions[i]||[0,0,1,1]);
   uniforms.regionCuts??={value:Array.from({length:7},()=>new THREE.Vector4())};
   for(let i=0;i<7;i++)uniforms.regionCuts.value[i].fromArray(division.cuts[i] || [0,0,0,-1]);
   uniforms.motifGain??={value:1};uniforms.motifGain.value=Number(settings.motifGain??1);
   for(const [key,name]of [['fxBlackout','blackout'],['fxInvert','invert'],['fxZoom','zoom'],['fxMirror','mirror']]){uniforms[key]??={value:0};uniforms[key].value=state.performance.effects?.[name]??0;}
   let noiseSeed=0;for(const ch of state.performance.noiseId||'')noiseSeed=(Math.imul(noiseSeed,31)+ch.charCodeAt(0))>>>0;
   uniforms.noiseRect??={value:new THREE.Vector4()};uniforms.noiseRect.value.fromArray(config.atlas.rects[storyIndex(noiseSeed%config.materials.length)].rect);
   uniforms.noiseAmount??={value:0};uniforms.noiseAmount.value=state.performance.noise;
   uniforms.noiseSeed??={value:0};uniforms.noiseSeed.value=(noiseSeed%997)/37;
   uniforms.regionSlots??={value:[]};
   uniforms.regionSlots.value=[...ownership.slots,...Array(8-ownership.slots.length).fill(11)];
  }
  for(const k of ['seed','introSolo','outroSolo','introDark','outroLight','soloCalm','guitarDensity','dynamics','guitarMove','guitarGlow','guitarSpread','guitarTrail','bass'])uniforms[k].value=state[k];
  if(config.partitionMode)for(const k of ['introSolo','outroSolo','guitarDensity','dynamics','soloCalm'])uniforms[k].value=0;
  uniforms.macroMix.value=state.anchorMix;uniforms.vocal.value=sampleFeature(config.features.vocal,'rms',state.t+(config.partitionMode?Number(settings.signalOffsetSec??0):0));
  uniforms.voiceGain.value=Number(settings.vocalLayer??1.3);uniforms.bassGain.value=Number(settings.bassLayers??1.2);uniforms.layersGain.value=1;
  if(config.partitionMode){uniforms.voiceGain.value*=Number(sectionScores[state.stageIndex].vocal);uniforms.bassGain.value*=Number(sectionScores[state.stageIndex].bass);}
  uniforms.build.value=state.performance.build;uniforms.accent.value=state.performance.accent;
  uniforms.time.value=state.t;uniforms.backgroundMotion.value=Number(settings.backgroundMotion??1);uniforms.edgeFeather.value=Number(settings.edgeFeather??.006);uniforms.patchOpacity.value=Number(settings.patchOpacity??1);
  const sceneTime=config.visualStages[state.stageIndex]?.startSec??0;
  const storyProgress=config.partitionMode&&settings.whiteProgress!==undefined?editorialSettingsAt(inputSettings,editorial,sceneTime).whiteProgress:-1;
  const sourceIndex=i=>storyMaps.main[i]??i;
  const rect=(i,key)=>config.atlas.rects[itinerary?.assignments.get(key)??sourceIndex(i)]?.rect || config.atlas.rects[0].rect;
  const directRect=i=>config.atlas.rects[i]?.rect||config.atlas.rects[0].rect;
  const eligible=speedEvents.filter(e=>!(state.manualOverride&&e.origin==='editorial')).filter(e=>state.t<e.timeSec+e.durationSec || eventScenes.get(e.id)===state.stageIndex || (eventScenes.get(e.id)===state.stageIndex-1 && state.anchorMix<1));
  const fastFor=(slot,base)=>{
   const group=config.guitarLaneData.tracks.find(t=>t.id===slot)?.group;
   const slotEvents=eligible.map(e=>group&&config.guitarLaneData.tracks.some(t=>t.id===e.target&&t.group===group)?{...e,target:slot,originalTarget:e.target}:e);
   const e=slotEvents.filter(e=>e.timeSec<=state.t&&matchesTarget(e.target,slot)).sort((a,b)=>b.timeSec-a.timeSec||Number(b.target===slot)-Number(a.target===slot)||b.id.localeCompare(a.id))[0];
   const scene=eventScenes.get(e?.id)??state.stageIndex;
   let reference=base;
   if(slot==='background')reference=config.materials.findIndex(m=>m.id===config.visualStages[scene].materialId);
   else if(slot==='bass'||slot==='vocal')reference=config.specialAssignments[scene]?.[slot]??base;
   else reference=config.layerAssignments[scene]?.[slot]??base;
   const bank=config.speedBanks?.byMaterial?.[reference] || [base];
   const fast=speedTransition(state.t,slotEvents,slot,bank,base,{latch:true});
   const planned=itinerary?.assignments.get(`speed:${fast.eventId}:${e?.originalTarget??slot}:${fast.step}`);
   if(planned!==undefined){fast.a=planned;fast.b=planned;fast.planned=true;}
   if(fast.latched&&eventScenes.get(fast.eventId)!==state.stageIndex)fast.weight*=1-state.anchorMix;
   const mean=config.materialLinearMeans?.[reference]||.1;
   const gain=tile=>storyProgress>=0?1:Math.max(.65,Math.min(1.5,mean/Math.max(.002,config.materialLinearMeans?.[tile] || mean)));
   return {...fast,gainA:gain(fast.a),gainB:gain(fast.b)};
  };
  const layers=laneLayers(config,state,settings);
  const groups=config.partitionMode?guitarGroupsAt(config,state.t+Number(settings.signalOffsetSec??0)):[];
  for(const [i,l] of layers.entries()){
   uniforms.laneOld.value[i].fromArray(rect(l.oldTile,`scene:${Math.max(0,state.stageIndex-1)}:${l.id}`));uniforms.laneNew.value[i].fromArray(rect(l.tile,`scene:${state.stageIndex}:${l.id}`));
   uniforms.laneLayout.value[i].set(l.x,l.y,l.scale,l.angle);uniforms.laneSignal.value[i].set(l.alpha*Number(settings.guitar??1),l.energy,l.high,0);
   if(config.collageMode){
    uniforms.laneSignal.value[i].x=l.activity*Number(settings.guitar??1)*Number(settings.guitarLayers??1);
    if(config.partitionMode){const group=groups.find(g=>g.index===i);uniforms.laneSignal.value[i].w=group?Number(settings.guitar??1)*Number(settings.guitarLayers??1):0;if(group){uniforms.laneSignal.value[i].y=group.energy;uniforms.laneSignal.value[i].z=group.high;}}
    uniforms.laneShape.value[i].set(0,(i+state.stageIndex*2)%6,i*17.31+state.stageIndex*41.7,0);
    const fast=fastFor(l.id,l.tile);l.speed=fast;const fastRect=fast.planned?directRect:rect;uniforms.laneFastA.value[i].fromArray(fastRect(fast.a));uniforms.laneFastB.value[i].fromArray(fastRect(fast.b));uniforms.laneFast.value[i].set(fast.mix,fast.weight,0,0);uniforms.laneGains.value[i].set(fast.gainA,fast.gainB,0,0);
   }
  }
  const scene=state.stageIndex,old=Math.max(0,scene-1),a=config.specialAssignments[old],b=config.specialAssignments[scene];
  uniforms.bassShape.value.set(0,(scene*3+1)%6,91.1+scene*33.7,0);uniforms.voiceShape.value.set(0,(scene*5+4)%6,172.3+scene*47.9,0);
  for(const [key,tile,stage,slot] of [['bassOld',a.bass,old,'bass'],['bassNew',b.bass,scene,'bass'],['voiceOld',a.vocal,old,'vocal'],['voiceNew',b.vocal,scene,'vocal']])uniforms[key].value.fromArray(rect(tile,`scene:${stage}:${slot}`));
  for(const [key,id] of [['bassLayout','bass'],['voiceLayout','voice']]){const p=layout(id,old),q=layout(id,scene);const mix=(x,y)=>x+(y-x)*(config.collageMode?1:state.anchorMix);uniforms[key].value.set(mix(p.x,q.x),mix(p.y,q.y),mix(p.scale,q.scale)*1.3,mix(p.angle,q.angle));}
  const speeds={};
  if(config.collageMode){
   for(const [slot,prefix]of [['bass','bass'],['vocal','voice']]){const fast=fastFor(slot,b[slot]);speeds[slot]=fast;const fastRect=fast.planned?directRect:rect;uniforms[prefix+'FastA'].value.fromArray(fastRect(fast.a));uniforms[prefix+'FastB'].value.fromArray(fastRect(fast.b));uniforms[prefix+'Fast'].value.set(fast.mix,fast.weight,0,0);uniforms[prefix+'Gains'].value.set(fast.gainA,fast.gainB,0,0);}
   const fast=fastFor('background',state.anchorB);speeds.background=fast;const fastRect=fast.planned?directRect:rect;uniforms.backgroundA.value.fromArray(fastRect(fast.a));uniforms.backgroundB.value.fromArray(fastRect(fast.b));uniforms.backgroundFast.value.set(fast.mix,fast.weight,fast.gainA,fast.gainB);
  }
  const extension=gl.getContext().getExtension('WEBGL_debug_renderer_info');window.__mvGpu=extension?gl.getContext().getParameter(extension.UNMASKED_RENDERER_WEBGL):'WebGL';
  window.__mvState={...state,layers,speeds};window.__mvDuration=config.durationSec;window.__mvHasEnsemble=true;window.__mvReadyFrame=frame;
  window.__mvLayerMode=true;
  window.__mvCollageMode=Boolean(config.collageMode);
  window.__mvPartitionMode=Boolean(config.partitionMode);
  window.__mvEditorial={plan:settings.editorialPlan??null,section:settings.editorialSection??null,manualOverride:state.manualOverride,inkFlow:settings.guitarMove,exposure:settings.editorialExposure??1,whiteProgress:settings.whiteProgress??-1,storyProgress,sourceIndices:config.materials.map((_,i)=>sourceIndex(i)),itinerary:itinerary?{unique:itinerary.unique,requests:itinerary.requests}:null,materials:config.materials.length,variantOrder};
  window.__mvUniformValues=Object.fromEntries(Object.entries(uniforms).filter(([,u])=>typeof u.value==='number').map(([k,u])=>[k,u.value]));
 },[frame,config,settings,textures,atlas,uniforms,gl,viewerControls,viewerResetToken]);
 // Remotion's manual canvas loop otherwise misses async font completion on a still frame.
 useLayoutEffect(()=>{if(getRemotionEnvironment().isRendering&&lyrics.font)advance(performance.now());},[advance,lyrics.font]);
 return <mesh frustumCulled={false}><planeGeometry args={[2,2]}/><shaderMaterial uniforms={uniforms} vertexShader={vertexShader} fragmentShader={config.partitionMode?partitionShader:config.collageMode?collageShader:materialLayerShader} depthTest={false} depthWrite={false} toneMapped={false}/></mesh>;
}
function sampleFeature(feature,key,t){const a=feature?.channels?.[key];if(!a?.length)return 0;const x=Math.max(0,Math.min(a.length-1,t*feature.sampleRateHz)),i=Math.floor(x);return a[i]+(a[Math.min(i+1,a.length-1)]-a[i])*(x-i);}

function Painting({config,settings}) {
  const frame=useCurrentFrame();
  const {width,height}=useVideoConfig();
  const textures=useLoader(THREE.TextureLoader,config.materials.map(m=>staticFile(m.url)));
  const {gl}=useThree();
  const uniforms=useMemo(()=>Object.fromEntries(['anchor','anchorNext','imageA','imageB','luminous','time','seed','phase','variation','bass','bassHit','guitar','guitarHit','pan','stereoWidth','resolution','anchorMix','density','voice','memory','drums','piano','ensembleEnabled','guitarDensity','introSolo','outroSolo','dynamics','guitarMove','guitarGlow','guitarSpread','guitarTrail','introDark','outroLight','soloCalm','guitarLeft','guitarRight','guitarHigh'].map(key=>[key,{value:key==='resolution'?new THREE.Vector2(width,height):0}])),[width,height]);
  const state=frameState(frame,config,settings);
  useLayoutEffect(()=>{
    for(const texture of textures){texture.colorSpace=THREE.SRGBColorSpace;texture.minFilter=THREE.LinearFilter;texture.magFilter=THREE.LinearFilter;}
    uniforms.anchor.value=textures[state.anchorA];
    uniforms.anchorNext.value=textures[state.anchorB];
    uniforms.imageA.value=textures[state.current];
    uniforms.imageB.value=textures[state.next];
    uniforms.luminous.value=textures[state.luminousIndex];
    for(const key of ['seed','phase','variation','bass','bassHit','guitar','guitarHit','pan','anchorMix','density','voice','memory','drums','piano']) uniforms[key].value=state[key];
    for(const key of ['ensembleEnabled','guitarDensity','introSolo','outroSolo','dynamics','guitarMove','guitarGlow','guitarSpread','guitarTrail','introDark','outroLight','soloCalm','guitarLeft','guitarRight','guitarHigh']) uniforms[key].value=state[key];
    uniforms.time.value=state.t;
    uniforms.stereoWidth.value=state.width;
    const extension=gl.getContext().getExtension('WEBGL_debug_renderer_info');
    window.__mvGpu=extension?gl.getContext().getParameter(extension.UNMASKED_RENDERER_WEBGL):gl.getContext().getParameter(gl.getContext().RENDERER);
    window.__mvState=state;
    window.__mvDuration=config.durationSec;
    window.__mvHasEnsemble=Boolean(config.guitarEnsemble);
    window.__mvLayerMode=false;
    window.__mvReadyFrame=frame;
    window.__mvUniformValues=Object.fromEntries(Object.entries(uniforms).filter(([,u])=>typeof u.value==='number').map(([k,u])=>[k,u.value]));
  },[frame,settings,config,textures,uniforms,gl]);
  return <mesh frustumCulled={false}><planeGeometry args={[2,2]}/><shaderMaterial uniforms={uniforms} vertexShader={vertexShader} fragmentShader={fragmentShader} depthTest={false} depthWrite={false} toneMapped={false}/></mesh>;
}
export function Film({settings={},configFile='poc.json',preloadedConfig=null,viewerControls=null,viewerResetToken=0}) {
  const [config,setConfig]=useState(preloadedConfig);
  const [hold]=useState(()=>preloadedConfig?null:delayRender('Loading local stem analysis'));
  const {width,height}=useVideoConfig();
  useEffect(()=>{
    if(preloadedConfig){setConfig(preloadedConfig);if(hold!==null)continueRender(hold);return;}
    let active=true;
    fetch(staticFile(configFile)).then(r=>{if(!r.ok) throw new Error(`Film data ${r.status}`);return r.json();}).then(data=>{if(active){setConfig(data);continueRender(hold);}}).catch(cancelRender);
    return ()=>{active=false;};
  },[hold,configFile,preloadedConfig]);
  if(!config)return null;
  return <div style={{position:'absolute',inset:0,background:'#162337'}}>
    <ThreeCanvas width={width} height={height} dpr={1} gl={{antialias:false,preserveDrawingBuffer:true,powerPreference:'high-performance'}} camera={{position:[0,0,1]}}>
      {config.materialLayerMode?<StablePainting config={config} settings={settings} viewerControls={viewerControls} viewerResetToken={viewerResetToken}/>:<Painting config={config} settings={settings}/>}
    </ThreeCanvas>
    <Audio src={staticFile(config.audio)} volume={frame=>Math.min(1,(config.durationSec-frame/config.fps)/.5)}/>
  </div>;
}
