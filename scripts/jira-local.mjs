import {readFile,writeFile,rename,chmod,unlink} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {createInterface} from 'node:readline/promises';
const BASE='https://grupobepa.atlassian.net',IMAGE=/^image\/(png|jpeg|jpg|gif|webp|avif)$/i;

/** Verify a real attachment before declaring the local connection ready. Only GET requests. */
export async function verifyJiraImages(email,token,key='CW-236',fetcher=fetch){
 if(!email?.trim()||!token?.trim())throw Error('Faltan el correo y el token de Jira.');
 if(!/^[A-Z][A-Z0-9_]*-\d+$/i.test(key))throw Error('La clave del ticket de comprobación no es válida.');
 const headers={Authorization:'Basic '+Buffer.from(email.trim()+':'+token.trim()).toString('base64'),Accept:'application/json'};
 const response=await fetcher(`${BASE}/rest/api/3/issue/${encodeURIComponent(key)}?fields=attachment`,{headers,signal:AbortSignal.timeout(15000)});
 if(!response.ok)throw Error(`Jira respondió HTTP ${response.status} al leer ${key}. Verificá el correo, el token de API y el permiso para ver este ticket.`);
 const issue=await response.json(),attachment=issue.fields?.attachment?.find(a=>IMAGE.test(a.mimeType||'')&&a.size<=20*1024*1024);
 if(!attachment)throw Error(`El ticket ${key} no tiene una imagen compatible para comprobar. Podés elegir otro con JIRA_VERIFY_KEY.`);
 if(!/^\d+$/.test(String(attachment.id)))throw Error('Jira devolvió un identificador de imagen inválido.');
 const result=await fetcher(`${BASE}/rest/api/3/attachment/content/${encodeURIComponent(attachment.id)}?redirect=false`,{headers:{...headers,Accept:attachment.mimeType},redirect:'manual',signal:AbortSignal.timeout(15000)});
 if(!result.ok)throw Error(`Jira respondió HTTP ${result.status} al descargar la imagen. El usuario de la API debe poder leer ese adjunto.`);
 const type=(result.headers.get('content-type')||'').split(';')[0];
 if(!IMAGE.test(type))throw Error('La comprobación devolvió una página o datos en lugar de una imagen.');
 const bytes=new Uint8Array(await result.arrayBuffer());
 const valid=(type==='image/png'&&[137,80,78,71,13,10,26,10].every((v,n)=>bytes[n]===v))||(/image\/jpe?g/.test(type)&&bytes[0]===255&&bytes[1]===216)||(/^image\/gif/.test(type)&&Buffer.from(bytes.slice(0,3)).toString()==='GIF')||(/^image\/webp/.test(type)&&Buffer.from(bytes.slice(0,4)).toString()==='RIFF')||(/^image\/avif/.test(type)&&Buffer.from(bytes.slice(4,8)).toString()==='ftyp');
 if(!valid||bytes.length>20*1024*1024)throw Error('La descarga no contiene una imagen compatible válida de hasta 20 MB.');
 return {key,filename:attachment.filename,bytes:bytes.length,mimeType:type};
}

export function envWithJira(content,email,token){
 const clean=content.split(/\r?\n/).filter(line=>!/^\s*(?:export\s+)?JIRA_(EMAIL|TOKEN)\s*=/.test(line)).join('\n').trimEnd();
 return `${clean}${clean?'\n':''}JIRA_EMAIL=${JSON.stringify(email.trim())}\nJIRA_TOKEN=${JSON.stringify(token.trim())}\n`;
}
export async function saveLocalJira(root,email,token){
 const path=root+'/.env',temp=root+'/.env.conectar-'+randomUUID();let content='';
 try{content=await readFile(path,'utf8');}catch(error){if(error.code!=='ENOENT')throw error;}
 try{await writeFile(temp,envWithJira(content,email,token),{mode:0o600,flag:'wx'});await rename(temp,path);await chmod(path,0o600);}finally{await unlink(temp).catch(()=>{});}
}

function hiddenToken(){
 return new Promise((resolve,reject)=>{
  process.stdout.write('Token de API de Jira (oculto): ');const input=process.stdin;let secret='';
  const cleanup=()=>{input.off('data',receive);input.setRawMode(false);input.pause();process.stdout.write('\n');};
  const receive=chunk=>{for(const char of chunk.toString()){if(char==='\u0003'||char==='\u0004'){cleanup();reject(Error('Conexión cancelada.'));return;}if(char==='\r'||char==='\n'){cleanup();resolve(secret.trim());return;}if(char==='\u007f'||char==='\b'){secret=secret.slice(0,-1);continue;}if(char>=' ')secret+=char;}};
  input.setRawMode(true);input.resume();input.on('data',receive);
 });
}
export async function configureJira(root,key='CW-236'){
 if(!process.stdin.isTTY||!process.stdout.isTTY)throw Error('Ejecutá npm run conectar:jira en una terminal para configurar la conexión local.');
 console.log('Conexión local de Jira. El token queda en .env privado y nunca se envía al navegador.');
 console.log('Token de API: https://id.atlassian.com/manage-profile/security/api-tokens');
 const rl=createInterface({input:process.stdin,output:process.stdout});let email;
 try{email=(await rl.question('Correo de Jira: ')).trim();}finally{rl.close();}
 const token=await hiddenToken();console.log(`Comprobando el ticket ${key} y descargando una imagen…`);
 const verified=await verifyJiraImages(email,token,key);await saveLocalJira(root,email,token);
 console.log(`Imagen verificada: ${JSON.stringify(verified.filename)} (${Math.round(verified.bytes/1024)} KB). Conexión local guardada.`);
 return {email,token};
}
