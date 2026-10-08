/* Main workspace: interactions use the existing filtered Jira dataset. */
(()=>{
const titles={ejecutivo:['Resumen ejecutivo','Carga del equipo, prioridades y tiempos en una sola vista.'],detalle:['Tareas por colaborador','Explorá los tickets, sus responsables y su actividad reciente.'],direccion:['Reporte de dirección','Resultados del equipo y alertas para tomar decisiones.'],epicas:['Seguimiento de épicas','Avance por iniciativa; abrí cada grupo para ver sus tickets.']};
const originalPage=setPage;
setPage=function(page){originalPage(page);document.getElementById('workspace-title').textContent=titles[page][0];document.getElementById('workspace-description').textContent=titles[page][1];document.querySelectorAll('.pnav-t').forEach(e=>e.setAttribute('aria-current',e.id==='pn-'+page?'page':'false'));};
const originalRender=renderAll;
renderAll=function(){originalRender();enhance();};
function enhance(){
 window.bepaApplyTheme?.();
 const summary=document.getElementById('filter-summary');
 const parts=Object.entries(msState).flatMap(([key,values])=>[...values].map(v=>key==='user'?(_userIdMap[v]||'Colaborador'):v));
 if(searchQ)parts.push('Ticket: '+searchQ);if(descQ)parts.push('Tarea: '+descQ);if(filterFrom||filterTo)parts.push('Rango de fechas');
 if(window.bepaPeopleSummary)parts.push(window.bepaPeopleSummary());
 summary.textContent=(_lastIss.length+' tickets · '+_lastUsers.length+' colaboradores')+(parts.length?' · '+parts.join(' / '):' · Todos los datos');
 document.querySelectorAll('.rdir-kpi').forEach(el=>{el.tabIndex=0;el.setAttribute('role','button');el.title='Explorar estas tareas';el.onclick=()=>{const label=el.querySelector('.rdir-kpi-l').textContent;if(label.includes('Proyectos')){toggleMs('proj');return;}if(label.includes('Tiempo')){setPage('ejecutivo');document.getElementById('ctime-exec-wrap').scrollIntoView({behavior:'smooth'});return;}activeTab=label.includes('en curso')?'enc':label.includes('por hacer')||label.includes('sin actividad')?'por':'all';setPage('detalle');renderAll();};});
 document.querySelectorAll('.ch-t').forEach(el=>{el.title='Seleccioná una barra para ver las tareas del colaborador';});
 [cExec,cExecTime].filter(Boolean).forEach(chart=>{chart.options.onClick=(event,elements)=>{if(!elements.length)return;const users=chart===cExec?_lastUsers.slice(0,12):_lastUsers.filter(u=>u.totEst>0||u.totSpent>0).slice(0,8);if(users[elements[0].index])goToUser(users[elements[0].index].id);};chart.options.onHover=(e,items)=>{e.native.target.style.cursor=items.length?'pointer':'default';};chart.update('none');});
 document.querySelectorAll('.uh,.epic-hdr,tr[onclick]').forEach(el=>{el.tabIndex=0;el.setAttribute('role',el.tagName==='TR'?'button':'button');el.title='Abrir detalle';});
}
document.getElementById('toggle-filters').onclick=function(){const closed=document.body.classList.toggle('filters-collapsed');this.setAttribute('aria-expanded',String(!closed));};
document.getElementById('reset-filters').onclick=()=>{Object.keys(msState).forEach(k=>{msState[k].clear();updateMsLabel(k);document.querySelectorAll('#ms-'+k+'-opts input').forEach(cb=>cb.checked=false);});searchQ='';descQ='';filterFrom=null;filterTo=null;doneFrom=null;doneTo=null;['sq','dq','gf-from','gf-to'].forEach(id=>document.getElementById(id).value='');['sq-clear','dq-clear','gf-clear'].forEach(id=>document.getElementById(id).style.display='none');activeTab='all';renderAll();};
document.getElementById('export-dashboard').onclick=()=>{
 if(!_lastIss.length){document.getElementById('filter-summary').textContent='No hay tickets para exportar';return;}
 const cell=v=>'"'+String(v??'').replace(/"/g,'""').replace(/^[=+@-]/,"'$&")+'"';
 const rows=[['Ticket','Tarea','Estado','Responsable','Proyecto','Estimado (h)','Usado (h)','Restante (h)'],..._lastIss.map(i=>{const f=i.fields;return[i.key,f.summary,f.status?.name,aName(respUser(f)),pName(f.project),(f.timeoriginalestimate||0)/3600,(f.timespent||0)/3600,(f.timeestimate||0)/3600];})];
 const url=URL.createObjectURL(new Blob(['\ufeff'+rows.map(r=>r.map(cell).join(';')).join('\r\n')],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='bepa-tickets-'+new Date().toISOString().slice(0,10)+'.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
};
['detalle','direccion','epicas'].forEach(view=>{
 const bar=document.createElement('div');bar.className='view-controls';
 bar.innerHTML='<span>Detalle de la vista</span><button class="btn" data-expand="true">Expandir todo</button><button class="btn" data-expand="false">Contraer todo</button>';
 document.getElementById('v-'+view).prepend(bar);
 bar.onclick=e=>{const b=e.target.closest('[data-expand]');if(!b)return;const open=b.dataset.expand==='true';if(view==='epicas')expandAllEpics(open);else document.querySelectorAll('#v-'+view+' .ub').forEach(el=>{el.style.display=open?'':'none';el.previousElementSibling?.querySelector('.chev')?.classList.toggle('open',open);});};
 if(view==='direccion'){bar.querySelectorAll('button').forEach(b=>b.remove());const print=document.createElement('button');print.className='btn';print.textContent='Imprimir reporte';print.onclick=()=>window.print();bar.append(print);}
});
document.addEventListener('keydown',e=>{if(e.target.matches('input,textarea,select'))return;if(e.key==='/'){e.preventDefault();document.body.classList.remove('filters-collapsed');document.getElementById('toggle-filters').setAttribute('aria-expanded','true');document.getElementById('sq').focus();}});
const oldEpics=renderEpics;renderEpics=function(issues){oldEpics(issues);enhance();};
const oldDirection=renderDireccion;renderDireccion=function(...args){oldDirection(...args);enhance();};
const symbols={'toggle-filters':'<path d="M4 7h16M7 12h10M10 17h4"/>','reset-filters':'<path d="M3 11a9 9 0 1 1 3 8M3 4v7h7"/>','export-dashboard':'<path d="M12 3v12m-4-4 4 4 4-4M5 16v5h14v-5"/>'};
Object.entries(symbols).forEach(([id,path])=>document.getElementById(id).insertAdjacentHTML('afterbegin','<svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true">'+path+'</svg> '));
setPage(activePage);enhance();
})();
