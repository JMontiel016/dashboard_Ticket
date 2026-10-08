import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const { onRequestPost }=await import('data:text/javascript;base64,'+Buffer.from(await readFile(new URL('../functions/api/bull-job-action.js',import.meta.url),'utf8')).toString('base64'));
const original=global.fetch;let calls=[];
function request(body,origin='http://localhost:5174',env={MONITOR_ACTIONS_ENABLED:'true'}) {return onRequestPost({env,request:new Request('http://localhost:5174/api/bull-job-action',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(body)})});}
let count=0;function pass(label){count++;console.log('PASS',label);}
try {
 for(const queue of ['consultaDocumentoCore','envioSifen','RetornoDocumentoCore'])for(const action of ['retry','delete']){
  calls=[];global.fetch=async(url,options={})=>{calls.push([url,options.method||'GET']);return new Response(JSON.stringify(options.method?{ok:true}:{status:'failed'}));};
  const r=await request({queue,id:'790780',action});assert.equal(r.status,200);assert.equal(calls.length,2);assert.match(calls[0][0],new RegExp(queue==='envioSifen'?'core-monitor':'controller-monitor'));assert.ok(calls[1][0].endsWith(action==='retry'?'/retry/failed':'/clean'));assert.equal(calls[1][1],'PUT');pass(`${queue} ${action}: destino y método`);
 }
 for(const [body,origin,env,status] of [[{queue:'envioSifen',id:'1',action:'retry'},'https://other.example',{},503],[{queue:'envioSifen',id:'1',action:'retry'},'https://other.example',{MONITOR_ACTIONS_ENABLED:'true'},403],[{queue:'envioSifen',id:'../1',action:'retry'},'http://localhost:5174',{MONITOR_ACTIONS_ENABLED:'true'},400],[null,'http://localhost:5174',{MONITOR_ACTIONS_ENABLED:'true'},400]]){
  calls=[];global.fetch=async()=>{calls.push(1);throw Error('must not write');};const r=await request(body,origin,env);assert.equal(r.status,status);assert.equal(calls.length,0);pass(`bloqueo ${status} antes de acceder al monitor`);
 }
 for(const status of ['completed','active','waiting']){calls=[];global.fetch=async()=>{calls.push(1);return new Response(JSON.stringify({status}));};assert.equal((await request({queue:'envioSifen',id:'1',action:'delete'})).status,409);assert.equal(calls.length,1);pass(`sin escritura para ${status}`);}
 global.fetch=async(url,o={})=>new Response(JSON.stringify(o.method?{error:'denied'}:{status:'failed'}));assert.equal((await request({queue:'envioSifen',id:'1',action:'delete'})).status,502);pass('HTTP 200 con error upstream no se informa como éxito');
 global.fetch=async()=>{throw Error('timeout');};assert.equal((await request({queue:'envioSifen',id:'1',action:'retry'})).status,502);pass('error de conexión sin reintento');
}finally{global.fetch=original;}
console.log(`${count} comprobaciones de servidor correctas. No se escribieron datos reales.`);
