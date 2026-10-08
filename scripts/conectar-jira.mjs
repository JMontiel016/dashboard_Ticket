import {fileURLToPath} from 'node:url';
import {readFile} from 'node:fs/promises';
import {configureJira} from './jira-local.mjs';
try{
 const root=fileURLToPath(new URL('..',import.meta.url)).replace(/\/$/,'');
 let key=process.env.JIRA_VERIFY_KEY;
 if(!key){let local='';try{local=await readFile(root+'/.env','utf8');}catch(error){if(error.code!=='ENOENT')throw error;}key=local.match(/^\s*JIRA_VERIFY_KEY\s*=\s*["']?([A-Z][A-Z0-9_]*-\d+)/im)?.[1];}
 await configureJira(root,key||'CW-236');console.log('Listo. Ejecutá npm run dev para ver las imágenes.');
}
catch(error){console.error(error.message);process.exitCode=1;}
