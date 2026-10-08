import { CLIENTES_POR_RUC } from "../config/clientes";
const KEY = "bepa.client-names.v1";
let learned: Record<string, string> = {};
try { const cache = JSON.parse(localStorage.getItem("bepa.learned-client-names.v1") || "{}"); Object.entries(cache).forEach(([ruc, name]) => { if (/^\d{6,12}$/.test(ruc) && typeof name === "string" && name.trim()) learned[ruc] = name; }); } catch { /* caché opcional */ }
function saved(): Record<string, string> { try { const value = JSON.parse(localStorage.getItem(KEY) || "{}"); return Object.fromEntries(Object.entries(value).filter(([ruc, name]) => /^\d{6,12}$/.test(ruc) && typeof name === "string" && name.trim())) as Record<string, string>; } catch { return {}; } }
export function clientName(ruc: string, incoming = ""): string { return saved()[ruc] || CLIENTES_POR_RUC[ruc] || incoming || learned[ruc] || ""; }
export function rememberName(ruc: string, name: string): void { if (ruc && name && name !== ruc && learned[ruc] !== name) { learned[ruc] = name; try { localStorage.setItem("bepa.learned-client-names.v1", JSON.stringify(learned)); } catch { /* lectura funciona sin almacenamiento */ } } }
export function saveClientName(ruc: string, name: string): void { const next = { ...saved(), [ruc]: name.trim() }; localStorage.setItem(KEY, JSON.stringify(next)); rememberName(ruc, name.trim()); }
