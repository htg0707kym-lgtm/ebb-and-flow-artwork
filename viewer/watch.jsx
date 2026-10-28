import React,{Suspense,lazy,useEffect,useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import './watch.css';
import {defaultViewerControls} from './viewer-controls.mjs';

const Realtime=lazy(()=>import('./watch-realtime.jsx'));
window.__ebbAssetBase=new URL('.',location.href).pathname;
const asset=name=>new URL(name,new URL(window.__ebbAssetBase,location.origin)).href;
const video=import.meta.env.VITE_WATCH_VIDEO_URL||'full-partitions-20261028-current.mp4';
const motionSliders=[['speed','流速',0,3,.1],['warp','うねり',0,1,.05],['trail','残像',0,1,.05]];
const secondarySliders=[['flow','流れの強さ',0,2.5,.05],['light','光',.65,1.3,.05],['motif','音の輪郭',0,2,.05]];
function ViewerSlider({entry,values,onChange}){
 const [key,label,min,max,step]=entry;
 return <label><span>{label}</span><input aria-label={label} type="range" min={min} max={max} step={step} value={values[key]} onChange={e=>onChange(key,Number(e.target.value))}/><output>{values[key].toFixed(2)}{key==='speed'?'×':''}</output></label>;
}

class RenderBoundary extends React.Component{
 state={error:false};
 static getDerivedStateFromError(){return {error:true};}
 render(){return this.state.error?<p role="alert">描画できませんでした。完成動画へ切り替えてご覧ください。</p>:this.props.children;}
}
function Artwork(){
 const [mode,setMode]=useState('film'),[message,setMessage]=useState('');
 const [quality,setQuality]=useState(()=>matchMedia('(max-width: 700px), (pointer: coarse)').matches?'light':'full');
 const [viewerControls,setViewerControls]=useState(defaultViewerControls);
 const [viewerResetToken,setViewerResetToken]=useState(0);
 const changeViewer=(key,value)=>setViewerControls(v=>({...v,[key]:value}));
 const resetViewer=()=>{setViewerControls(defaultViewerControls);setViewerResetToken(v=>v+1);};
 const videoRef=useRef(null),position=useRef(0);
 function switchMode(next){if(next===mode)return;if(mode==='film'){position.current=videoRef.current?.currentTime||0;videoRef.current?.pause();}setMessage('');setMode(next);}
 function changeQuality(next){if(mode==='film')position.current=videoRef.current?.currentTime||0;setMessage('');setQuality(next);}
 useEffect(()=>{if(mode==='film'&&videoRef.current)videoRef.current.currentTime=position.current;},[mode]);
 return <main className="artwork">
  <header className="artwork-heading"><h1>ebb and flow</h1><span>AUDIOVISUAL / 04:51</span></header>
  <section className="artwork-screen" aria-label="映像作品">
   {mode==='film'?<video ref={videoRef} src={asset(quality==='light'?'watch-mobile.mp4':video)} poster={asset('watch-poster.jpg')} controls playsInline preload="metadata" onLoadedMetadata={()=>{videoRef.current.currentTime=position.current;}} onError={()=>setMessage('動画を読み込めませんでした。再読込してお試しください。')}/>:<RenderBoundary><Suspense fallback={<p role="status">読み込み中</p>}><Realtime asset={asset} quality={quality} viewerControls={viewerControls} viewerResetToken={viewerResetToken} initialTime={position.current} onTime={t=>{position.current=t;}}/></Suspense></RenderBoundary>}
  </section>
  <footer className="artwork-footer"><div className="artwork-modes" role="group" aria-label="鑑賞モード"><button aria-pressed={mode==='film'} onClick={()=>switchMode('film')}>完成動画</button><button aria-pressed={mode==='realtime'} onClick={()=>switchMode('realtime')}>リアルタイム</button></div><select aria-label="画質" value={quality} onChange={e=>changeQuality(e.target.value)}><option value="light">軽量</option><option value="full">高画質</option></select><a href={asset(video)} target="_blank" rel="noreferrer">MP4</a></footer>
  {mode==='realtime'&&<section className="artwork-controls" aria-label="映像の操作">{motionSliders.map(entry=><ViewerSlider key={entry[0]} entry={entry} values={viewerControls} onChange={changeViewer}/>)}<details className="artwork-secondary"><summary>補助調整</summary>{secondarySliders.map(entry=><ViewerSlider key={entry[0]} entry={entry} values={viewerControls} onChange={changeViewer}/>)}</details><button onClick={resetViewer}>元に戻す</button></section>}
  {message&&<p className="artwork-message" role="alert">{message}</p>}
 </main>;
}
createRoot(document.getElementById('root')).render(<Artwork/>);
