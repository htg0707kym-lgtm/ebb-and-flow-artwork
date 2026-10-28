export async function readWatchJson(response){
 if(!response.ok)throw Error('Artwork data '+response.status);
 const bytes=new Uint8Array(await response.arrayBuffer());
 // Static hosts may already have decoded Content-Encoding: gzip.
 if(bytes[0]===0x1f&&bytes[1]===0x8b){
  if(typeof DecompressionStream==='undefined')throw Error('Gzip unavailable');
  return new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).json();
 }
 return JSON.parse(new TextDecoder().decode(bytes));
}
