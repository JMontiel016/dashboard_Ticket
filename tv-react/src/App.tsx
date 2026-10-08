import { useCallback, useEffect, useRef, useState } from "react";
import { AreaCards } from "./components/modulos/AreaCards";
import { BullSection } from "./components/modulos/BullSection";
import { CtrlPanel } from "./components/modulos/CtrlPanel";
import { Header } from "./components/modulos/Header";
import { SoporteRank } from "./components/modulos/SoporteRank";
import { StatCards } from "./components/modulos/StatCards";
import { TicketPanel, type Tab } from "./components/modulos/TicketPanel";
import { useBull } from "./hooks/useBull";
import { useControllerFailed } from "./hooks/useControllerFailed";
import { useJiraDashboard } from "./hooks/useJiraDashboard";
import { usePolling } from "./hooks/usePolling";
import { MotionConfig, motion } from "motion/react";
import { TvControls } from "./components/ui/TvControls";
import { severity, queueReadError } from "./lib/severity";
import { ChevronDown } from "lucide-react";
import { FoldSection } from "./components/ui/FoldSection";
import type { Area } from "./types/jira";

/** Panel TV de BEPA: tickets Jira + colas Futura100 + análisis del Controller. */
export default function App() {
  const jira = useJiraDashboard();
  const ctrl = useControllerFailed();
  const bull = useBull();

  const [queueFilter, setQueueFilter] = useState("consultaDocumentoCore");
  const [origin, setOrigin] = useState<"all" | "core" | "controller">("all");
  const selectedRows = ctrl.state.rows.filter(row => row.queue === queueFilter);
  const selectedError = queueReadError(ctrl.state.time, ctrl.state.error, queueFilter);
  const visibleQueues = [...(origin !== "controller" ? bull.data?.cQ || [] : []), ...(origin !== "core" ? bull.data?.tQ || [] : [])];
  const serviceCount = visibleQueues.reduce((total, queue) => total + (queue.counts?.failed || 0), 0);
  const serviceSeverity = visibleQueues.some(q => (q.counts?.failed || 0) >= 20) ? "danger" : serviceCount > 0 || bull.error ? "warning" : "normal";
  // Igual que tv.html: primero Jira, luego (sin esperar) las colas Bull
  const refresh = useCallback(async () => {
    await Promise.all([jira.load(), bull.load(), ctrl.load()]);
  }, [jira.load, bull.load, ctrl.load]);
  const { status } = usePolling(refresh);

  // Panel de tickets por área
  const [area, setArea] = useState<Area | null>(null);
  const [tour, setTour] = useState(false);
  const [compact, setCompact] = useState(true);
  const [tab, setTab] = useState<Tab>("all");
  const panelRef = useRef<HTMLDivElement>(null);
  const selectArea = (a: Area) => {
    setTour(false);
    if (area === a) { setArea(null); return; }
    setArea(a);
    setTab("all");
  };
  useEffect(() => {
    if (area) panelRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [area]);

  const [analysisVisible, setAnalysisVisible] = useState(() => { try { return localStorage.getItem("bepa.analysis") !== "hidden"; } catch { return true; } });
  useEffect(() => { try { localStorage.setItem("bepa.analysis", analysisVisible ? "visible" : "hidden"); } catch { /* opcional */ } }, [analysisVisible]);
  const controllerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!tour) return;
    const areas: Area[] = ["sin-asignar", "soporte", "desarrollo", "infra", "wa"];
    let index = Math.max(0, areas.indexOf(area || "sin-asignar"));
    setArea(areas[index]);
    const timer = window.setInterval(() => {
      if (document.hidden) return;
      index = (index + 1) % areas.length;
      setArea(areas[index]); setTab("all");
    }, 12000);
    return () => window.clearInterval(timer);
  }, [tour]);

  return (
    <MotionConfig reducedMotion="user">
    <main className={`tv-shell${compact ? " compact" : ""}`}>
      <TvControls tour={tour} setTour={setTour} compact={compact} setCompact={setCompact} />
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .45 }}>
      <Header lastUpd={jira.lastUpd} flash={jira.flash} status={jira.lastUpd.startsWith("Error") ? "Jira sin conexión · reintentando" : status} />
      <AreaCards counts={jira.counts} loading={jira.loading} activeArea={area} onSelect={selectArea} />
      <div className="operations-middle">
        <section className="fixed-operation"><h2>Carga de trabajo · Soporte</h2><SoporteRank issues={jira.active} /></section>
        <section className="fixed-operation"><h2>Indicadores de tickets</h2><StatCards counts={jira.counts} loading={jira.loading} /></section>
      </div>
      {bull.error && <p className="tv-notice" role="status">{bull.error}</p>}
      <FoldSection id="services" title="Listado de servicios" severity={serviceSeverity} count={serviceCount}><BullSection data={bull.data} view={bull.view} setView={bull.setView} origin={origin} onOriginChange={setOrigin} /></FoldSection>
      <div ref={controllerRef} id="controller-analysis"><button className={`analysis-visibility alert-${severity(selectedRows, selectedError)}`} aria-expanded={analysisVisible} onClick={() => setAnalysisVisible(v => !v)}><span>Análisis de inconvenientes{selectedRows.length > 0 && <b className="fold-count">{selectedRows.length} inconvenientes</b>}</span><span>{analysisVisible ? "Ocultar" : "Mostrar"}<ChevronDown size={16}/></span></button><div hidden={!analysisVisible}><CtrlPanel embedded open={true} onClose={() => {}} queueFilter={queueFilter} onQueueChange={setQueueFilter} state={ctrl.state} tQ={bull.data?.tQ ?? null} onRefresh={async () => { await Promise.all([ctrl.load(true), bull.load()]); }} /></div></div>
      <TicketPanel ref={panelRef} area={area} tab={tab} setTab={setTab} onClose={() => setArea(null)} active={jira.active || []} sin={jira.sin} />
      </motion.div>
      <div className="foot">{jira.foot}</div>
    </main>
    </MotionConfig>
  );
}
