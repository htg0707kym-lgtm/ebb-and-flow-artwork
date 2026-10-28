// Sparse authored memories, never new singing times or inferred repetitions.
export const lyricMemoryCues=[
 {id:'remember-1',sourceId:'lyric-001',start:116.8,duration:3.8,from:2,length:6,x:.77,y:.23,mirror:true,stretch:1.65,compress:.56,angle:-.12},
 {id:'remember-2',sourceId:'lyric-007',start:160.4,duration:4.2,from:1,length:6,x:.36,y:.48,mirror:true,stretch:1.9,compress:.42,angle:.16},
 {id:'remember-3',sourceId:'lyric-012',start:168.8,duration:3.6,from:0,length:3,x:.71,y:.69,mirror:false,stretch:2.5,compress:.48,angle:-.20},
 {id:'remember-4',sourceId:'lyric-015',start:237.6,duration:4.6,from:1,length:3,x:.27,y:.35,mirror:true,stretch:2.0,compress:.58,angle:.12},
 {id:'remember-5',sourceId:'lyric-022',start:267.4,duration:4.2,from:0,length:6,x:.65,y:.61,mirror:false,stretch:1.8,compress:.38,angle:-.09},
 {id:'remember-6',sourceId:'lyric-025',start:282.1,duration:4.2,from:4,length:12,x:.39,y:.43,mirror:true,stretch:1.6,compress:.50,angle:.14},
];
export function lyricMemoryFrame(t,cues,{enabled=true,strength=.5,busy=false}={}){
 const empty={event:null,text:null,opacity:0};if(!enabled)return empty;
 const event=lyricMemoryCues.find(e=>t>=e.start&&t<e.start+e.duration);if(!event)return empty;
 const source=cues.find(c=>c.id===event.sourceId);
 if(!source||source.end+8>=event.start||source.review_required!==false||source.matched!==true)return empty;
 const text=Array.from(source.text).slice(event.from,event.from+event.length).join('');
 const u=(t-event.start)/event.duration,envelope=Math.sin(Math.PI*u)**2;
 const reading=cues.some(c=>t>=c.start&&t<c.end);
 const opacity=envelope*.60*Math.max(0,Math.min(1,strength))*(reading ? .4 : 1)*(busy ? .5 : 1);
 return {event,text,opacity};
}
