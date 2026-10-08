import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import type { FailedRow } from "../../types/bull";
import { runJobAction } from "../../lib/jobActions";
/** La acción autorizada se ejecuta directamente; muestra resultado sin pedir contraseña. */
export function JobAction({ row, action, onClose, onRefresh }: { row: FailedRow; action: "retry" | "delete"; onClose: () => void; onRefresh: () => Promise<void> }) {
  const started = useRef(false);
  const [busy, setBusy] = useState(true), [error, setError] = useState("");
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    async function run() {
      try {
        await runJobAction(row, action);
        try { await onRefresh(); } catch { setError("Acción confirmada. No se pudo actualizar el listado; consultá la cola antes de otra acción."); return; }
        onClose();
      } catch (e) { setError(e instanceof Error ? e.message : "No se pudo confirmar la acción. Actualizá antes de reintentar."); }
      finally { setBusy(false); }
    }
    void run();
  }, [row, action, onClose, onRefresh]);
  return <div className={`job-action-status${error ? " has-error" : ""}`} role={error ? "alert" : "status"}><span>{busy ? `${action === "retry" ? "Reenviando" : "Eliminando"} trabajo ${row.id}…` : error}</span>{!busy && <button className="cf-btn" onClick={onClose} aria-label="Cerrar resultado de acción"><X size={16}/></button>}</div>;
}
