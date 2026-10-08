import type { Attachment } from "./issueDetail";
export class ImageReadError extends Error {
 constructor(message:string, public readonly status?:number, public readonly action?:string, public readonly code?:string){super(message);this.name="ImageReadError";}
}
export async function loadAttachmentImage(key:string,attachment:Attachment,signal:AbortSignal):Promise<Blob>{
 const response=await fetch(`/api/jira-attachment?key=${encodeURIComponent(key)}&id=${encodeURIComponent(attachment.id)}`,{signal,headers:{Accept:"image/png,image/jpeg,image/gif,image/webp,image/avif"},cache:"no-store"});
 const type=(response.headers.get("content-type")||"").split(";")[0].trim().toLowerCase();
 if(type==="text/html")throw new ImageReadError("El servidor devolvió una página en lugar de la imagen.",response.status,"Publicar la versión completa del dashboard, incluido su servidor de imágenes.","IMAGE_ROUTE_MISSING");
 if(!response.ok||!/^image\/(png|jpeg|jpg|gif|webp|avif)$/.test(type)){
  const data=type==="application/json"?await response.json().catch(()=>({})):{};
  throw new ImageReadError(data.error||"El servidor no devolvió una imagen válida.",data.upstreamStatus||response.status,data.action||"Volvé a intentar. Si continúa, verificá la publicación y el acceso al adjunto en Jira.",data.code);
 }
 const blob=await response.blob();
 if(!blob.size)throw new ImageReadError("La imagen está vacía.",response.status,"Volvé a cargar el archivo desde Jira.");
 if(blob.size>20*1024*1024)throw new ImageReadError("La imagen supera 20 MB.",413,"Abrí el adjunto desde Jira.");
 return blob;
}
