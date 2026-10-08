import { useEffect, useState } from "react";
import { FileText, MessageSquare, ExternalLink } from "lucide-react";
import { ImageGallery } from "./ImageGallery";
import type { JiraIssue } from "../../types/jira";
import { loadIssueDetail, plainDescription, type IssueDetail } from "../../lib/issueDetail";
import { JIRA_BROWSE } from "../../config/constantes";
const date=(v?:string|null)=>v?new Date(v).toLocaleString("es-PY",{timeZone:"America/Asuncion"}):"Sin fecha";
export function IssueDetails({item}:{item:JiraIssue}) {
 const [data,setData]=useState<IssueDetail|null>(null),[busy,setBusy]=useState(true),[error,setError]=useState(""),[retry,setRetry]=useState(0);
 useEffect(()=>{let alive=true;const controller=new AbortController();setBusy(true);setData(null);setError("");
  const timer=window.setTimeout(()=>controller.abort(),20000);loadIssueDetail(item.key,controller.signal).then(d=>{if(alive)setData(d);}).catch(e=>{if(alive)setError(controller.signal.aborted?"La consulta tardó demasiado. Volvé a consultar.":e.message||"No se pudo leer el detalle.");}).finally(()=>{window.clearTimeout(timer);if(alive)setBusy(false);});
  return()=>{alive=false;window.clearTimeout(timer);controller.abort();};
 },[item.key,retry]);
 const issue=data?.issue||item,f=issue.fields,images=(data?.issue.fields?.attachment||[]).filter(a=>/^image\/(png|jpeg|jpg|gif|webp|avif)$/i.test(a.mimeType||""));
 return <div className="issue-details"><div className="issue-details-title"><span className="tbl-key">{item.key}</span><h3>{f?.summary||"Sin título"}</h3><span className="badge">{f?.status?.name||"Sin estado"}</span></div>
  <dl className="issue-metadata"><div><dt>Responsable</dt><dd>{f?.assignee?.displayName||"Sin asignar"}</dd></div><div><dt>Proyecto</dt><dd>{f?.project?.key||"—"}</dd></div><div><dt>Prioridad</dt><dd>{f?.priority?.name||"—"}</dd></div><div><dt>Creado</dt><dd>{date(f?.created)}</dd></div><div><dt>Actualizado</dt><dd>{date(f?.updated)}</dd></div><div><dt>Finalizado</dt><dd>{date(f?.resolutiondate)}</dd></div></dl>
  {busy&&<p className="cf-empty" role="status">Cargando descripción, comentarios e imágenes…</p>}
  {error&&<div className="action-error" role="alert">{error}<button className="cf-btn" onClick={()=>setRetry(v=>v+1)}>Volver a cargar detalle</button></div>}
  <section className="issue-description"><h4><FileText size={19}/>Descripción del ticket</h4><p className="issue-body">{plainDescription(f?.description)||"Este ticket no tiene descripción."}</p></section>
  {!busy&&data&&<><section className="issue-comments"><h4><MessageSquare size={19}/>Comentarios y respuestas <span>{data.comments.length}</span></h4>{data.commentsError&&<p className="action-error" role="alert">{data.commentsError}</p>}{data.comments.map(c=><article key={c.id} className="issue-comment"><header><strong>{c.author?.displayName||"Autor no disponible"}</strong><time>{date(c.created)}</time></header><p className="issue-body">{plainDescription(c.body)||"Comentario sin texto; puede contener archivos adjuntos."}</p></article>)}{!data.comments.length&&!data.commentsError&&<p className="cf-empty">Sin comentarios registrados.</p>}</section>
  <ImageGallery issueKey={item.key} attachments={images}/></>}
  <a className="cf-a issue-external" href={JIRA_BROWSE+item.key} target="_blank" rel="noopener noreferrer"><ExternalLink size={16}/>Abrir caso completo en Jira</a>
 </div>;
}
