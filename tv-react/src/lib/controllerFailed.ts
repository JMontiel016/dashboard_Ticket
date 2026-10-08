import { clientName, rememberName } from "./clientNames";
import { API_BASE, CTRL_MON } from "../config/constantes";
import type { Assessment, BullJob, BullQueue, FailedClient, FailedRow } from "../types/bull";

/*
 * Lee exclusivamente Failed de las tres colas.
 * Diagnóstico separado por cola y RUC distintos:
 * 1–6 verificar; 7 alerta; 8–9 posible intermitencia; >=10 umbral de intermitencia.
 * Los mensajes y trabajos originales siguen disponibles para comprobar la causa.
 */

type Obj = Record<string, unknown>;

/** URL de una cola del monitor del Controller filtrada por estado. */
export const cfQueueUrl = (q: string, st: string): string =>
  `${q === "envioSifen" ? "https://core-monitor.futura100.com.py/admin/trabajos/" : CTRL_MON}queue/${encodeURIComponent(q)}?status=${st}`;

/** Primer valor no vacío. */
const firstOf = (...v: unknown[]): unknown => v.find((x) => x !== undefined && x !== null && x !== "") ?? "";

/** Intenta parsear JSON si es string. */
function jparse(v: unknown): unknown {
  if (typeof v !== "string") return v;
  try { return JSON.parse(v); } catch { return v; }
}

const isObj = (v: unknown): v is Obj => !!v && typeof v === "object";
const pick = (o: unknown, ...path: string[]): unknown =>
  path.reduce<unknown>((acc, k) => (isObj(acc) ? acc[k] : undefined), o);

/** Busca una clave en profundidad (hasta 6 niveles), parseando strings JSON. */
function findField(v: unknown, k: string, d = 0): unknown {
  const o = jparse(v);
  if (!isObj(o) || d > 6) return undefined;
  if (o[k] != null) return o[k];
  for (const c of Object.values(o)) {
    const f = findField(c, k, d + 1);
    if (f !== undefined) return f;
  }
  return undefined;
}


function toDt(v: unknown): Date | null {
  if (!v || (typeof v !== "number" && typeof v !== "string")) return null;
  const d = new Date(typeof v === "number" && v < 1e12 ? v * 1000 : v);
  return isNaN(d.valueOf()) ? null : d;
}

/** Fecha y hora en zona America/Asuncion. */
export function fmtDt(d: Date | null): string {
  if (!d) return "No disponible";
  return new Intl.DateTimeFormat("es-PY", { timeZone: "America/Asuncion", dateStyle: "short", timeStyle: "medium" }).format(d);
}

