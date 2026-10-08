import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
async function module(name){return import('data:text/javascript;base64,'+Buffer.from(await readFile(new URL('../functions/api/'+name+'.js',import.meta.url))).toString('base64'));}
const detail=await module('jira-issue'),image=await module('jira-attachment'),original=global.fetch;
const env={JIRA_EMAIL:'test@example.invalid',JIRA_TOKEN:'fixture-only'},calls=[];
const request=(module,params='key=CW-1',credentials=env)=>module.onRequestGet({request:new Request('https://dashboard.example/api/test?'+params),env:credentials});
const json=data=>new Response(JSON.stringify(data),{headers:{'Content-Type':'application/json'}});
let checks=0;
function pass(label){checks++;console.log('PASS',label);}
try{
 global.fetch=async()=>{throw Error('no fetch expected');};
 assert.equal((await request(detail,'key=../../bad')).status,400);assert.equal((await request(detail,'key=CW-1',{})).status,500);
 assert.equal((await request(image,'key=CW-1&id=https://bad')).status,400);assert.equal((await request(image,'key=CW-1&id=1',{})).status,503);pass('clave, ID y configuración inválidos no consultan Jira');
 global.fetch=async(url,opts)=>{calls.push({url,opts});if(!url.includes('/comment?'))return json({key:'CW-1',fields:{attachment:[]}});const start=Number(new URL(url).searchParams.get('startAt'));return json({total:105,comments:Array.from({length:start===0?60:45},(_,n)=>({id:String(start+n),body:'Comentario '+(start+n)}))});};
 let result=await request(detail),data=await result.json();assert.equal(result.status,200);assert.equal(data.comments.length,105);assert.equal(data.comments.at(-1).id,'104');assert.equal(calls.length,3);assert.ok(calls.every(c=>c.opts.headers.Authorization.startsWith('Basic ')));assert.match(calls[0].url,/attachment/);pass('105 comentarios completos aunque Jira entregue páginas menores a 100');
 let page=0;global.fetch=async url=>!url.includes('/comment?')?json({key:'CW-1',fields:{}}):page++===0?json({total:105,comments:[{id:'1',body:'Conservado'}]}):new Response('denied',{status:403});
 data=await (await request(detail)).json();assert.equal(data.comments.length,1);assert.match(data.commentsError,/HTTP 403/);pass('fallo parcial conserva comentarios e informa que la lectura está incompleta');
 global.fetch=async url=>!url.includes('/comment?')?json({key:'CW-1',fields:{}}):json({total:2,comments:[]});data=await (await request(detail)).json();assert.match(data.commentsError,/incompleta/);pass('página vacía con total pendiente no se presenta como lista completa');
 global.fetch=async()=>new Response('missing',{status:404});assert.equal((await request(detail)).status,404);pass('ticket inaccesible conserva HTTP de Jira');
 global.fetch=async()=>{throw Error('timeout');};assert.equal((await request(detail)).status,502);assert.equal((await request(image,'key=CW-1&id=7')).status,502);pass('fallos de conexión informados en detalle e imagen');
 for(const [attachment,status,label]of [[null,404,'imagen ajena al ticket'],[{id:'7',mimeType:'image/svg+xml'},415,'SVG no permitido'],[{id:'7',mimeType:'text/html'},415,'HTML no permitido'],[{id:'7',mimeType:'image/png',size:21*1024*1024},413,'imagen mayor a 20 MB']]){
  calls.length=0;global.fetch=async(url,opts)=>{calls.push({url,opts});return json({fields:{attachment:attachment?[attachment]:[]}});};assert.equal((await request(image,'key=CW-1&id=7')).status,status);assert.equal(calls.length,1);pass(label+' bloqueada antes de descargar');
 }
 calls.length=0;global.fetch=async(url,opts)=>{calls.push({url,opts});return calls.length===1?json({fields:{attachment:[{id:'7',mimeType:'image/png',size:8,content:'https://untrusted.invalid'}]}}):new Response(Uint8Array.from([137,80,78,71]),{headers:{'Content-Type':'image/png'}});};
 result=await request(image,'key=CW-1&id=7');assert.equal(result.status,200);assert.equal(result.headers.get('Content-Type'),'image/png');assert.equal(result.headers.get('X-Content-Type-Options'),'nosniff');assert.equal(calls[1].url,'https://grupobepa.atlassian.net/rest/api/3/attachment/content/7?redirect=false');assert.equal(calls[1].opts.redirect,'manual');assert.equal((await result.arrayBuffer()).byteLength,4);pass('imagen verificada: endpoint fijo, sin redirigir credenciales, contenido y MIME correctos');
 global.fetch=async url=>url.includes('attachment/content/')?new Response(null,{status:302,headers:{Location:'https://untrusted.invalid'}}):json({fields:{attachment:[{id:'7',mimeType:'image/png'}]}});assert.equal((await request(image,'key=CW-1&id=7')).status,502);pass('redirección de imagen informa error sin seguirla');
}finally{global.fetch=original;}
console.log(`${checks} comprobaciones Jira correctas con fetch simulado; sin datos reales.`);
