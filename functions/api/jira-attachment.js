/** Serves only an image belonging to the requested Jira issue, using server credentials. */
const BASE="https://grupobepa.atlassian.net";
const IMAGE=/^image\/(png|jpeg|jpg|gif|webp|avif)$/i;
const json=(error,status,code,action,extra={})=>new Response(JSON.stringify({error,code,action,...extra}),{status,headers:{"Content-Type":"application/json","Cache-Control":"no-store"}});
export async function onRequestGet({request,env}){
 const p=new URL(request.url).searchParams,key=p.get("key"),id=p.get("id");
 if(!key||!/^[A-Z][A-Z0-9_]*-\d+$/i.test(key)||!id||!/^\d{1,30}$/.test(id))return json("Ticket o imagen inválidos.",400,"INVALID_ATTACHMENT","Volvé a abrir el ticket desde su listado.");
 if(!env.JIRA_EMAIL||!env.JIRA_TOKEN)return json("Faltan las credenciales de Jira en el servidor de imágenes.",503,"JIRA_CONFIG_MISSING","Configurar JIRA_EMAIL y JIRA_TOKEN en el entorno del servidor y volver a publicar.");
 const headers={Authorization:`Basic ${btoa(`${env.JIRA_EMAIL}:${env.JIRA_TOKEN}`)}`,Accept:"application/json"};
 try{
  const check=await fetch(`${BASE}/rest/api/3/issue/${encodeURIComponent(key)}?fields=attachment`,{headers,signal:AbortSignal.timeout(15000)});
  if(!check.ok)return json("Jira no permitió leer los adjuntos del ticket.",check.status,"ISSUE_ACCESS_DENIED","Revisá los permisos de lectura del usuario de la API para este ticket.",{upstreamStatus:check.status});
  const issue=await check.json(),attachment=issue.fields?.attachment?.find(a=>String(a.id)===id);
  if(!attachment)return json("La imagen no pertenece a este ticket o fue eliminada.",404,"ATTACHMENT_NOT_FOUND","Actualizá el detalle del ticket para obtener sus adjuntos actuales.");
  if(!IMAGE.test(attachment.mimeType||""))return json("El archivo no es una imagen compatible.",415,"UNSUPPORTED_IMAGE","Abrí este archivo desde Jira.");
  if(attachment.size>20*1024*1024)return json("La imagen supera 20 MB.",413,"IMAGE_TOO_LARGE","Abrí el adjunto desde Jira.");
  const response=await fetch(`${BASE}/rest/api/3/attachment/content/${encodeURIComponent(id)}?redirect=false`,{headers:{...headers,Accept:attachment.mimeType},redirect:"manual",signal:AbortSignal.timeout(15000)});
  if(!response.ok)return json("Jira no permitió descargar esta imagen.",response.status===401||response.status===403||response.status===404?response.status:502,"IMAGE_UPSTREAM_ERROR","Revisá los permisos de adjuntos y las restricciones del comentario en Jira.",{upstreamStatus:response.status});
  return new Response(response.body,{headers:{"Content-Type":attachment.mimeType,"X-Content-Type-Options":"nosniff","Content-Disposition":"inline","Cache-Control":"private, max-age=120"}});
 }catch{return json("No se pudo conectar para obtener la imagen.",502,"JIRA_CONNECTION_ERROR","Volvé a intentar cuando Jira esté disponible.");}
}
