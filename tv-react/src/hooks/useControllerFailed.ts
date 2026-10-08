import { useCallback, useRef, useState } from "react";
import { assess, buildClients, readCases, completeNames } from "../lib/controllerFailed";
import type { Assessment, FailedClient, FailedRow } from "../types/bull";
export interface CtrlFailedState { rows: FailedRow[]; clients: FailedClient[]; assess: Assessment | null; error: string; time: Date | null; loading: boolean }
const EMPTY: CtrlFailedState = { rows: [], clients: [], assess: null, error: "", time: null, loading: false };
/** Lectura automática de casos Core y Controller con conservación de lecturas parciales. */
export function useControllerFailed() {
  const [state, setState] = useState<CtrlFailedState>(EMPTY);
  const running = useRef<Promise<void> | null>(null);
  const load = useCallback(async (force = false): Promise<void> => {
    if (running.current) { await running.current; if (!force) return; }
    const task = (async () => {
    setState(previous => ({ ...previous, loading: true }));
    try {
      const result = await readCases();
      setState(previous => {
        const rows = completeNames([...result.rows, ...previous.rows.filter(row => result.unavailable.includes(row.queue))]);
        const clients = buildClients(rows);
        const unavailable = result.unavailable.length;
        return { rows, clients, assess: assess(rows, clients), loading: false,
          time: unavailable === 3 ? previous.time : new Date(),
          error: unavailable ? `Sin lectura de ${result.unavailable.join(", ")}. Se conserva la lectura anterior de esas colas, si existe.` : "" };
      });
    } catch {
      setState(previous => ({ ...previous, loading: false, error: "No se pudo leer el análisis. Se conserva la última lectura." }));
    }
    })();
    running.current = task;
    try { await task; } finally { running.current = null; }
  }, []);
  return { state, load };
}
