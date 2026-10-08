import {useCallback,useEffect,useRef,useState} from "react";
import {createPortal} from "react-dom";
import {Image as ImageIcon, ZoomIn, ZoomOut, X, ChevronLeft, ChevronRight, Download, Maximize2, RotateCw} from "lucide-react";
import type {Attachment} from "../../lib/issueDetail";
import {ImageReadError,loadAttachmentImage} from "../../lib/attachmentImage";

interface ImageState {status:"loading"|"ready"|"error";url?:string;error?:ImageReadError;width?:number;height?:number}
interface Resource {controller:AbortController;url?:string}
const bytes=(size?:number)=>size===undefined?"":size>=1024*1024?`${(size/1024/1024).toFixed(1)} MB`:`${Math.max(1,Math.round(size/1024))} KB`;
function ImageMessage({error}:{error:ImageReadError}){
 return <div className="image-load-error" role="alert"><strong>{error.message}</strong>{error.status&&<span className="image-http">HTTP {error.status}</span>}{error.action&&<p>{error.action}</p>}</div>;
}

/** Download through the authenticated server, retain original resolution and release blobs on closing the case. */
export function ImageGallery({issueKey,attachments}:{issueKey:string;attachments:Attachment[]}){
 const [states,setStates]=useState<Record<string,ImageState>>({}),[selected,setSelected]=useState<number|null>(null);
 const resources=useRef(new Map<string,Resource>()),alive=useRef(true);
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;for(const resource of resources.current.values()){resource.controller.abort();if(resource.url)URL.revokeObjectURL(resource.url);}resources.current.clear();};},[issueKey]);
 const load=useCallback((attachment:Attachment)=>{
  if(resources.current.has(attachment.id))return;
  const resource:Resource={controller:new AbortController()};resources.current.set(attachment.id,resource);
  setStates(previous=>({...previous,[attachment.id]:{status:"loading"}}));
  const timer=window.setTimeout(()=>resource.controller.abort(),20000);
  loadAttachmentImage(issueKey,attachment,resource.controller.signal).then(blob=>{
   if(!alive.current||resources.current.get(attachment.id)!==resource)return;
   resource.url=URL.createObjectURL(blob);setStates(previous=>({...previous,[attachment.id]:{status:"ready",url:resource.url}}));
  }).catch(error=>{
   if(!alive.current||resources.current.get(attachment.id)!==resource)return;
   const failure=error instanceof ImageReadError?error:new ImageReadError(resource.controller.signal.aborted?"La lectura de la imagen tardó demasiado.":"No se pudo conectar para leer la imagen.",undefined,"Volvé a intentar la carga de este adjunto.");
   setStates(previous=>({...previous,[attachment.id]:{status:"error",error:failure}}));
  }).finally(()=>window.clearTimeout(timer));
 },[issueKey]);
 const retry=useCallback((attachment:Attachment)=>{const resource=resources.current.get(attachment.id);resource?.controller.abort();if(resource?.url)URL.revokeObjectURL(resource.url);resources.current.delete(attachment.id);load(attachment);},[load]);
 const decoded=useCallback((id:string,width:number,height:number)=>setStates(previous=>previous[id]?.width===width&&previous[id]?.height===height?previous:{...previous,[id]:{...previous[id],width,height}}),[]);
 const invalid=useCallback((id:string)=>{const resource=resources.current.get(id);if(resource?.url){URL.revokeObjectURL(resource.url);resource.url=undefined;}setStates(previous=>({...previous,[id]:{status:"error",error:new ImageReadError("El contenido recibido no se puede abrir como imagen.",200,"Volvé a intentar. Si continúa, revisá el archivo original en Jira.","INVALID_IMAGE_BYTES")}}));},[]);
 const close=useCallback(()=>setSelected(null),[]),navigate=useCallback((step:number)=>setSelected(i=>i===null?null:Math.max(0,Math.min(attachments.length-1,i+step))),[attachments.length]);
 return <section className="issue-images"><h4><ImageIcon size={19}/>Imágenes adjuntas <span>{attachments.length}</span></h4>
  {!!attachments.length&&<p className="cf-note">Abrí una imagen para ver todos sus detalles, ampliar, cambiar de adjunto o descargar el original.</p>}
  <div className="issue-image-grid">{attachments.map((attachment,index)=><ImagePreview key={attachment.id} attachment={attachment} state={states[attachment.id]} load={load} retry={retry} decoded={decoded} invalid={invalid} open={()=>setSelected(index)}/>)}</div>
  {!attachments.length&&<p className="cf-empty">Este ticket no tiene imágenes adjuntas disponibles.</p>}
  {selected!==null&&attachments[selected]&&<ImageViewer issueKey={issueKey} attachment={attachments[selected]} state={states[attachments[selected].id]} index={selected} total={attachments.length} load={load} retry={retry} decoded={decoded} invalid={invalid} onClose={close} onNavigate={navigate}/>}
 </section>;
}

