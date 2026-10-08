import { List, LayoutGrid, Activity, ExternalLink, Server } from "lucide-react";
import type { BullData, BullQueue, BullView } from "../../types/bull";

import { MONITOR_URLS, Q_LABELS } from "../../config/constantes";
interface Props { data: BullData | null; view: BullView; setView: (v: BullView) => void; origin: "all" | "core" | "controller"; onOriginChange: (v: "all" | "core" | "controller") => void }
export const queueLevel = (queue: BullQueue) => typeof queue.counts?.failed !== "number" ? "unknown" : queue.counts.failed >= 20 ? "danger" : queue.counts.failed > 0 ? "warning" : "normal";
function QueueList({ queues, title, base, view }: { queues: BullQueue[] | null; title: string; base: string; view: BullView }) {
  return <section className={`queue-list view-${view}`}><h3><Server size={18}/>{title}</h3><div className="queue-view-items">{queues ? queues.length ? queues.map(queue => {
    const level = queueLevel(queue), count = queue.counts?.failed;
    return <a className={`queue-list-row queue-level-${level}`} key={queue.name} href={`${base.replace(/\/?$/, "/")}queue/${encodeURIComponent(queue.name)}?status=failed`} target="_blank" rel="noopener noreferrer">
      {view === "gauge" && <svg className="queue-gauge" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="40" className="gauge-track"/><circle cx="50" cy="50" r="40" className="gauge-value" strokeDasharray={`${count === undefined ? 0 : Math.min(count / 20, 1) * 251.3} 251.3`}/><text x="50" y="55" textAnchor="middle">{count ?? "—"}</text></svg>}
      <span className="queue-name"><strong>{Q_LABELS[queue.name] || queue.name}</strong><small>{queue.name}</small><small>{count === undefined ? "Estado no disponible" : count > 0 ? "Con inconvenientes" : "Sin inconvenientes registrados"}</small></span>
      <div className="queue-list-counts"><span className="queue-status">{count ?? "—"} inconvenientes</span><span>{queue.counts?.active ?? "—"} activos</span><span>{queue.counts?.waiting ?? "—"} en espera</span><ExternalLink size={16}/></div>
    </a>;
  }) : <p className="empty">Sin colas recibidas.</p> : <p className="empty" role="status">Lectura no disponible para este origen.</p>}</div></section>;
}
/** Tres formatos conservan el mismo estado y el enlace exacto de cada cola. */
export function BullSection({ data, view, setView, origin, onOriginChange }: Props) {

  return <section className="bull-section"><div className="section-title"><List size={17}/>Colas de trabajo · Futura100</div><div className="bull-topo-box"><div className="bull-topo-hdr"><div className="bull-topo-ttl">Listado de servicios</div></div>
    <div className="queue-toolbar"><div role="group" aria-label="Formato de servicios">{[{id:"list",label:"Lista",icon:List},{id:"cards",label:"Tarjetas",icon:LayoutGrid},{id:"gauge",label:"Indicadores",icon:Activity}].map(item=><button key={item.id} className="cf-btn" aria-pressed={view===item.id} onClick={()=>setView(item.id as BullView)}><item.icon size={16}/>{item.label}</button>)}</div><div role="group" aria-label="Origen de servicios">{[{id:"all",label:"Todos"},{id:"core",label:"Solo Core"},{id:"controller",label:"Solo Controller"}].map(item=><button key={item.id} className="cf-btn" aria-pressed={origin===item.id} onClick={()=>onOriginChange(item.id as Props["origin"])}>{item.label}</button>)}</div></div>
    <div className={`queue-lists${origin!=="all"?" single-origin":""}`}>{origin!=="controller"&&<QueueList queues={data?.cQ ?? null} title="Core · Envíos" base={MONITOR_URLS.core} view={view}/>} {origin!=="core"&&<QueueList queues={data?.tQ ?? null} title="Controller · Estados y retornos" base={MONITOR_URLS.controller} view={view}/>}</div></div></section>;
}
