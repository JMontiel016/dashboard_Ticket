import { UiIcon } from "../ui/UiIcon";
import { useEffect, useState } from "react";
import { JIRA_BROWSE, TEAMS } from "../../config/constantes";
import { sCat } from "../../lib/utils";
import type { JiraIssue } from "../../types/jira";
interface Preference { mode: "active" | "manual"; selected: string[]; hidden: string[] }
const personKey=(n:string)=>n.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/\s+/g," ").trim();
function readPreference(): Preference {try{const p=JSON.parse(localStorage.getItem("bepa.people.v1")||"null");if(p&&["active","manual"].includes(p.mode))return{mode:p.mode,selected:Array.isArray(p.selected)?p.selected:[],hidden:Array.isArray(p.hidden)?p.hidden:[]};}catch{}return{mode:"active",selected:[],hidden:[]};}
interface UserLoad { key: string; name: string; enc: number; por: number; total: number; recent: boolean }
/** People with actual active work; shares the dashboard's team selection. */
export function SoporteRank({ issues }: { issues: JiraIssue[] | null }) {
 const [selected,setSelected]=useState<string|null>(null),[preference,setPreference]=useState(readPreference);
 useEffect(()=>{const update=()=>setPreference(readPreference());window.addEventListener("storage",update);window.addEventListener("bepa-people-change",update);return()=>{window.removeEventListener("storage",update);window.removeEventListener("bepa-people-change",update);};},[]);
 const map=new Map<string,UserLoad>();
 for(const i of issues||[]){const name=i.fields?.assignee?.displayName||"",key=personKey(name),cat=sCat(i.fields?.status?.name);
  if(i.fields?.assignee?.active===false||!TEAMS.soporte.some(n=>name.toLowerCase().startsWith(n))||!["enc","por"].includes(cat))continue;
  if(!map.has(key))map.set(key,{key,name,enc:0,por:0,total:0,recent:false});const r=map.get(key)!;if(cat==="enc")r.enc++;else r.por++;r.total++;r.recent ||= new Date(i.fields?.updated||i.fields?.created||"").getTime()>=Date.now()-30*86400000;
 }
 const rows=[...map.values()].filter(r=>!preference.hidden.includes(r.key)&&(preference.mode==="manual"?preference.selected.includes(r.key):r.recent)).sort((a,b)=>b.total-a.total);
 const max=Math.max(1,...rows.map(r=>r.total));
 return <div className="sop-section"><div className="sop-section-title"><UiIcon symbol="🎧"/> Carga de trabajo · Soporte</div><p className="cf-note">{preference.mode==="manual"?"Tu selección de colaboradores":"Personas con tareas activas y actividad en los últimos 30 días"} · <a className="cf-a" href="/">Personalizar equipo</a></p>
  {rows.map(u=><button type="button" key={u.key} className={`sop-row${selected===u.key?" selected":""}`} onClick={()=>setSelected(selected===u.key?null:u.key)} aria-pressed={selected===u.key} title={`Ver tickets de ${u.name}`}><div className="sop-name">{u.name}</div><div className="sop-bar-wrap"><div className="sop-bar-enc" style={{width:`${u.enc/max*100}%`}}/><div className="sop-bar-por" style={{width:`${u.por/max*100}%`}}/></div><div className="sop-total">{u.total}</div><div className="sop-badges">{u.enc>0&&<span className="sop-badge enc"><UiIcon symbol="⚡"/> {u.enc}</span>}{u.por>0&&<span className="sop-badge por">○ {u.por}</span>}</div></button>)}
  {!issues?<p className="cf-empty">Consultando carga de trabajo…</p>:!rows.length?<p className="cf-empty">No hay tareas activas para los colaboradores visibles.</p>:null}
  {selected&&rows.some(r=>r.key===selected)&&<div className="rank-detail"><div className="rank-detail-head"><strong>Tickets de {rows.find(r=>r.key===selected)?.name}</strong><button onClick={()=>setSelected(null)} aria-label="Cerrar tickets">×</button></div>{(issues||[]).filter(i=>personKey(i.fields?.assignee?.displayName||"")===selected&&["enc","por"].includes(sCat(i.fields?.status?.name))).map(i=><a key={i.key} href={JIRA_BROWSE+i.key} target="_blank" rel="noopener noreferrer"><strong>{i.key}</strong><span>{i.fields?.summary}</span><small>{i.fields?.status?.name}</small></a>)}</div>}
 </div>;
}
