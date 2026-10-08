import type { FailedRow } from "../types/bull";
export function severity(rows: FailedRow[], error = ""): "normal" | "warning" | "danger" {
 const byQueue = new Map<string, FailedRow[]>(); rows.forEach(r => byQueue.set(r.queue, [...(byQueue.get(r.queue) || []), r]));
 if ([...byQueue.values()].some(group => group.length >= 20 || new Set(group.map(r => r.ruc).filter(Boolean)).size >= 10)) return "danger";
 return rows.length || error ? "warning" : "normal";
}

/** Una lectura anterior se mantiene visible, pero nunca se indica como una lectura sana actual. */
export function queueReadError(time: Date | null, error: string, queue: string): string {
 if (!time) return "Sin lectura";
 if (!error) return "";
 const perQueue = ["consultaDocumentoCore", "envioSifen", "RetornoDocumentoCore"].some(q => error.includes(q));
 return !perQueue || error.includes(queue) ? error : "";
}
