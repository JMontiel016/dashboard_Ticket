import type { FailedRow } from "../types/bull";
/** Un envío por clic. Una respuesta incierta nunca se reintenta automáticamente. */
export async function runJobAction(row: FailedRow, action: "retry" | "delete") {
  const id = row.id.slice(row.queue.length + 1);
  const response = await fetch("/api/bull-job-action", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ queue: row.queue, id, action }), signal: AbortSignal.timeout(35000),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok || !data?.ok) throw new Error(data?.error || "No se pudo confirmar la acción. Actualizá la cola antes de reintentar.");
}
