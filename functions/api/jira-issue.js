/** Read-only issue detail with explicit partial-comment errors and full pagination. */
const JIRA_BASE="https://grupobepa.atlassian.net";
const CORS={"Access-Control-Allow-Origin":"*","Content-Type":"application/json","Cache-Control":"no-store"};
const FIELDS="summary,status,assignee,reporter,priority,project,issuetype,created,updated,resolutiondate,description,comment,labels,timeoriginalestimate,timespent,timeestimate,parent,subtasks,attachment";
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:CORS});
export async function onRequestGet({request,env}){
 const key=new URL(request.url).searchParams.get("key");if(!key||!/^[A-Z][A-Z0-9_]*-\d+$/i.test(key))return json({error:"Clave de ticket inválida."},400);
 if(!env.JIRA_EMAIL||!env.JIRA_TOKEN)return json({error:"Credenciales no configuradas"},500);
 const headers={Authorization:`Basic ${btoa(`${env.JIRA_EMAIL}:${env.JIRA_TOKEN}`)}`,Accept:"application/json"};
 try{
  const response=await fetch(`${JIRA_BASE}/rest/api/3/issue/${encodeURIComponent(key)}?expand=renderedFields,changelog&fields=${FIELDS}`,{headers,signal:AbortSignal.timeout(15000)});
  if(!response.ok)return json({error:`No se pudo leer el ticket (Jira HTTP ${response.status}).`},response.status);
  const issue=await response.json();let comments=[],commentsError="",startAt=0;
  try{for(let page=0;page<500;page++){
   const response=await fetch(`${JIRA_BASE}/rest/api/3/issue/${encodeURIComponent(key)}/comment?expand=renderedBody&maxResults=100&orderBy=created&startAt=${startAt}`,{headers,signal:AbortSignal.timeout(15000)});
   if(!response.ok)throw Error(`No se pudieron leer todos los comentarios (Jira HTTP ${response.status}).`);
   const data=await response.json();if(!Array.isArray(data.comments))throw Error("Jira no devolvió un listado de comentarios válido.");
   comments.push(...data.comments);startAt+=data.comments.length;
   if(data.isLast===true||(typeof data.total==="number"&&startAt>=data.total)||(data.total===undefined&&data.comments.length<100))break;
   if(!data.comments.length||page===499)throw Error("La lectura de comentarios quedó incompleta.");
  }}catch(e){commentsError=e.message||"No se pudieron leer todos los comentarios.";}
  comments=[...new Map(comments.map(c=>[c.id,c])).values()];
  return json({issue,comments,...(commentsError?{commentsError}:{})});
 }catch{return json({error:"No se pudo conectar para leer el ticket."},502);}
}
export async function onRequestOptions(){return new Response(null,{status:204,headers:{...CORS,"Access-Control-Allow-Methods":"GET, OPTIONS"}});}
