// Local development must serve real image bytes without the published Pages proxy.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdtemp,stat,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {chromium} from 'playwright';
import {verifyJiraImages,envWithJira,saveLocalJira} from '../scripts/jira-local.mjs';
const png=await readFile('tests/fixtures/attachment-1.png');
const email='local-qa@example.invalid',token='local-qa-only',authorization='Basic '+Buffer.from(email+':'+token).toString('base64');
const attachment=[{id:'71',filename:'captura-local.png',mimeType:'image/png',size:png.length}];
const issue={key:'CW-236',fields:{summary:'Imagen local de QA',project:{key:'CW'},assignee:{displayName:'Jaime Montiel',active:true},status:{name:'En curso'},created:new Date().toISOString(),updated:new Date().toISOString(),description:'Datos de prueba',attachment}};
let mode='normal',calls=[];const original=global.fetch;
global.fetch=async(input,options={})=>{
 const url=String(input);if(!url.startsWith('https://grupobepa.atlassian.net/'))return original(input,options);
 calls.push(url);assert.equal(options.headers.Authorization,authorization);
 assert.ok(!options.method||options.method==='GET'||url.includes('/search/jql'));
 if(mode==='denied')return new Response(null,{status:403});
 if(url.includes('/attachment/content/'))return mode==='html'?new Response('<html>Not an image</html>',{headers:{'Content-Type':'text/html'}}):mode==='invalid'?new Response('invalid',{headers:{'Content-Type':'image/png'}}):new Response(png,{headers:{'Content-Type':'image/png'}});
 if(url.includes('/comment?'))return Response.json({comments:[],total:0});
 if(url.includes('/issue/'))return Response.json(issue);
 if(url.includes('/search/jql'))return Response.json({issues:options.body?.includes('assignee is EMPTY')?[]:[issue],total:1});
 throw Error('Unexpected Jira request');
};
const checks=[];async function check(label,fn){await fn();checks.push(label);console.log('PASS',label);}
const temp=await mkdtemp(join(tmpdir(),'jira-local-'));let server,browser;
const previous={JIRA_EMAIL:process.env.JIRA_EMAIL,JIRA_TOKEN:process.env.JIRA_TOKEN};
try{
 await check('Verifica los bytes de un adjunto original antes de guardar la conexión',async()=>{const result=await verifyJiraImages(email,token);assert.equal(result.bytes,png.length);assert.equal(result.filename,'captura-local.png');assert.equal(calls.length,2);});
 await check('Rechaza credenciales denegadas, HTML 200 y archivos inválidos',async()=>{for(const state of ['denied','html','invalid']){mode=state;await assert.rejects(()=>verifyJiraImages(email,token));}mode='normal';});
 await check('Guarda credenciales privadas sin perder otras opciones locales',async()=>{await writeFile(join(temp,'.env'),'MONITOR_ACTIONS_ENABLED=false\nJIRA_EMAIL=old\nexport JIRA_TOKEN=old\n');await saveLocalJira(temp,email,token);const data=await readFile(join(temp,'.env'),'utf8');assert.equal(data,envWithJira('MONITOR_ACTIONS_ENABLED=false\n',email,token));assert.equal((await stat(join(temp,'.env'))).mode&0o777,0o600);});
 process.env.JIRA_EMAIL=email;process.env.JIRA_TOKEN=token;
 const {createServer}=await import('../tv-react/node_modules/vite/dist/node/index.js');
 server=await createServer({root:new URL('../tv-react',import.meta.url).pathname,configFile:new URL('../tv-react/vite.config.ts',import.meta.url).pathname,server:{host:'127.0.0.1',open:false}});await server.listen();
 const base='http://127.0.0.1:5174';
 await check('Vite carga las tres APIs locales: búsqueda, detalle e imagen original',async()=>{
  const list=await original(base+'/api/jira',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({jql:'project = CW'})});assert.equal(list.status,200);assert.equal((await list.json()).issues[0].key,'CW-236');
  const detail=await original(base+'/api/jira-issue?key=CW-236');assert.equal(detail.status,200);assert.equal((await detail.json()).issue.fields.attachment[0].id,'71');
  const image=await original(base+'/api/jira-attachment?key=CW-236&id=71');assert.equal(image.status,200);assert.equal(image.headers.get('content-type'),'image/png');assert.deepEqual(Buffer.from(await image.arrayBuffer()),png);
 });
 browser=await chromium.launch({headless:true,...(process.env.QA_CHROME?{executablePath:process.env.QA_CHROME,args:['--no-sandbox','--disable-dev-shm-usage']}: {})});const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],external=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(r.url().includes('dashboard-bepa.pages.dev'))external.push(r.url());});
 await page.route('**/api/bull-*',r=>r.fulfill({json:{queues:[]}}));await page.route('**/api/core-failed*',r=>r.fulfill({json:{queues:[]}}));
 await check('El navegador muestra la imagen completa con las APIs locales y sin el proxy publicado',async()=>{
  await page.goto(base+'/tv.html');await page.getByRole('button',{name:/^Ingresados hoy /}).click();await page.locator('.indicator-case-heading').first().click();await page.locator('.image-preview').first().scrollIntoViewIfNeeded();await page.waitForFunction(()=>document.querySelector('.image-preview img')?.naturalWidth===2200);assert.deepEqual(await page.locator('.image-preview img').evaluate(e=>[e.naturalWidth,e.naturalHeight]),[2200,1400]);assert.deepEqual(external,[]);
 });
 await check('El visor local amplía y descarga exactamente el original',async()=>{
  await page.locator('.image-detail-button').click();await page.getByRole('button',{name:'Tamaño original',exact:true}).click();assert.equal(await page.getByLabel('Nivel de zoom').innerText(),'100%');const ready=page.waitForEvent('download');await page.getByRole('link',{name:'Descargar original',exact:true}).click();const download=await ready;assert.deepEqual(await readFile(await download.path()),png);await page.keyboard.press('Escape');assert.deepEqual(errors,[]);
 });
 await check('Sin credenciales locales responde JSON 503 con instrucciones, nunca HTML 200',async()=>{delete process.env.JIRA_EMAIL;delete process.env.JIRA_TOKEN;const response=await original(base+'/api/jira-attachment?key=CW-236&id=71');assert.equal(response.status,503);assert.match(response.headers.get('content-type'),/json/);assert.match((await response.json()).action,/npm run dev/);});
 await writeFile('tests/local-jira-results.json',JSON.stringify({date:new Date().toISOString(),checks,simulated:true,throughLocalVite:true,actualPrivateJiraNotTested:true},null,2));console.log(`${checks.length} grupos de Jira local correctos.`);
}finally{
 if(browser)await browser.close();if(server)await server.close();global.fetch=original;
 for(const[key,value]of Object.entries(previous)){if(value===undefined)delete process.env[key];else process.env[key]=value;}
 await rm(temp,{recursive:true,force:true});
}
