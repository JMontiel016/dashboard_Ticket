import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const {default:worker}=await import('data:text/javascript;base64,'+Buffer.from(await readFile(new URL('../public/_worker.js',import.meta.url))).toString('base64'));
const original=global.fetch,env={JIRA_EMAIL:'test@example.invalid',JIRA_TOKEN:'fixture-only',ASSETS:{fetch:()=>new Response('STATIC')}},ctx={waitUntil(){}};
let calls=0,checks=0;const run=(path,method='GET',body)=>worker.fetch(new Request('https://example.invalid'+path,{method,...(body?{headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{})}),env,ctx);
const pass=label=>{checks++;console.log('PASS',label);};
try{
 global.fetch=async url=>{calls++;if(url.includes('/attachment/content/'))return new Response(Uint8Array.from([137,80,78,71]),{headers:{'Content-Type':'image/png'}});if(url.includes('/comment?'))return Response.json({total:0,comments:[]});if(url.includes('/issue/'))return Response.json({key:'CW-1',fields:{attachment:[{id:'7',mimeType:'image/png',size:4}]}});return Response.json({issues:[],total:0,queues:[],data:[]});};
 assert.equal(await (await run('/tv.html')).text(),'STATIC');assert.equal(calls,0);pass('archivos estáticos mantienen el binding ASSETS');
 let r=await run('/api/missing-image');assert.equal(r.status,404);assert.match(r.headers.get('content-type'),/json/);pass('API ausente devuelve JSON 404 y nunca HTML del dashboard');
 r=await run('/api/jira','GET');assert.equal(r.status,405);assert.match(r.headers.get('Allow'),/POST/);assert.equal((await run('/api/jira','OPTIONS')).status,204);pass('métodos y preflight conservados');
 for(const path of ['/api/bull-core','/api/bull-controller','/api/core-failed?queue=envioSifen','/api/bull-failed','/api/sifen-semaforo']){assert.equal((await run(path)).status,200);}assert.equal((await run('/api/jira','POST',{jql:'project = CW'})).status,200);pass('lecturas Core, Controller, semáforo y búsqueda Jira incluidas');
 const data=await (await run('/api/jira-issue?key=CW-1')).json();assert.equal(data.issue.key,'CW-1');assert.deepEqual(data.comments,[]);pass('detalle de Jira incluido en el Worker compilado');
 r=await run('/api/jira-attachment?key=CW-1&id=7');assert.equal(r.status,200);assert.equal(r.headers.get('content-type'),'image/png');assert.equal((await r.arrayBuffer()).byteLength,4);pass('ruta de imágenes devuelve bytes desde el Worker compilado');
 const before=calls;assert.equal((await run('/api/bull-job-action','POST',{queue:'envioSifen',id:'7',action:'delete'})).status,503);assert.equal(calls,before);pass('acciones conservan su validación del servidor sin escritura');
}finally{global.fetch=original;}
console.log(`${checks} comprobaciones del Worker correctas; no se consultaron ni modificaron sistemas reales.`);
