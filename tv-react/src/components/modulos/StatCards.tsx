import { useEffect, useRef, useState } from "react";
import { CalendarDays, CalendarRange, CircleCheck, Target, ArrowUpRight, X, Search } from "lucide-react";
import type { Counts, JiraIssue } from "../../types/jira";
import { loadIndicator, type Indicator } from "../../lib/jira";
import { AnimatedNumber } from "../ui/AnimatedNumber";
import { Pagination } from "../ui/Pagination";
import { IssueDetails } from "./IssueDetails";
interface Props { counts: Counts | null; loading: boolean }
const stats = [
 {key:"hoy",label:"Ingresados hoy",icon:CalendarDays,description:"Tickets creados hoy, según la fecha de operación de Paraguay."},
 {key:"mes",label:"Ingresados en el mes",icon:CalendarRange,description:"Tickets creados desde el primer día del mes hasta hoy."},
 {key:"fin",label:"Finalizados en el mes",icon:CircleCheck,description:"Tickets finalizados con fecha de resolución desde el primer día del mes hasta hoy."},
 {key:"finHoy",label:"Cerrados hoy",icon:Target,description:"Tickets finalizados cuya fecha de resolución corresponde a hoy."},
] as const;
export function StatCards({counts,loading}:Props){
 const [selected,setSelected]=useState<Indicator|null>(null),[issues,setIssues]=useState<JiraIssue[]>([]),[busy,setBusy]=useState(false),[error,setError]=useState("");
 const [search,setSearch]=useState(""),[page,setPage]=useState(1),[expanded,setExpanded]=useState(""),[retry,setRetry]=useState(0);
 const ref=useRef<HTMLDivElement>(null);
 useEffect(()=>{if(!selected)return;let alive=true;setBusy(true);setIssues([]);setError("");setSearch("");setPage(1);setExpanded("");loadIndicator(selected).then(rows=>{if(alive)setIssues(rows);}).catch(e=>{if(alive)setError(e.message||"No se pudo consultar el listado.");}).finally(()=>{if(alive)setBusy(false);});return()=>{alive=false;};},[selected,retry]);
 useEffect(()=>{if(!selected)return;const previous=document.activeElement as HTMLElement,overflow=document.body.style.overflow;document.body.style.overflow="hidden";ref.current?.querySelector<HTMLElement>("button")?.focus();
  const key=(e:KeyboardEvent)=>{if(document.querySelector(".image-viewer-backdrop"))return;if(e.key==="Escape")setSelected(null);if(e.key!=="Tab")return;const c=[...(ref.current?.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],input')||[])].filter(el=>el.getClientRects().length),first=c[0],last=c[c.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}};
  document.addEventListener("keydown",key);return()=>{document.body.style.overflow=overflow;document.removeEventListener("keydown",key);previous?.focus();};
 },[!!selected]);
 const stat=stats.find(s=>s.key===selected),filtered=issues.filter(i=>`${i.key} ${i.fields?.summary} ${i.fields?.assignee?.displayName} ${i.fields?.status?.name} ${i.fields?.project?.key}`.toLocaleLowerCase("es").includes(search.toLocaleLowerCase("es")));
 const pages=Math.max(1,Math.ceil(filtered.length/10)),current=Math.min(page,pages),chosen=issues.find(i=>i.key===expanded);
 const selectIssue=(key:string)=>{setExpanded(key);if(innerWidth<800)window.setTimeout(()=>document.getElementById("indicator-case-detail")?.scrollIntoView({block:"start",behavior:"smooth"}),0);};
 return <><div className="grid4col">{stats.map(s=><button key={s.key} className="card stat-card" style={{["--accent" as string]:s.key.startsWith("fin")?"var(--gr)":"var(--b)"}} onClick={()=>{setIssues([]);setSearch("");setPage(1);setExpanded("");setError("");setBusy(true);setSelected(s.key);}} aria-haspopup="dialog"><div className="card-icon"><s.icon size={26}/><ArrowUpRight size={18}/></div><div className="card-lbl">{s.label}</div><AnimatedNumber value={counts?counts[s.key]:null} loading={loading}/><div className="card-sub">Ver listado y detalle de casos</div></button>)}</div>
 {stat&&<div className="case-dialog-backdrop" onClick={e=>{if(e.target===e.currentTarget)setSelected(null);}}><div className="case-dialog indicator-dialog" role="dialog" aria-modal="true" aria-labelledby="indicator-title" ref={ref}><header className="indicator-dialog-header"><button className="case-dialog-close" aria-label="Cerrar indicador" onClick={()=>setSelected(null)}><X size={23}/></button><h2 id="indicator-title">{stat.label}</h2><p className="cf-sub">{stat.description}</p></header>
  {busy?<p className="cf-empty" role="status">Consultando todos los casos…</p>:error?<div role="alert" className="action-error">{error}<button className="cf-btn" onClick={()=>setRetry(v=>v+1)}>Volver a consultar</button></div>:<><div className="indicator-summary"><strong>{issues.length} casos en esta consulta</strong><span>{new Set(issues.map(i=>i.fields?.project?.key).filter(Boolean)).size} proyectos</span><span>{issues.filter(i=>!i.fields?.assignee).length} sin asignar</span></div><label className="indicator-search"><Search size={20}/><input className="cf-input" aria-label="Buscar en indicador" placeholder="Buscar ticket, tarea, responsable o estado" value={search} onChange={e=>{setSearch(e.target.value);setPage(1);setExpanded("");}}/></label>
  <div className="indicator-workspace"><section className="indicator-results" aria-label="Listado de casos"><p className="cf-note">{filtered.length} resultados · 10 por página</p>{filtered.slice((current-1)*10,current*10).map(i=><article className={`indicator-case${expanded===i.key?" selected":""}`} key={i.key}><button className="indicator-case-heading" aria-pressed={expanded===i.key} onClick={()=>selectIssue(i.key)}><span className="tbl-key">{i.key}</span><strong>{i.fields?.summary||"Sin título"}</strong><span className="badge">{i.fields?.status?.name||"Sin estado"}</span><small>{i.fields?.assignee?.displayName||"Sin asignar"}</small></button></article>)}{!filtered.length&&<p className="cf-empty">Sin casos para esta consulta.</p>}<Pagination page={current} total={pages} onChange={p=>{setPage(p);setExpanded("");}}/></section>
  <section className="indicator-detail-panel" id="indicator-case-detail" aria-label="Detalle del caso seleccionado">{chosen?<IssueDetails key={chosen.key} item={chosen}/>:<div className="indicator-detail-placeholder"><FilePlaceholder/><h3>Detalle del caso</h3><p>Seleccioná un ticket para ver su descripción, comentarios, respuestas e imágenes adjuntas.</p></div>}</section></div></>}
 </div></div>}</>;
}
function FilePlaceholder(){return <MessagePlaceholder/>;}
function MessagePlaceholder(){return <Search size={36} aria-hidden="true"/>;}
