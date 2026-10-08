import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const require=createRequire(new URL('../tv-react/package.json',import.meta.url));
const {build}=require('esbuild');
const target=join(tmpdir(),'bepa-jira-qa.cjs');
await build({entryPoints:[new URL('../tv-react/src/lib/jira.ts',import.meta.url).pathname],bundle:true,platform:'node',format:'cjs',outfile:target});
const {indicatorQueries,loadIndicator,loadJiraSnapshot}=require(target);
assert.match(indicatorQueries(new Date('2026-10-07T01:30:00Z')).hoy,/2026-10-06/);
assert.match(indicatorQueries(new Date('2026-10-01T01:00:00Z')).mes,/2026-09-01/);
assert.match(indicatorQueries(new Date('2026-12-31T18:00:00Z')).hoy,/created < "2027-01-01"/);
const old=global.fetch;
let count=0;const calls=[];
try{
 global.fetch=async(url,opts)=>{const p=JSON.parse(opts.body);calls.push(p);const start=Number(p.nextPageToken||0);const items=Array.from({length:Math.min(p.maxResults,1105-start)},(_,i)=>({key:'CW-'+(start+i),fields:{summary:'Caso completo',project:{key:'CW'},created:'2026-10-06T10:00:00-0300'}}));return new Response(JSON.stringify({issues:items,...(start+items.length<1105?{nextPageToken:String(start+items.length)}:{})}));};
 const all=await loadIndicator('fin');assert.equal(all.length,1105);assert.equal(all.at(-1).key,'CW-1104');assert.ok(calls.every(p=>p.fields.includes('resolutiondate')));count++;
 calls.length=0;const snap=await loadJiraSnapshot();assert.equal(snap.counts.hoy,1105);assert.equal(snap.counts.fin,1105);assert.equal(snap.active.length,1105);count++;
 assert.equal(snap.counts.waHoy,1105);assert.ok(calls.some(p=>p.jql.includes('AND project = CW')&&p.jql.includes('created >=')&&!p.jql.includes('statusCategory')));
 global.fetch=async()=>new Response(JSON.stringify({issues:[{key:'CW-1'}],nextPageToken:'repeated'}));await assert.rejects(()=>loadIndicator('mes'),/incompleta/);count++;
 global.fetch=async()=>new Response(JSON.stringify({error:'invalid'}));await assert.rejects(()=>loadIndicator('hoy'),/válido/);count++;
}finally{global.fetch=old;}
console.log('PASS: fechas Paraguay, fin de mes/año, listas de 1105 casos, contadores completos, token repetido y respuesta inválida.');
