import React,{useEffect,useMemo,useRef,useState} from 'react';
import {Player} from '@remotion/player';
import {Film} from './Film.jsx';
import {readWatchJson} from './watch-data.mjs';

export default function Realtime({asset,initialTime,onTime,quality='full',viewerControls,viewerResetToken}){
 const [data,setData]=useState(null),[error,setError]=useState(''),player=useRef(null);
 useEffect(()=>{const abort=new AbortController();async function read(file){const compressed=file==='partition.json'&&typeof DecompressionStream!=='undefined';return readWatchJson(await fetch(asset(file+(compressed?'.gz':'')),{signal:abort.signal}));}Promise.all(['watch-settings.json','partition.json'].map(read)).then(([props,config])=>setData({props,config})).catch(e=>{if(e.name!=='AbortError')setError('映像データを読み込めませんでした。');});return()=>abort.abort();},[asset]);
 const inputProps=useMemo(()=>data?{...data.props,preloadedConfig:data.config,viewerControls,viewerResetToken}:null,[data,viewerControls,viewerResetToken]);
 useEffect(()=>{if(!data||!player.current)return;const p=player.current;p.seekTo(Math.min(Math.floor(initialTime*data.config.fps),Math.ceil(data.config.durationSec*data.config.fps)-1));const changed=()=>onTime(p.getCurrentFrame()/data.config.fps);p.addEventListener('frameupdate',changed);return()=>p.removeEventListener('frameupdate',changed);},[data]);
 if(error)return <p role="alert">{error}</p>;
 if(!data)return <p role="status">読み込み中</p>;
 const c=data.config;
 return <Player ref={player} component={Film} inputProps={inputProps} compositionWidth={quality==='light'?960:c.width} compositionHeight={quality==='light'?540:c.height} durationInFrames={Math.ceil(c.durationSec*c.fps)} fps={c.fps} controls style={{width:'100%',aspectRatio:'16 / 9'}} errorFallback={()=><p role="alert">描画できませんでした。完成動画へ切り替えてください。</p>}/>;
}
