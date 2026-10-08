import { ChevronLeft, ChevronRight } from "lucide-react";
export function Pagination({ page, total, onChange }: { page: number; total: number; onChange: (page: number) => void }) {
 if (total <= 1) return null;
 const pages = [...new Set([1,2,page-1,page,page+1,total-1,total].filter(n=>n>0&&n<=total))].sort((a,b)=>a-b);
 return <nav className="case-pagination" aria-label="Paginación de resultados"><button aria-label="Página anterior" disabled={page===1} onClick={()=>onChange(page-1)}><ChevronLeft size={16}/></button>{pages.map((n,i)=><span key={n}>{i>0&&n>pages[i-1]+1&&<span className="page-gap">…</span>}<button aria-label={`Página ${n}`} aria-current={page===n?'page':undefined} onClick={()=>onChange(n)}>{n}</button></span>)}<button aria-label="Página siguiente" disabled={page===total} onClick={()=>onChange(page+1)}><ChevronRight size={16}/></button></nav>;
}
