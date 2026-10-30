/* Executa o smoke de tools/browser_smoke.html em Chrome headless via CDP.
   Sem dependências NPM; requer Node 22+ (WebSocket global). */
'use strict';
const base='http://127.0.0.1:9222';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function discover(){
 for(let i=0;i<100;i++){
  try{const res=await fetch(base+'/json/list');if(res.ok){const list=await res.json();const page=list.find(p=>p.type==='page'&&p.url.includes('/tools/browser_smoke.html'));if(page)return page.webSocketDebuggerUrl}}catch(e){}
  await sleep(200);
 }
 throw Error('Chrome CDP não iniciou ou página de teste não foi encontrada');
}
async function main(){
 if(typeof WebSocket!=='function')throw Error('Node sem WebSocket global (necessário Node 22+)');
 const url=await discover(),ws=new WebSocket(url);
 await new Promise((resolve,reject)=>{ws.onopen=resolve;ws.onerror=()=>reject(Error('Falha de conexão WebSocket CDP'))});
 let serial=0;const pending=new Map();
 ws.onmessage=event=>{let data;try{data=JSON.parse(event.data)}catch{return}if(!data.id)return;const task=pending.get(data.id);if(!task)return;pending.delete(data.id);if(data.error)task.reject(Error(data.error.message));else task.resolve(data.result)};
 const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++serial;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}))});
 await send('Runtime.enable');
 let last={};
 for(let i=0;i<120;i++){
  const res=await send('Runtime.evaluate',{expression:'({status:document.body?.getAttribute("data-smoke-status"),log:document.getElementById("log")?.textContent})',returnByValue:true});
  const v=res?.result?.value||{};last=v;
  if(v.status==='PASS'){console.log(v.log);ws.close();return}
  if(v.status==='FAIL'){console.error(v.log);ws.close();process.exitCode=1;return}
  await sleep(500);
 }
 console.error('Smoke excedeu 60 segundos. Último estado:',last);ws.close();process.exitCode=1;
}
main().catch(e=>{console.error('Falha no teste de navegador:',e.stack||e.message);process.exitCode=1});