/** Normaliza un job Bull Failed a una fila de análisis. */
export function normJob(job: BullJob, queue: string): FailedRow {
  const data = (jparse(job.data) || {}) as Obj;
  const doc = (jparse(pick(data, "jobData", "jsonData")) || jparse(pick(data, "jsonData")) || data) as Obj;
  const lot = String(firstOf(doc.nro_lote, pick(data, "jobData", "nro_lote"), findField(data, "nro_lote")));
  const xv = firstOf(findField(data, "xml"), findField(data, "xmlData"), findField(data, "xmlFirmado"), findField(data, "XML"), findField(data, "xml_firmado"), findField(data, "xmlString"));
  let xml = typeof xv === "string" ? xv : "";
  // También admite XML codificado en base64, frecuente en datos de envío.
  if (xml && !xml.trim().startsWith("<")) { try { xml = new TextDecoder().decode(Uint8Array.from(atob(xml), c => c.charCodeAt(0))); } catch { xml = ""; } }
  const xmlDoc = xml ? new DOMParser().parseFromString(xml, "application/xml") : null;
  const xmlValue = (name: string) => xmlDoc ? Array.from(xmlDoc.getElementsByTagName("*")).find(el => el.localName === name)?.textContent : undefined;
  const empresa = jparse(firstOf(pick(data, "jobData", "empresa"), pick(data, "empresa"), findField(data, "empresa")));
  const ruc = String(firstOf(
    pick(data, "jobData", "empresa", "ruc"), pick(data, "empresa", "ruc"),
    pick(empresa, "ruc"), findField(data, "dRucEm"), lot.match(/^(\d{6,12})-/)?.[1], xmlValue("dRucEm"),
  ));
  const ld = lot.match(/-(\d{3})-(\d{3})-(\d{7})(?:-|$)/);
  const number = String(firstOf(doc.nro_documento, findField(data, "nro_documento"), ld ? `${ld[1]}-${ld[2]}-${ld[3]}` : undefined,
    findField(data, "dEst") && findField(data, "dPunExp") && findField(data, "dNumDoc") ? `${findField(data, "dEst")}-${findField(data, "dPunExp")}-${findField(data, "dNumDoc")}` : undefined));
  // dNomRec es el RECEPTOR; para el emisor solo razón social del job o dNomEmi del XML.
  const emisor = jparse(firstOf(findField(data, "emisor"), findField(data, "gEmis")));
  const emitterName = String(firstOf(
    pick(empresa, "razon_social"), pick(empresa, "razonSocial"), pick(empresa, "nombre"),
    pick(empresa, "name"), pick(empresa, "denominacion"), pick(empresa, "nombre_empresa"),
    pick(empresa, "nombreFantasia"), pick(empresa, "nombre_fantasia"), pick(empresa, "nombreComercial"), pick(empresa, "nombre_comercial"),
    pick(emisor, "razon_social"), pick(emisor, "razonSocial"), pick(emisor, "nombre"), pick(emisor, "nombreFantasia"),
    data.razon_social, data.razonSocial, doc.razon_social, doc.razonSocial, findField(data, "nombre_empresa"),
    findField(data, "dNomEmi"), xmlValue("dNomEmi"), findField(data, "dNomFanEmi"), xmlValue("dNomFanEmi"),
  ));
  const username = String(pick(empresa, "username") || "");
  const name = emitterName || (username !== ruc && !/^\d+$/.test(username) ? username : "");
  const ev = firstOf(job.failedReason, job.error, job.stacktrace?.[0]);
  const error = typeof ev === "string" ? ev : ev ? JSON.stringify(ev) : "";
  let ef: Obj = {};
  try { ef = JSON.parse(error.match(/\{[^{}]*"estado_documento"[^{}]*\}/)?.[0] ?? "") as Obj; } catch { /* sin estado_documento */ }
  const att = firstOf(job.attemptsMade, job.attempts);
  return {
    id: `${queue}:${job.id ?? ""}`, service: queue === "envioSifen" ? "core" : "controller", queue, ruc, name, nameSource: emitterName ? "emitter" : "username", number, lot, error,
    status: String(firstOf(ef.estado_documento)),
    failedAt: toDt(firstOf(job.finishedOn, job.failedAt, job.failed_at)),
    createdAt: toDt(job.timestamp),
    attempts: typeof att === "number" ? att : String(att),
    data, options: job.opts || {}, stacktrace: job.stacktrace || [],
  };
}

/** Lee todas las páginas de Failed de la cola (máx. 500 páginas de 50). */
async function readQueue(queue: string): Promise<FailedRow[]> {
  const jobs: BullJob[] = [];
  let page = 1, pageCount = 1;
  do {
    const r = await fetch(`${API_BASE}/${queue === "envioSifen" ? "core-failed" : "bull-failed"}?queue=${encodeURIComponent(queue)}&page=${page}&_t=${Date.now()}`, {
      signal: AbortSignal.timeout(15000),
      cache: "no-store", headers: { Accept: "application/json" },
    });
    if (!r.ok) throw new Error("HTTP " + r.status);
    const b = (await r.json()) as { error?: string; queues?: BullQueue[] };
    if (b.error) throw new Error(b.error);
    const q = (b.queues || []).find((x) => x.name === queue);
    if (!q) throw new Error("No se encontró la cola " + queue);
    if (!Array.isArray(q.jobs)) throw new Error("La cola " + queue + " no devolvió un listado de trabajos.");
    jobs.push(...q.jobs);
    pageCount = q.pagination?.pageCount || 1;
    page++;
  } while (page <= pageCount && page <= 500);
  if (page <= pageCount) throw new Error("La cola supera 500 páginas; lectura incompleta.");
  const rows = jobs.map((j) => normJob(j, queue));
  return rows;
}

