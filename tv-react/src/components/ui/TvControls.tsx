import { useEffect, useState } from "react";
import { Play, Pause, Maximize, Minimize, LayoutDashboard, Monitor, Rows3, Sun, Moon } from "lucide-react";
interface Props { tour: boolean; setTour: (v: boolean) => void; compact: boolean; setCompact: (v: boolean) => void }
/** Controles de presentación: la pausa detiene el recorrido, nunca la consulta de datos. */
export function TvControls({ tour, setTour, compact, setCompact }: Props) {
  const [theme, setTheme] = useState(() => { try { return localStorage.getItem("bepa.theme") || "dark"; } catch { return "dark"; } });
  useEffect(() => { document.documentElement.dataset.theme = theme; try { localStorage.setItem("bepa.theme", theme); } catch { /* opcional */ } }, [theme]);
  const [full, setFull] = useState(false);
  const [time, setTime] = useState(new Date());
  const [error, setError] = useState("");
  useEffect(() => {
    const timer = window.setInterval(() => setTime(new Date()), 1000);
    const change = () => setFull(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", change);
    return () => { window.clearInterval(timer); document.removeEventListener("fullscreenchange", change); };
  }, []);
  async function fullscreen() {
    try { setError(""); if (document.fullscreenElement) await document.exitFullscreen(); else await document.documentElement.requestFullscreen(); }
    catch { setError("El navegador no permite pantalla completa en esta ventana."); }
  }
  return <>
    <nav className="tv-controls" aria-label="Controles de TV">
      <a className="tv-brand" href="/"><Monitor size={22} /><span>BEPA<span className="brand-caption">CENTRO DE OPERACIONES</span></span></a>
      <div className="tv-actions">
        <button aria-label={theme === "dark" ? "Activar modo claro" : "Activar modo oscuro"} title={theme === "dark" ? "Modo claro" : "Modo oscuro"} onClick={() => setTheme(v => v === "dark" ? "light" : "dark")}>{theme === "dark" ? <Sun size={18}/> : <Moon size={18}/>}</button>
        <time>{time.toLocaleTimeString("es-PY", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</time>
        <a href="/" title="Dashboard principal"><LayoutDashboard size={17} /><span>Dashboard</span></a>
        <button onClick={() => setTour(!tour)} aria-pressed={tour} title="Recorre las áreas cada 12 segundos">{tour ? <Pause size={17}/> : <Play size={17}/>}<span>{tour ? "Pausar recorrido" : "Recorrido automático"}</span></button>
        <button onClick={() => setCompact(!compact)} aria-pressed={compact} title="Vista compacta"><Rows3 size={17}/><span>Compacto</span></button>
        <button onClick={fullscreen} title="Pantalla completa" aria-label={full ? "Salir de pantalla completa" : "Pantalla completa"}>{full ? <Minimize size={18}/> : <Maximize size={18}/>}</button>
      </div>
    </nav>
    {error && <p role="status" className="tv-notice">{error}</p>}
    {tour && <div className="tour-info"><span className="dot-live"/>Recorrido activo · cambia de área cada 12 s · seleccioná una tarjeta para detenerlo</div>}
  </>;
}
