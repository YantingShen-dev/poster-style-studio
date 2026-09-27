(()=>{
'use strict';
const url=new URL(location.href),token=url.searchParams.get('poster_live');
if(!token||!['127.0.0.1','localhost'].includes(location.hostname))return;
const client=crypto.randomUUID();
async function send(path,body){
 const response=await fetch('/bridge/'+path+'?token='+encodeURIComponent(token),{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
 if(!response.ok)throw Error('本地桥接器 '+response.status);
 return response.json();
}
async function listen(){
 await window.PosterEditor.ready;
 for(;;){
  try{
   const response=await fetch('/bridge/next?token='+encodeURIComponent(token)+'&client='+encodeURIComponent(client),{cache:'no-store'});
   if(!response.ok)throw Error('本地桥接器 '+response.status);
   const job=await response.json();
   if(!job?.id)continue;
   let result;
   try{result={ok:true,value:await window.PosterEditor.execute(job.command)};}
   catch(error){result={ok:false,error:String(error?.message||error)};}
   await send('result',{id:job.id,client,...result});
  }catch(error){await new Promise(resolve=>setTimeout(resolve,1000));}
 }
}
listen();
})();