interface ImageProps {attachment:Attachment;state?:ImageState;load:(a:Attachment)=>void;retry:(a:Attachment)=>void;decoded:(id:string,w:number,h:number)=>void;invalid:(id:string)=>void}
function ImagePreview({attachment,state,load,retry,decoded,invalid,open}:ImageProps&{open:()=>void}){
 const ref=useRef<HTMLElement>(null);
 useEffect(()=>{if(!ref.current)return;if(!("IntersectionObserver" in window)){load(attachment);return;}const observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){load(attachment);observer.disconnect();}},{rootMargin:"160px"});observer.observe(ref.current);return()=>observer.disconnect();},[attachment.id,load]);
 return <figure ref={ref} className="image-preview">
  {state?.status==="ready"?<button className="image-preview-open" type="button" aria-label={`Ampliar imagen ${attachment.filename}`} onClick={open}><img src={state.url} alt={attachment.filename} onLoad={e=>decoded(attachment.id,e.currentTarget.naturalWidth,e.currentTarget.naturalHeight)} onError={()=>invalid(attachment.id)}/><span><Maximize2 size={16}/>Ampliar imagen</span></button>:state?.status==="error"?<><p className="image-failure-title">No se pudo visualizar {attachment.filename}.</p><ImageMessage error={state.error!}/><button type="button" className="cf-btn image-retry" onClick={()=>retry(attachment)}><RotateCw size={15}/>Reintentar imagen</button></>:<p className="image-loading" role="status"><ImageIcon size={26}/>Cargando imagen…</p>}
  <figcaption><strong>{attachment.filename}</strong><span>{[bytes(attachment.size),attachment.mimeType?.replace("image/","").toUpperCase(),state?.width&&state?.height?`${state.width} × ${state.height} px`:""].filter(Boolean).join(" · ")}</span></figcaption>
  <button className="image-detail-button" type="button" onClick={open}>Ver imagen en detalle</button>
 </figure>;
}

