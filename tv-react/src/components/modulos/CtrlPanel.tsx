import { CircleCheck, TriangleAlert, Pencil, X, RotateCcw, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { byFailedDesc, cfQueueUrl, fmtDt, assess, buildClients } from "../../lib/controllerFailed";
import { JobAction } from "./JobAction";
import { Pagination } from "../ui/Pagination";
import { severity, queueReadError } from "../../lib/severity";
import { FoldSection } from "../ui/FoldSection";
import { clientName, saveClientName } from "../../lib/clientNames";
import type { CtrlFailedState } from "../../hooks/useControllerFailed";
import type { BullQueue, FailedClient, FailedRow } from "../../types/bull";

interface QueueItem { qname: string; count: number }
type ListItem = FailedRow | FailedClient | QueueItem;
type Detail = { kind: "list"; title: string; items: ListItem[] } | { kind: "job"; row: FailedRow } | null;

const isClient = (x: ListItem): x is FailedClient => "rows" in x;
const isQueue = (x: ListItem): x is QueueItem => "qname" in x;

interface Props {
  open: boolean;
  queueFilter: string;
  onQueueChange: (queue: string) => void;
  embedded?: boolean;
  onClose: () => void;
  state: CtrlFailedState;
  tQ: BullQueue[] | null;
  onRefresh: () => Promise<void>;
}

/** Panel lateral con el análisis completo de fallos de consultaDocumentoCore. */
export function CtrlPanel({ open, onClose, state, tQ, onRefresh, queueFilter, onQueueChange, embedded = false }: Props) {
  const selectedError = queueReadError(state.time, state.error, queueFilter);
  const [page, setPage] = useState(1);
  const [detailPage, setDetailPage] = useState(1);
  const [jobAction, setJobAction] = useState<{ row: FailedRow; action: "retry" | "delete" } | null>(null);
  const [query, setQuery] = useState("");
  const [editRuc, setEditRuc] = useState("");
  const [nameRevision, setNameRevision] = useState(0);
  const [saveError, setSaveError] = useState("");
  const dialogRef = useRef<HTMLDivElement>(null);
  const [detail, setDetail] = useState<Detail>(null);
  const panelRef = useRef<HTMLElement>(null);

  // Foco dentro del diálogo y restauración al control que lo abrió.
  useEffect(() => {
    if (!open || embedded) return;
    const previous = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.querySelector<HTMLButtonElement>("button")?.focus();
    const trap = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const focusable = Array.from(panelRef.current?.querySelectorAll<HTMLElement>('button, a[href], input, [tabindex="0"]') || []).filter(el => el.getClientRects().length);
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener("keydown", trap);
    return () => { document.body.style.overflow = previousOverflow; document.removeEventListener("keydown", trap); previous?.focus(); };
  }, [open, embedded]);

  useEffect(() => {
    if (!detail && !editRuc) return;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.querySelector<HTMLElement>(editRuc ? "input" : "button")?.focus();
    const trap = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const controls = [...(dialogRef.current?.querySelectorAll<HTMLElement>('button, a[href], input') || [])].filter(el => el.getClientRects().length);
      const first = controls[0], last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener("keydown", trap);
    return () => { document.body.style.overflow = overflow; document.removeEventListener("keydown", trap); previous?.focus(); };
  }, [!!detail, editRuc]);

  // Al abrir siempre se muestra la vista principal
  useEffect(() => { if (open) setDetail(null); }, [open]);

  // Esc: vuelve del detalle o cierra el panel
  useEffect(() => {
    if (!open) return undefined;
    const h = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (jobAction) return;
      if (editRuc) setEditRuc(""); else if (detail) setDetail(null); else if (!embedded) onClose();
    };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [open, detail, onClose, embedded, editRuc, jobAction]);

  const show = (d: Detail) => { setDetailPage(1); setDetail(d); };
  void nameRevision;
  const selectedRows = state.rows.filter(row => row.queue === queueFilter).map(row => ({ ...row, name: clientName(row.ruc, row.name) }));
  const selectedClients = buildClients(selectedRows);
  const selectedAssessment = assess(selectedRows, selectedClients);
  const openClient = (ruc: string) => {
    const c = selectedClients.find((x) => x.ruc === ruc);
    if (c) show({ kind: "list", title: `${c.name || "Completar nombre"} · RUC ${c.ruc}`, items: [...c.rows].sort(byFailedDesc) });
  };
  const openJob = (id: string) => {
    const r = selectedRows.find((x) => x.id === id);
    if (r) show({ kind: "job", row: r });
  };

  const a = selectedAssessment || { lv: "info", icon: "", title: state.loading ? "CONSULTANDO CORE Y CONTROLLER…" : selectedError ? "LECTURA NO DISPONIBLE" : state.time ? "SIN INCONVENIENTES EN LAS COLAS ANALIZADAS" : "ESPERANDO PRIMERA LECTURA", text: selectedError || (state.loading ? "Leyendo los trabajos de la cola. Esperá a que termine la consulta." : state.time ? "La última lectura recibida no contiene trabajos con inconvenientes." : "Todavía no se recibió una lectura de Controller.") };
  const multi = selectedClients.filter((c) => c.count > 1);
  const affQ = ["consultaDocumentoCore", "envioSifen", "RetornoDocumentoCore"].map(name => ({ name, counts: { failed: selectedRows.filter(row => row.queue === name).length } })).filter(queue => queue.counts.failed > 0);
  void tQ;
  const waitingLots = selectedClients.reduce((s, c) => s + c.waiting, 0);
  const q = query.toLocaleLowerCase("es");
  const filteredRows = selectedRows
    .filter((r) => (queueFilter === "all" || r.queue === queueFilter) && `${r.ruc} ${r.name} ${r.number} ${r.queue} ${r.error}`.toLocaleLowerCase("es").includes(q))
    .sort(byFailedDesc);
  const pageCount = Math.max(1, Math.ceil(filteredRows.length / 10));
  const currentPage = Math.min(page, pageCount);
  const visible = filteredRows.slice((currentPage - 1) * 10, currentPage * 10);
  const detailTotal = detail?.kind === "list" ? Math.max(1, Math.ceil(detail.items.length / 10)) : 1;
  const currentDetailPage = Math.min(detailPage, detailTotal);

  const metric = (lbl: string, val: number, onClick: () => void, sub?: string) => (
    <button className="cf-metric" onClick={onClick}><span>{lbl}</span><strong>{val}</strong><small>{sub || "Ver detalle"}</small></button>
  );

  return (
    <>
    <div className={embedded ? "cf-inline" : `cf-overlay${open ? " open" : ""}`} onClick={(e) => { if (!embedded && e.target === e.currentTarget) onClose(); }}>
      <aside className="cf-panel" role={embedded ? "region" : "dialog"} aria-modal={embedded ? undefined : true} aria-label="Análisis de inconvenientes Core y Controller" ref={panelRef}>
        {!embedded && <button className="cf-close" onClick={onClose} aria-label="Cerrar">×</button>}

        <div>
          <div className="cf-head">
            <div>
              <div className="cf-kicker">Futura100 · {queueFilter === "envioSifen" ? "Core" : "Controller"} · {queueFilter}</div>
              <h2>Análisis de inconvenientes</h2>
              <div className="cf-sub" style={{ color: state.error ? "#f87171" : undefined }}>
                {state.error || (state.loading ? "Consultando colas…" : state.time ? "Lectura automática activa" : "Consultando…")}
              </div>
            </div>
            <a className="cf-a" href={cfQueueUrl(queueFilter, "failed")} target="_blank" rel="noreferrer">↗ Abrir cola en el monitor</a>
          </div>

          <div className="analysis-queue-tabs analysis-selectors" aria-label="Elegir análisis">
            {[{ queue: "consultaDocumentoCore", label: "Consulta de estados", origin: "Controller" }, { queue: "envioSifen", label: "Envíos a SIFEN", origin: "Core" }, { queue: "RetornoDocumentoCore", label: "Retorno de datos", origin: "Controller" }].map(item => {
              const count = state.rows.filter(row => row.queue === item.queue).length;
              const unavailable = !!queueReadError(state.time, state.error, item.queue);
              const known = !!state.time && !(unavailable && count === 0);
              const level = !known ? "unknown" : count === 0 ? "ok" : severity(state.rows.filter(row => row.queue === item.queue));
              return <button type="button" key={item.queue} className={`analysis-selector severity-${level}`} aria-pressed={queueFilter === item.queue} onClick={() => { onQueueChange(item.queue); setPage(1); setDetail(null); setQuery(""); }}>
                <span className="analysis-selector-label">{item.label}<small>{item.origin} · {item.queue}</small></span><strong className="analysis-selector-count">{known ? count : "—"}<small>{unavailable ? count ? "lectura anterior" : "sin lectura" : "casos"}</small></strong>
              </button>;
            })}
          </div>
          <p className="cf-note">Por cola: 7 RUC distintos → verificar; 8–9 → posible intermitencia; 10 o más → umbral de intermitencia. Rojo también desde 20 inconvenientes; repetir un mismo RUC no suma clientes.</p>

          <FoldSection id="diagnosis" title="Diagnóstico e indicadores" severity={severity(selectedRows, selectedError)} count={selectedRows.length}><div className={`cf-verdict lv-${a.lv}`} style={{ animation: "none" }}>
            <div>
              <div className="cf-verdict-k">Análisis de inconvenientes</div>
              <div className="cf-verdict-t">{a.lv === "info" ? <CircleCheck size={20}/> : <TriangleAlert size={20}/>} {a.title}</div>
              <div className="cf-verdict-s">{a.text}</div>
            </div>
            <div className="cf-verdict-n">{selectedRows.length} <span style={{ fontSize: ".9rem", fontWeight: 700 }}>casos</span></div>
          </div>

          <div className="cf-metrics">
            {metric("Inconvenientes", selectedRows.length, () => show({ kind: "list", title: "Inconvenientes", items: [...selectedRows].sort(byFailedDesc) }), waitingLots ? `${waitingLots} lote(s) en proceso` : "")}
            {metric("Clientes identificados", selectedClients.length, () => show({ kind: "list", title: "Clientes identificados", items: selectedClients }))}
            {metric("Clientes con varios casos", multi.length, () => show({ kind: "list", title: "Clientes con varios casos", items: multi }))}
            {metric("Colas afectadas", affQ.length, () => show({ kind: "list", title: "Colas afectadas · Core y Controller", items: affQ.map((x) => ({ qname: x.name, count: x.counts?.failed || 0 })) }), "Colas incluidas en el análisis")}
          </div>

          </FoldSection>
          <FoldSection id="clients" title="Clientes afectados" severity={severity(selectedRows, selectedError)} count={selectedRows.length}>
            <div className="cf-sec-hd">
              <button className="cf-link" onClick={() => show({ kind: "list", title: "Todos los clientes", items: selectedClients })}>Ver todos ({selectedClients.length})</button>
            </div>
            <p className="cf-note">RUC y nombre del emisor según los datos del trabajo.</p>
            <div className="cf-clients">
              {selectedClients.slice(0, 4).map((c) => (
                <div key={c.ruc} className="client-card-wrap"><button className="cf-client" onClick={() => c.name ? openClient(c.ruc) : setEditRuc(c.ruc)}>
                  <span title={c.name || "Completar nombre"}>{c.name || "Completar nombre"}</span>
                  <strong>{c.ruc}</strong>
                  <small>{c.count} caso(s) · {c.documents.size} documento(s){c.waiting > 0 && <> · <b className="cf-wait">{c.waiting} en proceso</b></>}</small>
                </button><button className="client-name-edit" aria-label={`Editar nombre del RUC ${c.ruc}`} title="Editar nombre del cliente" onClick={() => { setSaveError(""); setEditRuc(c.ruc); }}><Pencil size={13}/></button></div>
              ))}
              {!selectedClients.length && <p className="cf-empty">No se identificaron emisores en estos trabajos.</p>}
            </div>
          </FoldSection>

          <FoldSection id="logs" title="Registro de inconvenientes" severity={severity(selectedRows, selectedError)} count={selectedRows.length}>
            <div className="cf-sec-hd">
              <input className="cf-input" placeholder="Buscar cliente, RUC, documento o error" value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }} />
            </div>
            <p className="cf-note">{filteredRows.length} trabajos en Failed · 10 por página · página {currentPage} de {pageCount}. Los indicadores abarcan toda la lectura.</p>
            <div className="cf-log">
              {!visible.length ? (
                <p className="cf-empty">{selectedRows.length ? "Sin casos que coincidan con la búsqueda." : "Sin trabajos Failed."}</p>
              ) : (
                <table className="tbl">
                  <thead><tr><th>Hora</th><th>Nombre del cliente / RUC</th><th>Origen y cola</th><th>Documento</th><th>Situación</th><th>Mensaje del sistema</th><th></th></tr></thead>
                  <tbody>
                    {visible.map((r) => (
                      <tr key={r.id}>
                        <td className="tbl-date">{fmtDt(r.failedAt)}</td>
                        <td className="client-identity"><strong>{r.name || <button className="cf-link" onClick={() => setEditRuc(r.ruc)}>Completar nombre</button>}</strong><span>{r.ruc || "RUC no disponible"}</span></td>
                        <td><a className="cf-a" href={cfQueueUrl(r.queue, "failed")} target="_blank" rel="noopener noreferrer">{r.service === "core" ? "Core" : "Controller"} · {r.queue} ↗</a></td>
                        <td className="tbl-key">{r.number || "—"}</td>
                        <td>{r.status
                          ? <span className={`badge ${r.status.toLowerCase() === "en proceso" ? "b-por" : "b-pau"}`}>{r.status}</span>
                          : <span className="tbl-who">Revisar error</span>}</td>
                        <td><div className="cf-err" title={r.error}>{r.error || "Sin mensaje"}</div></td>
                        <td><div className="job-row-actions"><button className="cf-link" onClick={() => openJob(r.id)}>Ver todo</button><button className="cf-link" aria-label={`Reenviar trabajo ${r.id}`} title="Reenviar trabajo Failed" disabled={!!jobAction} onClick={() => setJobAction({ row: r, action: "retry" })}><RotateCcw size={15}/></button><button className="cf-link danger-text" aria-label={`Eliminar trabajo ${r.id}`} title="Eliminar trabajo Failed" disabled={!!jobAction} onClick={() => setJobAction({ row: r, action: "delete" })}><Trash2 size={15}/></button></div></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <Pagination page={currentPage} total={pageCount} onChange={setPage}/>
          </FoldSection>
          <p className="cf-note" style={{ marginTop: 22 }}>Los mensajes son hipótesis para revisar: ningún patrón prueba la causa sin verificar el Error de cada trabajo.</p>
        </div>


      </aside>
    </div>
        {detail && (
          <div className="case-dialog-backdrop" onClick={e => { if (e.target === e.currentTarget) setDetail(null); }}><div className="case-dialog" role="dialog" aria-modal="true" aria-label={detail.kind === "list" ? detail.title : "Detalle del inconveniente"} ref={dialogRef}><button className="case-dialog-close" aria-label="Cerrar detalle" onClick={() => setDetail(null)}><X size={20}/></button>
            <button className="cf-link" onClick={() => setDetail(null)} style={{ marginBottom: 10 }}>‹ Volver al análisis</button>
            {detail.kind === "list" ? (
              <>
                <h2>{detail.title}</h2>
                <p className="cf-sub" style={{ marginBottom: 12 }}>{detail.items.length} resultado(s)</p>
                {detail.items.slice((currentDetailPage-1)*10,currentDetailPage*10).map((it, i) => isClient(it) ? (
                  <div className="client-detail-row" key={it.ruc}><button className="cf-row" onClick={() => openClient(it.ruc)}>
                    {clientName(it.ruc, it.name) || "Completar nombre"} · <span className="cf-mono">RUC {it.ruc}</span> · {it.count} caso(s)
                    {it.waiting > 0 && <> · <b style={{ color: "#fb923c" }}>{it.waiting} en proceso</b></>}
                  </button><button className="cf-link" onClick={() => { setDetail(null); setSaveError(""); setEditRuc(it.ruc); }}><Pencil size={13}/> Editar nombre</button></div>
                ) : isQueue(it) ? (
                  <a key={i} className="cf-row" href={cfQueueUrl(it.qname, "failed")} target="_blank" rel="noreferrer">
                    {it.qname} · <b style={{ color: "#f87171" }}>{it.count} inconvenientes</b> ↗
                  </a>
                ) : (
                  <button key={i} className="cf-row" onClick={() => openJob(it.id)}>
                    <span className="tbl-date">{fmtDt(it.failedAt)}</span> · {clientName(it.ruc, it.name) || "Completar nombre"} · <span className="cf-mono">RUC {it.ruc || "—"}</span> · {it.number || "Sin documento"}
                    {it.status && <> · <b>{it.status}</b></>}
                    <div className="cf-err" style={{ maxWidth: "none", marginTop: 4 }}>{it.error || "Sin mensaje"}</div>
                  </button>
                ))}
                <Pagination page={currentDetailPage} total={detailTotal} onChange={setDetailPage}/>
                {!detail.items.length && <p className="cf-empty">Sin resultados.</p>}
              </>
            ) : (
              <JobDetail r={detail.row} />
            )}
          </div></div>
        )}
    {jobAction && <JobAction row={jobAction.row} action={jobAction.action} onClose={() => setJobAction(null)} onRefresh={onRefresh}/>}
    {editRuc && <div className="case-dialog-backdrop" onClick={e => { if (e.target === e.currentTarget) setEditRuc(""); }}><div className="case-dialog name-dialog" role="dialog" aria-modal="true" aria-label="Nombre del cliente" ref={dialogRef}><button className="case-dialog-close" aria-label="Cerrar nombre" onClick={() => setEditRuc("")}><X size={20}/></button><h2>Nombre del cliente</h2><p>RUC {editRuc}</p><form onSubmit={e => { e.preventDefault(); const name = String(new FormData(e.currentTarget).get("name") || "").trim(); if (!name) return; try { saveClientName(editRuc, name); setNameRevision(v => v + 1); setEditRuc(""); setDetail(null); } catch { setSaveError("No se pudo guardar el nombre en este navegador."); } }}><label>Razón social o nombre de fantasía<input className="cf-input" name="name" required maxLength={250} defaultValue={clientName(editRuc)} autoComplete="off" /></label><p className="cf-note">Se conserva por RUC en este navegador. También podés agregarlo al catálogo clientes.ts para todas las instalaciones.</p>{saveError && <p role="alert">{saveError}</p>}<button className="cf-btn" type="submit">Guardar nombre</button></form></div></div>}
    </>
  );
}

/** Detalle completo de un trabajo Failed. */
function JobDetail({ r }: { r: FailedRow }) {
  const pre = (v: unknown) => <pre className="cf-pre">{typeof v === "string" ? v : JSON.stringify(v, null, 2)}</pre>;
  return (
    <>
      <h2>Trabajo #{r.id}</h2>
      <p className="cf-sub">{r.name || "Completar nombre"} · RUC <span className="cf-mono">{r.ruc || "No disponible"}</span></p>
      <dl className="cf-dl">
        <dt>Cola</dt><dd>{r.queue}</dd>
        <dt>Documento</dt><dd>{r.number || "No disponible"}</dd>
        <dt>Lote</dt><dd className="cf-mono">{r.lot || "No disponible"}</dd>
        <dt>Situación</dt><dd>{r.status || "Revisar error"}</dd>
        <dt>Hora del fallo</dt><dd>{fmtDt(r.failedAt)}</dd>
        <dt>Creado</dt><dd>{fmtDt(r.createdAt)}</dd>
        <dt>Intentos</dt><dd>{r.attempts === "" ? "No disponible" : r.attempts}</dd>
      </dl>
      <h3>Error original</h3>{pre(r.error || "No disponible")}
      <h3>Data</h3>{pre(r.data)}
      <h3>Options</h3>{pre(r.options)}
      <h3>Stacktrace</h3>{pre(r.stacktrace)}
      <a className="cf-a" href={cfQueueUrl(r.queue, "failed")} target="_blank" rel="noreferrer">↗ Abrir cola de origen</a>
    </>
  );
}
