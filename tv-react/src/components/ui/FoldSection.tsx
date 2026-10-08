import { ChevronDown } from "lucide-react";
import { useState, type ReactNode } from "react";
export function FoldSection({ id, title, children, severity = "normal", count }: { id: string; title: string; children: ReactNode; severity?: "normal" | "warning" | "danger"; count?: number }) {
  const [open, setOpen] = useState(() => { try { return localStorage.getItem(`bepa.section.${id}`) !== "closed"; } catch { return true; } });
  return <section className={`fold-section${open ? " expanded" : ""}`}><button type="button" className={`fold-heading alert-${severity}`} aria-expanded={open} aria-controls={`fold-${id}`} onClick={() => { setOpen(!open); try { localStorage.setItem(`bepa.section.${id}`, open ? "closed" : "open"); } catch { /* almacenamiento opcional */ } }}><span>{title}{count !== undefined && count > 0 && <b className="fold-count">{count} inconvenientes</b>}</span><span>{open ? "Ocultar" : "Mostrar"}<ChevronDown size={16}/></span></button><div id={`fold-${id}`} hidden={!open}>{children}</div></section>;
}
