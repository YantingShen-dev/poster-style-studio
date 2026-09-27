#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),crypto=require('node:crypto');

const usage='Usage: node live_design.cjs serve <workbench-dir> | status <workbench-dir> | inspect <workbench-dir> [output.json] | call <workbench-dir> <command.json> [output-file]';
const mode=process.argv[2],directory=path.resolve(process.argv[3]||'.'),sessionPath=path.join(directory,'.poster-live.json');
if(!['serve','status','inspect','call'].includes(mode)){console.error(usage);process.exit(2);}
function readSession(){return JSON.parse(fs.readFileSync(sessionPath,'utf8'));}
function reply(res,status,data){res.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'no-store'});res.end(JSON.stringify(data));}
function body(req,limit=110*1024*1024){return new Promise((resolve,reject)=>{const chunks=[];let size=0;req.on('data',part=>{size+=part.length;if(size>limit){reject(Error('请求太大'));req.destroy();}else chunks.push(part);});req.on('end',()=>{try{resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));}catch(err){reject(err);}});req.on('error',reject);});}
function request(session,route,method='GET',data){return new Promise((resolve,reject)=>{const req=http.request({hostname:'127.0.0.1',port:session.port,path:'/bridge/'+route+'?token='+encodeURIComponent(session.token),method,headers:data?{'content-type':'application/json'}:{}},res=>{const parts=[];res.on('data',x=>parts.push(x));res.on('end',()=>{try{const result=JSON.parse(Buffer.concat(parts).toString('utf8'));if(res.statusCode!==200)reject(Error(result.error||'HTTP '+res.statusCode));else resolve(result);}catch(err){reject(err);}});});req.setTimeout(35000,()=>req.destroy(Error('工作台响应超时')));req.on('error',reject);req.end(data?JSON.stringify(data):undefined);});}
function printResult(result,out){if(out){const target=path.resolve(out),value=result.value?.project??result.value?.svg??result.value?.data??result.value;if(typeof value==='string'&&/^data:image\/(png|jpeg);base64,/.test(value))fs.writeFileSync(target,Buffer.from(value.slice(value.indexOf(',')+1),'base64'));else fs.writeFileSync(target,typeof value==='string'?value:JSON.stringify(value,null,2),'utf8');console.log(target);}else console.log(JSON.stringify(result.value??result));}
async function cli(){
 const session=readSession();
 if(mode==='status'){console.log(JSON.stringify(await request(session,'status'),null,2));return;}
 if(mode==='inspect'){const result=await request(session,'call','POST',{action:'inspect',full:Boolean(process.argv[4])});printResult(result,process.argv[4]);return;}
 const input=process.argv[4];if(!input)throw Error(usage);
 const command=JSON.parse(fs.readFileSync(path.resolve(input),'utf8'));
 const result=await request(session,'call','POST',command);
 printResult(result,process.argv[5]);
}
function serve(){
 const index=path.join(directory,'index.html');
 if(!fs.statSync(index).isFile())throw Error('找不到工作台 index.html：'+index);
 const token=crypto.randomBytes(24).toString('hex');
 let browser=null,seen=0,pending=null,waiting=null;
 const server=http.createServer(async(req,res)=>{
  try{
   const url=new URL(req.url,'http://127.0.0.1');
   if(req.method==='GET'&&url.pathname==='/'){res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store'});fs.createReadStream(index).pipe(res);return;}
   if(url.searchParams.get('token')!==token){reply(res,403,{error:'无效的本地会话'});return;}
   if(url.pathname==='/bridge/status'&&req.method==='GET'){reply(res,200,{running:true,browserConnected:Boolean(browser&&Date.now()-seen<30000),pending:Boolean(pending),url:'http://127.0.0.1:'+server.address().port+'/?poster_live='+token});return;}
   if(url.pathname==='/bridge/next'&&req.method==='GET'){
    const client=url.searchParams.get('client');if(!client){reply(res,400,{error:'缺少 client'});return;}
    browser=client;seen=Date.now();
    if(pending&&!pending.delivered){pending.delivered=true;reply(res,200,{id:pending.id,command:pending.command});return;}
    if(waiting){reply(waiting,200,{});waiting=null;}
    waiting=res;const timer=setTimeout(()=>{if(waiting===res){waiting=null;reply(res,200,{});}},15000);
    res.on('close',()=>{clearTimeout(timer);if(waiting===res)waiting=null;});return;
   }
   if(url.pathname==='/bridge/call'&&req.method==='POST'){
    if(!browser||Date.now()-seen>30000){reply(res,409,{error:'尚无已连接的工作台页面；请打开 serve 显示的本机网址'});return;}
    if(pending){reply(res,409,{error:'上一条设计指令尚未完成'});return;}
    const command=await body(req),id=crypto.randomUUID();
    const timer=setTimeout(()=>{if(pending?.id===id){pending=null;reply(res,504,{error:'工作台未在 30 秒内完成指令'});}},30000);
    pending={id,command,response:res,timer,delivered:false};
    if(waiting){const receiver=waiting;waiting=null;pending.delivered=true;reply(receiver,200,{id,command});}
    return;
   }
   if(url.pathname==='/bridge/result'&&req.method==='POST'){
    const result=await body(req);
    if(!pending||result.id!==pending.id||result.client!==browser){reply(res,409,{error:'指令不匹配'});return;}
    clearTimeout(pending.timer);
    const caller=pending.response;pending=null;
    reply(caller,result.ok?200:422,result.ok?{value:result.value}:{error:result.error});
    reply(res,200,{ok:true});return;
   }
   reply(res,404,{error:'路径不存在'});
  }catch(error){if(!res.headersSent)reply(res,400,{error:error.message});}
 });
 server.listen(0,'127.0.0.1',()=>{
  const session={pid:process.pid,port:server.address().port,token,createdAt:new Date().toISOString()};
  fs.writeFileSync(sessionPath,JSON.stringify(session,null,2),{mode:0o600});
  console.log('Open '+ 'http://127.0.0.1:'+session.port+'/?poster_live='+token);
  console.log('Session '+sessionPath);
 });
 const clean=()=>{try{const current=readSession();if(current.pid===process.pid)fs.unlinkSync(sessionPath);}catch{}};
 process.on('exit',clean);process.on('SIGINT',()=>process.exit());process.on('SIGTERM',()=>process.exit());
}
if(mode==='serve'){try{serve();}catch(err){console.error(err.message);process.exitCode=1;}}
else cli().catch(err=>{console.error(err.message);process.exitCode=1;});
