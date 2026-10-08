import { JIRA_FIELDS, JIRA_PROXY } from "../config/constantes";
import type { Counts, JiraIssue, JiraSearchResponse } from "../types/jira";
import { dateStr, getTeam } from "./utils";

/** Llama al proxy de Jira con una JQL (paginación por nextPageToken). */
async function callProxy(jql: string, max = 200, tok: string | null = null, fields = JIRA_FIELDS): Promise<JiraSearchResponse> {
  const body: Record<string, unknown> = { jql, fields, maxResults: max };
  if (tok) body.nextPageToken = tok;
  const r = await fetch(JIRA_PROXY, {
    signal: AbortSignal.timeout(15000),
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error("HTTP " + r.status);
  return r.json() as Promise<JiraSearchResponse>;
}

/** Paginación completa: no entrega listados truncados como si fueran completos. */
async function fetchAll(jql: string, fields = JIRA_FIELDS): Promise<JiraIssue[]> {
  const issues = new Map<string, JiraIssue>(), seen = new Set<string>();
  let token: string | null = null, pages = 0;
  do {
    const d = await callProxy(jql, 100, token, fields);
    if (!Array.isArray(d.issues)) throw new Error("Jira no devolvió un listado válido.");
    d.issues.forEach(i => issues.set(i.key, i));
    token = d.nextPageToken || null;
    if (token && (seen.has(token) || ++pages >= 500)) throw new Error("La paginación de Jira quedó incompleta. Volvé a consultar.");
    if (token) seen.add(token);
  } while (token);
  return [...issues.values()];
}
async function fetchCount(jql: string): Promise<number> {
  const d = await callProxy(jql, 1);
  if (!Array.isArray(d.issues)) throw new Error("Jira no devolvió un contador válido.");
  if (typeof d.total === "number") return d.total;
  return (await fetchAll(jql)).length;
}
export type Indicator = "hoy" | "mes" | "fin" | "finHoy";
/** Fecha de operación Paraguay; rangos cerrados al final del día evitan contar fechas futuras. */
export function indicatorQueries(now = new Date()): Record<Indicator, string> {
  const today = dateStr(now), month = today.slice(0, 7) + "-01";
  const end = new Date(today + "T12:00:00Z"); end.setUTCDate(end.getUTCDate() + 1);
  const tomorrow = end.toISOString().slice(0, 10);
  return {
    hoy: `created >= "${today}" AND created < "${tomorrow}"`,
    mes: `created >= "${month}" AND created < "${tomorrow}"`,
    fin: `statusCategory = Done AND resolutiondate >= "${month}" AND resolutiondate < "${tomorrow}"`,
    finHoy: `statusCategory = Done AND resolutiondate >= "${today}" AND resolutiondate < "${tomorrow}"`,
  };
}
export async function loadIndicator(key: Indicator): Promise<JiraIssue[]> {
  return fetchAll(indicatorQueries()[key] + ` ORDER BY ${key.startsWith("fin") ? "resolutiondate" : "created"} DESC`, [...JIRA_FIELDS, "description"]);
}

export interface JiraSnapshot { active: JiraIssue[]; sin: JiraIssue[]; counts: Counts }

/** Consulta Jira y calcula todos los contadores del panel. Lanza error si falla. */
export async function loadJiraSnapshot(): Promise<JiraSnapshot> {
  const queries = indicatorQueries();
  const [active, sin, totalHoy, totalMes, totalFin, totalFinHoy, waHoy] = await Promise.all([
    fetchAll("statusCategory != Done ORDER BY updated DESC"),
    fetchAll("assignee is EMPTY AND statusCategory != Done ORDER BY updated DESC"),
    fetchCount(queries.hoy), fetchCount(queries.mes), fetchCount(queries.fin), fetchCount(queries.finHoy), fetchCount(`${queries.hoy} AND project = CW`),
  ]);
  let sop = 0, dev = 0, inf = 0;
  for (const i of active) {
    const t = getTeam(i.fields?.assignee?.displayName || null);
    if (t === "soporte") sop++;
    else if (t === "desarrollo") dev++;
    else if (t === "infra") inf++;
  }
  const wa = active.filter((i) => i.fields?.project?.key === "CW");
  return {
    active,
    sin,
    counts: {
      sin: sin.length, sop, dev, inf,
      wa: wa.length,
      waHoy,
      hoy: totalHoy,
      mes: totalMes, fin: totalFin, finHoy: totalFinHoy,
    },
  };
}
