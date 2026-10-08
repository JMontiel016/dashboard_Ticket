import { useCallback, useState } from "react";
import { CTRL_Q, LS_BULL_VIEW } from "../config/constantes";
import { fetchBullData, saveBullHistory } from "../lib/bull";
import type { BullData, BullView } from "../types/bull";

const vistaInicial = (): BullView => {
  try { const v = localStorage.getItem(LS_BULL_VIEW); return v === "gauge" || v === "cards" ? v : "list"; } catch { return "list"; }
};
const noop = () => {};

/** Colas Bull (Core + Controller), vista mapa/gauges y disparo del análisis del Controller. */
export function useBull(onCtrlFailed: (failed?: number) => void = noop) {
  const [error, setError] = useState("");
  const [data, setData] = useState<BullData | null>(null);
  const [view, setViewState] = useState<BullView>(vistaInicial);

  const setView = useCallback((v: BullView) => {
    setViewState(v);
    try { localStorage.setItem(LS_BULL_VIEW, v); } catch { /* bloqueado */ }
  }, []);

  const load = useCallback(async (): Promise<void> => {
    try {
      const d = await fetchBullData();
      if (d.cQ && d.tQ) saveBullHistory(d.cQ, d.tQ);
      setData(d);
      setError(!d.cQ && !d.tQ ? "No se pudo leer Core ni Controller. Verificá la conexión con los monitores." : !d.cQ ? "Core no disponible. Se muestran los datos de Controller." : !d.tQ ? "Controller no disponible. Se muestran los datos de Core." : "");
      // Análisis de fallos de consultaDocumentoCore (solo si la cola respondió)
      if (d.tQ) {
        const q = d.tQ.find((x) => x.name === CTRL_Q);
        onCtrlFailed(q?.counts?.failed);
      }
    } catch (e) {
      console.error("Bull error:", e);
      setError("No se pudo conectar con los monitores.");
    }
  }, [onCtrlFailed]);

  return { data, view, setView, load, error };
}
