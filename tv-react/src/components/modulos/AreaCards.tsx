import { motion } from "motion/react";
import { AlertCircle, Headphones, Code2, Server, MessageCircle, ArrowUpRight } from "lucide-react";
import type { Area, Counts } from "../../types/jira";
import { AnimatedNumber } from "../ui/AnimatedNumber";

interface Props {
  counts: Counts | null;
  loading: boolean;
  activeArea: Area | null;
  onSelect: (a: Area) => void;
}

interface Def { area: Area; cls: string; icon: string; lbl: string; key: keyof Counts; sub: string; members?: string }

const ICONS = { "sin-asignar": AlertCircle, soporte: Headphones, desarrollo: Code2, infra: Server, wa: MessageCircle };
const DEFS: Def[] = [
  { area: "sin-asignar", cls: "acc-r", icon: "🔴", lbl: "Sin Asignar", key: "sin", sub: "tickets activos" },
  { area: "soporte", cls: "acc-b", icon: "🎧", lbl: "Soporte", key: "sop", sub: "tickets activos", members: "Jaime · Diana · Jorge · Marcos · Leticia · Anibal" },
  { area: "desarrollo", cls: "acc-p", icon: "💻", lbl: "Desarrollo", key: "dev", sub: "tickets activos", members: "Kevin · Daril · Rodrigo · Aldo · Elias · Gustavo · Danays · Blanca" },
  { area: "infra", cls: "acc-g", icon: "🖥️", lbl: "Infraestructura", key: "inf", sub: "tickets activos", members: "Richard · Fabian" },
];

/** Fila superior: tarjetas por área (clic abre el panel de tickets). */
export function AreaCards({ counts, loading, activeArea, onSelect }: Props) {
  const cardCls = (a: Area, cls: string) => `card clickable ${cls}${activeArea === a ? " active-card" : ""}`;
  return (
    <div className="grid4">
      {DEFS.map((d, index) => (
        <motion.button type="button" key={d.area} className={cardCls(d.area, d.cls)} onClick={() => onSelect(d.area)} aria-pressed={activeArea === d.area} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * .06 }} whileHover={{ y: -4 }} whileTap={{ scale: .98 }}>
          <div className="card-icon">{(() => { const Icon = ICONS[d.area]; return <Icon size={25}/>; })()}<ArrowUpRight className="card-arrow" size={18}/></div><div className="card-lbl">{d.lbl}</div>
          <AnimatedNumber value={counts ? counts[d.key] : null} loading={loading} />
          <div className="card-sub">{d.sub}</div>
          {d.members && <div className="card-members">{d.members}</div>}
        </motion.button>
      ))}
      <motion.button type="button" className={cardCls("wa", "acc-wa")} onClick={() => onSelect("wa")} aria-pressed={activeArea === "wa"} whileHover={{ y: -4 }} whileTap={{ scale: .98 }}>
        <div className="card-icon"><MessageCircle size={25}/><ArrowUpRight className="card-arrow" size={18}/></div><div className="card-lbl">WhatsApp</div>
        <AnimatedNumber value={counts ? counts.waHoy : null} loading={loading} />
        <div className="card-sub">ingresados hoy</div>
      </motion.button>
    </div>
  );
}
