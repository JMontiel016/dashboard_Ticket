import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const publicRoot=resolve('public');
const server=createServer(async(req,res)=>{try{const path=resolve(publicRoot,'.'+(new URL(req.url,'http://localhost').pathname==='/'?'/index.html':new URL(req.url,'http://localhost').pathname));if(!path.startsWith(publicRoot+'/'))throw Error('path');res.setHeader('Content-Type',({'.html':'text/html','.css':'text/css','.js':'text/javascript'})[extname(path)]||'application/octet-stream');res.end(await readFile(path));}catch{res.statusCode=404;res.end('Not found');}});
await new Promise(r=>server.listen(5174,'127.0.0.1',r));
const browser=await chromium.launch({headless:true,...(process.env.QA_CHROME?{executablePath:process.env.QA_CHROME,args:['--no-sandbox','--disable-dev-shm-usage']}: {})});
try{
 const page=await browser.newPage();let errors=[],missing=[];page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400&&!r.url().includes('/api/'))missing.push(r.url());});
 await page.route('**/api/**',r=>r.fulfill({json:r.request().url().includes('/api/jira')?{issues:[],total:0}:{queues:[{name:'consultaDocumentoCore',jobs:[],counts:{failed:0},pagination:{pageCount:1}},{name:'envioSifen',jobs:[],counts:{failed:0},pagination:{pageCount:1}},{name:'RetornoDocumentoCore',jobs:[],counts:{failed:0},pagination:{pageCount:1}}]}}));
 await page.goto('http://127.0.0.1:5174/');await page.getByRole('button',{name:'Activar modo oscuro'}).click();assert.equal(await page.evaluate(()=>document.documentElement.dataset.theme),'dark');
 await page.getByRole('button',{name:'Personalizar equipo',exact:true}).click();await page.getByRole('dialog',{name:'Personalizar colaboradores'}).waitFor();await page.keyboard.press('Escape');assert.equal(await page.getByLabel('Colaboradores visibles').inputValue(),'active');
 await page.goto('http://127.0.0.1:5174/tv.html');await page.waitForSelector('.analysis-selector');await page.getByRole('button',{name:'Tarjetas',exact:true}).click();assert.equal(await page.getByRole('button',{name:'Tarjetas',exact:true}).getAttribute('aria-pressed'),'true');assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);
 console.log('PASS: public/ compilado, recursos JS/CSS, tema y vistas cargan sin 404 ni errores JavaScript.');
}finally{await browser.close();await new Promise(r=>server.close(r));}
