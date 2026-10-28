const clamp=x=>Math.max(0,Math.min(1,x));
const ease=x=>{const p=clamp(x);return p*p*(3-2*p);};
export function validateLyricTimeline(data){
 if(data?.schemaVersion!==1||data.timebase!=='original_full_song_seconds'||!Array.isArray(data.cues))throw new Error('Invalid lyric timeline');
 const ids=new Set();let previousEnd=0;
 for(const cue of data.cues){
  if(!cue.id||ids.has(cue.id)||typeof cue.text!=='string'||!cue.text.trim()||!Number.isFinite(cue.start)||!Number.isFinite(cue.end)||cue.start<previousEnd||cue.end<=cue.start||cue.end>3600||cue.matched!==true||cue.review_required!==false)throw new Error('Unverified or invalid lyric cue');
  ids.add(cue.id);previousEnd=cue.end;
 }return data;
}
export function lyricSection(time){
 if(time<99)return {id:'verse',x:.14,y:.70,align:'left',scale:.92,delay:.21,tail:.65,effect:.42};
 if(time<114)return {id:'bridge',x:.56,y:.36,align:'center',scale:.94,delay:.18,tail:.7,effect:.65};
 if(time<155)return {id:'chorus1',x:.50,y:.57,align:'center',scale:1,delay:.20,tail:.8,effect:.62};
 if(time<196)return {id:'chorus2a',x:.46,y:.64,align:'center',scale:.97,delay:.22,tail:.9,effect:.68};
 if(time<218)return {id:'chorus2b',x:.51,y:.48,align:'center',scale:1,delay:.16,tail:.9,effect:.8};
 return {id:'coda',x:.57,y:.62,align:'center',scale:.94,delay:.24,tail:1.5,effect:.7};
}
export const lyricEmphasis=text=>/どうして|同じね|見つけた|願いは宝石|輝き出す|the ebb/i.test(text);
export function lyricFrame(t,cues,{enabled=true,intensity=.35,busy=false}={}){
 const empty={active:null,residual:null,readable:0,distortion:0,residue:0};if(!enabled)return empty;
 const active=cues.find(c=>t>=c.start&&t<c.end)||null;
 const prior=cues.findLast(c=>t>=c.end&&t<c.end+lyricSection(c.start).tail)||null;
 const section=active?lyricSection(active.start):null,age=active?t-active.start:0;
 const strength=clamp(intensity)*(busy ? .45 : 1);
 const readable=active?(1-.72*ease((t-(active.end-.18))/.18)):0;
 const distortion=active?strength*section.effect*ease((age-section.delay)/.28):0;
 const residue=prior?.end!==undefined?strength*(active ? .12 : .25)*(1-ease((t-prior.end)/lyricSection(prior.start).tail)):0;
 return {active,residual:prior,readable,distortion,residue,section,age};
}