function ImageViewer({issueKey,attachment,state,index,total,load,retry,decoded,invalid,onClose,onNavigate}:ImageProps&{issueKey:string;index:number;total:number;onClose:()=>void;onNavigate:(step:number)=>void}){
 const dialog=useRef<HTMLDivElement>(null),stage=useRef<HTMLDivElement>(null);
 const [zoom,setZoom]=useState<number|"fit">("fit"),[area,setArea]=useState({width:800,height:600});
 useEffect(()=>{load(attachment);setZoom("fit");if(stage.current){stage.current.scrollTop=0;stage.current.scrollLeft=0;}},[attachment.id,load]);
 useEffect(()=>{const element=stage.current;if(!element)return;const resize=()=>setArea({width:Math.max(1,element.clientWidth-48),height:Math.max(1,element.clientHeight-48)});resize();const observer=new ResizeObserver(resize);observer.observe(element);return()=>observer.disconnect();},[]);
 useEffect(()=>{
  const previous=document.activeElement as HTMLElement|null,parent=document.querySelector<HTMLElement>(".case-dialog-backdrop"),oldHidden=parent?.getAttribute("aria-hidden"),oldInert=parent?.hasAttribute("inert");
  // The viewer lives in a portal; only it receives focus and Escape while open.
  parent?.setAttribute("inert","");parent?.setAttribute("aria-hidden","true");dialog.current?.querySelector<HTMLButtonElement>("button")?.focus();
  const key=(event:KeyboardEvent)=>{if(event.key==="Escape"){event.preventDefault();onClose();return;}if(event.key==="ArrowLeft"){event.preventDefault();onNavigate(-1);}if(event.key==="ArrowRight"){event.preventDefault();onNavigate(1);}if(event.key!=="Tab")return;const items=[...(dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled),a[href]')||[])].filter(e=>e.getClientRects().length),first=items[0],last=items.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}};
  document.addEventListener("keydown",key);return()=>{document.removeEventListener("keydown",key);if(parent){if(!oldInert)parent.removeAttribute("inert");if(oldHidden===null)parent.removeAttribute("aria-hidden");else if(oldHidden!==undefined)parent.setAttribute("aria-hidden",oldHidden);}previous?.focus();};
 },[onClose,onNavigate]);
 const fit=state?.width&&state?.height?Math.min(1,area.width/state.width,area.height/state.height):1,scale=zoom==="fit"?fit:zoom;
 const adjust=(amount:number)=>setZoom(Math.round(Math.max(.1,Math.min(4,scale+amount))*100)/100);
 return createPortal(<div className="image-viewer-backdrop"><div className="image-viewer" role="dialog" aria-modal="true" aria-label={`Imagen ${attachment.filename}`} ref={dialog}>
  <header className="image-viewer-header"><button type="button" aria-label="Cerrar visor de imágenes" onClick={onClose}><X size={23}/></button><div><span>{issueKey} · Imagen {index+1} de {total}</span><h2>{attachment.filename}</h2><p>{[bytes(attachment.size),attachment.mimeType?.replace("image/","").toUpperCase(),state?.width&&state?.height?`${state.width} × ${state.height} píxeles originales`:""].filter(Boolean).join(" · ")}{attachment.author?.displayName&&` · Adjuntada por ${attachment.author.displayName}`}</p></div></header>
  <div className="image-viewer-toolbar"><div><button type="button" aria-label="Imagen anterior" disabled={index===0} onClick={()=>onNavigate(-1)}><ChevronLeft size={20}/></button><span>{index+1} / {total}</span><button type="button" aria-label="Imagen siguiente" disabled={index===total-1} onClick={()=>onNavigate(1)}><ChevronRight size={20}/></button></div><div><button type="button" aria-label="Reducir imagen" disabled={state?.status!=="ready"||scale<=.1} onClick={()=>adjust(-.25)}><ZoomOut size={19}/></button><output aria-label="Nivel de zoom">{Math.round(scale*100)}%</output><button type="button" aria-label="Ampliar imagen" disabled={state?.status!=="ready"||scale>=4} onClick={()=>adjust(.25)}><ZoomIn size={19}/></button><button type="button" onClick={()=>setZoom("fit")} aria-pressed={zoom==="fit"}>Ajustar a pantalla</button><button type="button" onClick={()=>setZoom(1)} aria-pressed={zoom===1}>Tamaño original</button></div>{state?.status==="ready"&&<a href={state.url} download={attachment.filename}><Download size={18}/>Descargar original</a>}</div>
  <div className="image-viewer-stage" ref={stage}>{state?.status==="ready"?<div className="image-viewer-canvas"><img src={state.url} alt={attachment.filename} style={state.width&&state.height?{width:state.width*scale,height:state.height*scale}:undefined} onLoad={e=>decoded(attachment.id,e.currentTarget.naturalWidth,e.currentTarget.naturalHeight)} onError={()=>invalid(attachment.id)}/></div>:state?.status==="error"?<div className="image-viewer-message"><ImageIcon size={40}/><h3>{attachment.filename}</h3><ImageMessage error={state.error!}/><button type="button" className="cf-btn image-retry" onClick={()=>retry(attachment)}><RotateCw size={17}/>Volver a cargar imagen</button></div>:<div className="image-viewer-message" role="status"><ImageIcon size={40}/><p>Cargando imagen original…</p></div>}</div>
  <footer className="image-viewer-footer">{state?.status==="ready"?"Se muestra el archivo original. Usá el zoom para leer los detalles; con las flechas podés cambiar de imagen.":"La imagen se consulta con los permisos del servidor de Jira."}</footer>
 </div></div>,document.body);
}
