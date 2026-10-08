// Package the APIs inside public/ too: uploading only static files must not omit images.
import {readFile,readdir} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('..',import.meta.url)),require=createRequire(new URL('../tv-react/package.json',import.meta.url));
const {build}=require('esbuild');
const names=(await readdir(new URL('../functions/api/',import.meta.url))).filter(n=>n.endsWith('.js')).sort();
const imports=names.map((name,n)=>`import * as api${n} from './functions/api/${name}';`).join('\n');
const routes=names.map((name,n)=>`${JSON.stringify('/api/'+name.slice(0,-3))}:api${n}`).join(',\n');
const source=`${imports}
const routes={${routes}};
const methods={GET:'onRequestGet',POST:'onRequestPost',PUT:'onRequestPut',DELETE:'onRequestDelete',OPTIONS:'onRequestOptions'};
export default {async fetch(request,env,ctx){
 const path=new URL(request.url).pathname,route=routes[path];
 if(!route){if(path.startsWith('/api/'))return Response.json({error:'Ruta de API no encontrada.'},{status:404,headers:{'Cache-Control':'no-store'}});return env.ASSETS.fetch(request);}
 const handler=route[methods[request.method]];
 if(!handler)return Response.json({error:'Método no permitido.'},{status:405,headers:{Allow:Object.entries(methods).filter(([,name])=>route[name]).map(([method])=>method).join(', ')}});
 try{return await handler({request,env,params:{},data:{},waitUntil:ctx.waitUntil.bind(ctx),next:()=>env.ASSETS.fetch(request)});}
 catch{return Response.json({error:'No se pudo completar la consulta del servidor.'},{status:502,headers:{'Cache-Control':'no-store'}});}
}};`;
await build({stdin:{contents:source,resolveDir:root,sourcefile:'pages-worker.js'},bundle:true,format:'esm',target:'es2022',platform:'browser',outfile:root+'/public/_worker.js',minify:false});
const output=await readFile(root+'/public/_worker.js','utf8');
for(const name of names)if(!output.includes('/api/'+name.slice(0,-3)))throw Error('API no incluida: '+name);
console.log(`Worker preparado en public/_worker.js: ${names.length} APIs, incluido jira-attachment.`);
