import type { JiraIssue } from "../types/jira";
export interface Attachment { id: string; filename: string; mimeType?: string; size?: number; created?: string; author?: {displayName?:string} }
export interface Comment { id: string; author?: { displayName?: string }; created?: string; updated?: string; body?: unknown }
export interface IssueDetail { issue: JiraIssue & {fields?: JiraIssue["fields"] & {attachment?: Attachment[]}}; comments: Comment[]; commentsError?: string }
/** Only loads on selecting a case; cancellation prevents stale results after another selection. */
export async function loadIssueDetail(key: string, signal: AbortSignal): Promise<IssueDetail> {
 const response=await fetch(`/api/jira-issue?key=${encodeURIComponent(key)}`,{signal,headers:{Accept:"application/json"}});
 const data=await response.json();if(!response.ok||!data.issue?.key)throw new Error(data.error||"No se pudo cargar el detalle de Jira.");
 return {issue:data.issue,comments:Array.isArray(data.comments)?data.comments:[],commentsError:data.commentsError};
}
export function plainDescription(v: unknown): string {
 if(typeof v==="string")return v;if(!v||typeof v!=="object")return "";
 const n=v as {text?:string;content?:unknown[];type?:string};
 if(n.type==="hardBreak")return "\n";
 return n.text||(n.content||[]).map(plainDescription).join(["doc","bulletList","orderedList"].includes(n.type||"")?"\n":" ");
}
