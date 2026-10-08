/* Preferences change this dashboard's visible team; they never modify Jira users. */
(()=>{
 const KEY='bepa.people.v1';
 const personKey=name=>String(name||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim();
 let prefs;try{prefs=JSON.parse(localStorage.getItem(KEY)||'null');}catch{}
 if(!prefs||!['active','manual'].includes(prefs.mode))prefs={mode:'active',selected:[],hidden:[]};
 prefs.selected=Array.isArray(prefs.selected)?prefs.selected:[];prefs.hidden=Array.isArray(prefs.hidden)?prefs.hidden:[];
 function people(){
  const rows=new Map(),cutoff=Date.now()-30*86400000;
  for(const issue of allIssues){const u=respUser(issue.fields),name=issue._userName||aName(u),id=personKey(name);if(!id)continue;
   if(!rows.has(id))rows.set(id,{id,name,open:0,recent:0,inactive:u?.active===false});
   const r=rows.get(id);if(!isDone(issue.fields.status?.name))r.open++;
   if(new Date(issue.fields.updated||issue.fields.created).getTime()>=cutoff)r.recent++;
  }
  return [...rows.values()].sort((a,b)=>b.recent-a.recent||b.open-a.open||a.name.localeCompare(b.name));
 }
 function visible(){return new Set(people().filter(p=>!p.inactive&&!prefs.hidden.includes(p.id)&&(prefs.mode==='manual'?prefs.selected.includes(p.id):p.open>0&&p.recent>0)).map(p=>p.id));}
 window.bepaPeopleFilter=issues=>{const ids=visible();return issues.filter(i=>ids.has(personKey(i._userName||aName(respUser(i.fields)))));};
 window.bepaPeopleSummary=()=>prefs.mode==='active'?'Colaboradores más activos (30 días)':'Colaboradores elegidos';
 function save(){try{localStorage.setItem(KEY,JSON.stringify(prefs));}catch{status.textContent='La selección funciona, pero el navegador no permitió guardarla.';}window.dispatchEvent(new Event('bepa-people-change'));}
 const bar=document.createElement('section');bar.className='people-controls';
 const label=document.createElement('label');label.textContent='Colaboradores visibles';const select=document.createElement('select');select.setAttribute('aria-label','Colaboradores visibles');for(const [value,text]of [['active','Más activos (30 días)'],['manual','Elegir personas']]){const o=document.createElement('option');o.value=value;o.textContent=text;select.append(o);}select.value=prefs.mode;label.append(select);
 const button=document.createElement('button');button.className='btn';button.textContent='Personalizar equipo';
 const status=document.createElement('span');status.className='people-status';bar.append(label,button,status);document.querySelector('.workspace-heading').after(bar);
 function update(){select.value=prefs.mode;status.textContent=prefs.mode==='active'?`${visible().size} personas · con tareas abiertas y actividad en los últimos 30 días`:`${visible().size} personas elegidas · selección guardada en este navegador`;}
 const oldRender=renderAll;renderAll=function(){oldRender();update();};
 function rerender(){renderAll();}
 select.onchange=()=>{prefs.mode=select.value;if(prefs.mode==='manual'&&!prefs.selected.length){prefs.selected=people().filter(p=>!p.inactive&&p.open>0&&p.recent>0&&!prefs.hidden.includes(p.id)).map(p=>p.id);}save();rerender();if(prefs.mode==='manual')open();};
 let closeActive;
 function open(){
  if(closeActive)return;
  const previous=document.activeElement,overflow=document.body.style.overflow;document.body.style.overflow='hidden';
  const back=document.createElement('div');back.className='people-backdrop';const dialog=document.createElement('div');dialog.className='people-dialog';dialog.setAttribute('role','dialog');dialog.setAttribute('aria-modal','true');dialog.setAttribute('aria-label','Personalizar colaboradores');back.append(dialog);
  const heading=document.createElement('h2');heading.textContent='Personalizar colaboradores';const help=document.createElement('p');help.textContent='Marcá las personas que querés mostrar. En modo automático, las desmarcadas quedan excluidas. Esta selección no cambia datos de Jira.';
  const close=document.createElement('button');close.className='people-close';close.textContent='×';close.setAttribute('aria-label','Cerrar personalización');
  const input=document.createElement('input');input.type='search';input.placeholder='Buscar colaborador';input.setAttribute('aria-label','Buscar colaborador');
  const list=document.createElement('div');list.className='people-options';const choices=new Map();const ids=visible();
  for(const p of people()){
   const row=document.createElement('label');row.className='people-option';const cb=document.createElement('input');cb.type='checkbox';cb.checked=ids.has(p.id);cb.disabled=p.inactive;choices.set(p.id,cb);
   const name=document.createElement('strong');name.textContent=p.name;const detail=document.createElement('small');detail.textContent=p.inactive?'Cuenta inactiva en Jira':`${p.open} tareas abiertas · ${p.recent} actualizadas en 30 días`;row.append(cb,name,detail);list.append(row);
  }
  if(!choices.size){const empty=document.createElement('p');empty.textContent='No hay colaboradores cargados todavía.';list.append(empty);}
  input.oninput=()=>{for(const row of list.children)row.hidden=!row.textContent.toLowerCase().includes(input.value.toLowerCase());};
  const modeLabel=document.createElement('label');modeLabel.textContent='Modo de visualización';const mode=document.createElement('select');mode.setAttribute('aria-label','Modo de visualización');for(const [v,t]of [['active','Más activos'],['manual','Mi selección']]){const o=document.createElement('option');o.value=v;o.textContent=t;mode.append(o);}mode.value=prefs.mode;modeLabel.append(mode);
  const apply=document.createElement('button');apply.className='btn people-apply';apply.textContent='Guardar selección';const all=document.createElement('button');all.className='btn';all.textContent='Marcar activos';all.onclick=()=>people().forEach(p=>{choices.get(p.id).checked=!p.inactive&&p.open>0&&p.recent>0;});
  const footer=document.createElement('div');footer.className='people-dialog-footer';footer.append(all,apply);dialog.append(close,heading,help,modeLabel,input,list,footer);
  const key=e=>{if(e.key==='Escape')finish();if(e.key==='Tab'){const buttons=[...dialog.querySelectorAll('button,input:not(:disabled),select')].filter(e=>e.getClientRects().length);const first=buttons[0],last=buttons.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}};
  function finish(){back.remove();document.body.style.overflow=overflow;document.removeEventListener('keydown',key);previous?.focus();closeActive=null;}
  close.onclick=finish;back.onclick=e=>{if(e.target===back)finish();};apply.onclick=()=>{prefs.mode=mode.value;prefs.selected=[...choices].filter(([,c])=>c.checked).map(([id])=>id);prefs.hidden=[...choices].filter(([,c])=>!c.checked).map(([id])=>id);save();finish();rerender();};
  closeActive=finish;document.body.append(back);document.addEventListener('keydown',key);input.focus();
 }
 button.onclick=open;
 window.addEventListener('storage',e=>{if(e.key!==KEY)return;try{const next=JSON.parse(e.newValue);if(next&&['active','manual'].includes(next.mode)){prefs=next;rerender();}}catch{}});
 update();if(allIssues.length)rerender();
})();
