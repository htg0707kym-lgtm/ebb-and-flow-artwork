const status=document.querySelector('#status');
for(const button of document.querySelectorAll('[data-copy]'))button.addEventListener('click',async()=>{
 const input=document.getElementById(button.dataset.copy);
 try{await navigator.clipboard.writeText(input.value);status.textContent='コピーしました';}
 catch{input.focus();input.select();status.textContent='コピーできませんでした。入力欄を選択しています。';}
});
fetch(new URL('share/manifest.json',location.href)).then(r=>{if(!r.ok)throw Error('Manifest unavailable');return r.json();}).then(data=>{
 document.querySelector('#post').value=data.postText;
 for(const clip of data.clips){const row=document.querySelector(`[data-size="${clip.id}"]`);if(row)row.textContent=`${clip.duration}秒 / ${clip.width} × ${clip.height} / ${(clip.bytes/1000000).toFixed(1)} MB / 音声あり`;}
}).catch(()=>{});
