import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useReducedMotion } from "motion/react";
interface Props { value: number | null; loading?: boolean; className?: string; style?: CSSProperties }
/** Interpolación breve por frames, cancelada al cambiar el valor o desmontar. */
export function AnimatedNumber({ value, loading = false, className = "card-num", style }: Props) {
  const [shown, setShown] = useState<number | null>(value);
  const current = useRef<number | null>(value);
  const reduced = useReducedMotion();
  useEffect(() => {
    if (value === null || reduced || current.current === null) { current.current = value; setShown(value); return; }
    const start = current.current, target = value, begin = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const progress = Math.min(1, (now - begin) / 550);
      const result = Math.round(start + (target - start) * (1 - Math.pow(1 - progress, 3)));
      current.current = result; setShown(result);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, reduced]);
  return <div className={`${className}${loading && value === null ? " loading" : ""}`} style={style} aria-label={value === null ? "Sin lectura" : String(value)}>{shown === null ? "—" : shown.toLocaleString("es-PY")}</div>;
}
