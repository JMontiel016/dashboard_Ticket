import { useEffect, useRef, useState } from "react";
import { CHECK_INTERVAL } from "../config/constantes";
/** La siguiente consulta se programa después de la anterior, evitando solicitudes superpuestas. */
export function usePolling(refresh: () => Promise<void>) {
  const [countdown, setCountdown] = useState(CHECK_INTERVAL);
  const [status, setStatus] = useState("Conectando…");
  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;
  useEffect(() => {
    let alive = true, busy = false, remaining = CHECK_INTERVAL;
    async function run() {
      if (busy || !alive) return;
      busy = true; setStatus("Actualizando…");
      try { await refreshRef.current(); if (alive) setStatus("● consulta automática"); }
      catch { if (alive) setStatus("Error · reintentando"); }
      finally { busy = false; remaining = CHECK_INTERVAL; if (alive) setCountdown(remaining); }
    }
    void run();
    const timer = window.setInterval(() => {
      if (busy || document.hidden) return;
      remaining = Math.max(0, remaining - 1); setCountdown(remaining);
      if (remaining === 0) void run();
    }, 1000);
    const visible = () => { if (!document.hidden) void run(); };
    document.addEventListener("visibilitychange", visible);
    return () => { alive = false; window.clearInterval(timer); document.removeEventListener("visibilitychange", visible); };
  }, []);
  return { countdown, status };
}
