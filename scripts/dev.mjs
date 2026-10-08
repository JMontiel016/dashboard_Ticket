import {fileURLToPath} from 'node:url';
import {access} from 'node:fs/promises';
import {spawn,spawnSync} from 'node:child_process';
import {configureJira,verifyJiraImages} from './jira-local.mjs';
const root=fileURLToPath(new URL('..',import.meta.url)).replace(/\/$/,''),tv=root+'/tv-react';
try{
 try{await access(tv+'/node_modules/vite/bin/vite.js');}catch{const installed=spawnSync('npm',['--prefix',tv,'ci'],{stdio:'inherit'});if(installed.status!==0)process.exit(installed.status||1);}
 const {loadEnv}=await import('../tv-react/node_modules/vite/dist/node/index.js');
 const env={...loadEnv('development',root,''),...process.env},key=env.JIRA_VERIFY_KEY||'CW-236';
 if(env.JIRA_LOCAL_SETUP!=='skip'){
  if(!env.JIRA_EMAIL||!env.JIRA_TOKEN)await configureJira(root,key);
  else{const verified=await verifyJiraImages(env.JIRA_EMAIL,env.JIRA_TOKEN,key);console.log(`Jira local conectado. Imagen verificada: ${JSON.stringify(verified.filename)}.`);}
 }
 const child=spawn(process.execPath,[tv+'/node_modules/vite/bin/vite.js',...process.argv.slice(2)],{cwd:tv,stdio:'inherit',env:process.env});
 child.on('exit',(code,signal)=>{if(signal)process.kill(process.pid,signal);else process.exitCode=code||0;});
}catch(error){console.error(error.message);process.exitCode=1;}