export const ANALYSIS_QUEUES = ["consultaDocumentoCore", "envioSifen", "RetornoDocumentoCore"] as const;
/** Lee las tres colas; identifica fallos parciales y no sustituye una lectura ausente por cero. */
export async function readCases() {
  const responses = await Promise.allSettled(ANALYSIS_QUEUES.map(queue => readQueue(queue)));
  const rows: FailedRow[] = [], unavailable: string[] = [];
  responses.forEach((response, index) => {
    if (response.status === "fulfilled") rows.push(...response.value);
    else unavailable.push(ANALYSIS_QUEUES[index]);
  });
  return { rows, unavailable };
}

/** Reutiliza nombres del mismo RUC entre las tres colas, conservando sus caracteres. */
export function completeNames(rows: FailedRow[]): FailedRow[] {
  const names = new Map<string, string>();
  rows.forEach(row => { if (row.ruc && row.name && row.name !== row.ruc) names.set(row.ruc, row.name); });
  rows.forEach(row => { if (row.ruc && row.name && row.nameSource === "emitter") names.set(row.ruc, row.name); });
  names.forEach((name, ruc) => rememberName(ruc, name));
  return rows.map(row => ({ ...row, name: clientName(row.ruc, names.get(row.ruc) || row.name) }));
}

/** Agrupa filas por RUC (emisor). */
export function buildClients(rows: FailedRow[]): FailedClient[] {
  const m: Record<string, FailedClient> = {};
  for (const r of rows) {
    if (!r.ruc) continue;
    const c = (m[r.ruc] ??= { ruc: r.ruc, name: r.name, count: 0, documents: new Set(), waiting: 0, rows: [] });
    c.rows.push(r);
    c.count++;
    if (r.number) c.documents.add(r.number);
    if (r.status.toLowerCase() === "en proceso") c.waiting++;
    if (!c.name && r.name) c.name = r.name;
  }
  return Object.values(m).sort((a, b) => b.count - a.count);
}

/** Diagnóstico por RUC distintos con trabajos Failed en una sola cola. */
export function assess(rows: FailedRow[], clients: FailedClient[]): Assessment | null {
  if (!rows.length) return null;
  const n = clients.length;
  const pending = clients.reduce((total, c) => total + c.waiting, 0);
  if (n >= 10) return { lv: "sifen", icon: "", title: "INTERMITENCIA SIFEN · UMBRAL DE 10 CLIENTES", text: `${n} RUC distintos con inconvenientes en esta cola. Revisar respuesta SIFEN y estado del servicio.` };
  if (n >= 8) return { lv: "multi", icon: "", title: "POSIBLE INTERMITENCIA SIFEN", text: `${n} RUC distintos con inconvenientes en esta cola. Verificar respuesta del servicio.` };
  if (n === 7) return { lv: "multi", icon: "", title: "ALERTA · VERIFICAR DATOS DE 7 CLIENTES", text: "Siete RUC distintos. Revisar los errores de cada cliente; todavía no alcanza el umbral de posible intermitencia." };
  if (n > 1) return { lv: "multi", icon: "", title: `VERIFICAR DATOS DE ${n} CLIENTES`, text: "Revisar cada RUC y su error de forma individual." };
  if (n === 1) return { lv: "cert", icon: "", title: "VERIFICAR DATOS DEL CLIENTE", text: `${clients[0].name || "RUC " + clients[0].ruc} · ${rows.length} inconveniente(s). Un mismo RUC cuenta como un solo cliente.${pending ? " Hay lotes en proceso: revisar respuesta y certificado." : " Revisar cada error."}` };
  return { lv: "info", icon: "", title: "VERIFICAR INCONVENIENTES SIN RUC", text: "No se pudo identificar el RUC del emisor en estos trabajos." };
}

/** Ordena por hora de fallo, más reciente primero. */
export const byFailedDesc = (a: FailedRow, b: FailedRow): number =>
  (b.failedAt?.getTime() || 0) - (a.failedAt?.getTime() || 0);
