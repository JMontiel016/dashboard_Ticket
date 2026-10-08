import { UiIcon } from "../ui/UiIcon";
interface Props { lastUpd: string; flash: boolean; status: string;  }

/** Encabezado: título, última actualización, estado y cuenta regresiva. */
export function Header({ lastUpd, flash, status }: Props) {
  return (
    <div className="hdr">
      <div>
        <div className="hdr-title"><span className="dot-live"></span>Panel de Tickets · BEPA
          <span style={{ fontSize: ".9rem", fontWeight: 500, color: "var(--gr)", marginLeft: 12, opacity: flash ? 1 : 0, transition: "opacity .4s" }}><UiIcon symbol="⚡"/> Actualizado</span>
        </div>
        <div className="hdr-sub">{lastUpd.startsWith("Actualizado:") ? lastUpd.split("·").slice(1).join("·").trim() : lastUpd}</div>
      </div>
      <div className="hdr-right">
        <div style={{ marginBottom: 4, fontSize: ".8rem", color: "var(--muted)" }}>{status}</div>

      </div>
    </div>
  );
}
