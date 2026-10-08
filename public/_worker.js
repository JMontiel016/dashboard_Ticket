var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// functions/api/bull-controller.js
var bull_controller_exports = {};
__export(bull_controller_exports, {
  onRequestGet: () => onRequestGet,
  onRequestOptions: () => onRequestOptions
});
var UPSTREAM = "https://controller-monitor.futura100.com.py/admin/trabajos/api/queues?page=1&jobsPerPage=10";
var CORS = { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" };
async function onRequestGet() {
  try {
    const res = await fetch(UPSTREAM);
    const data = await res.json();
    return new Response(JSON.stringify(data), { headers: CORS });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 502, headers: CORS });
  }
}
async function onRequestOptions() {
  return new Response(null, { status: 204, headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, OPTIONS" } });
}

// functions/api/bull-core.js
var bull_core_exports = {};
__export(bull_core_exports, {
  onRequestGet: () => onRequestGet2,
  onRequestOptions: () => onRequestOptions2
});
var UPSTREAM2 = "https://core-monitor.futura100.com.py/admin/trabajos/api/queues?page=1&jobsPerPage=10";
var CORS2 = { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" };
async function onRequestGet2() {
  try {
    const res = await fetch(UPSTREAM2);
    const data = await res.json();
    return new Response(JSON.stringify(data), { headers: CORS2 });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 502, headers: CORS2 });
  }
}
async function onRequestOptions2() {
  return new Response(null, { status: 204, headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, OPTIONS" } });
}

// functions/api/bull-failed.js
var bull_failed_exports = {};
__export(bull_failed_exports, {
  onRequestGet: () => onRequestGet3,
  onRequestOptions: () => onRequestOptions3
});
var UPSTREAM3 = "https://controller-monitor.futura100.com.py/admin/trabajos/api/queues";
var ALLOWED = /* @__PURE__ */ new Set(["consultaDocumentoCore", "envioSifen", "RetornoDocumentoCore"]);
var HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Content-Type": "application/json",
  "Cache-Control": "no-store"
};
var json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: HEADERS });
async function onRequestGet3({ request }) {
  const url = new URL(request.url);
  const queue = url.searchParams.get("queue") || "consultaDocumentoCore";
  if (!ALLOWED.has(queue)) return json({ error: `Cola no permitida: ${queue}` }, 400);
  const page = Math.min(Math.max(parseInt(url.searchParams.get("page") || "1", 10) || 1, 1), 100);
  const params = new URLSearchParams({
    activeQueue: queue,
    status: "failed",
    page: String(page),
    jobsPerPage: "50"
  });
  try {
    const res = await fetch(`${queue === "envioSifen" ? "https://core-monitor.futura100.com.py/admin/trabajos/api/queues" : UPSTREAM3}?${params}`, {
      headers: { Accept: "application/json" },
      cf: { cacheTtl: 0, cacheEverything: false }
    });
    if (!res.ok) return json({ error: `Controller respondi\xF3 HTTP ${res.status}` }, 502);
    return new Response(await res.text(), { headers: HEADERS });
  } catch (e) {
    return json({ error: e.message }, 502);
  }
}
async function onRequestOptions3() {
  return new Response(null, {
    status: 204,
    headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, OPTIONS" }
  });
}

// functions/api/bull-job-action.js
var bull_job_action_exports = {};
__export(bull_job_action_exports, {
  onRequestPost: () => onRequestPost
});
var QUEUES = /* @__PURE__ */ new Set(["consultaDocumentoCore", "envioSifen", "RetornoDocumentoCore"]);
var json2 = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
async function onRequestPost({ request, env }) {
  const legacyEnabled = env.MONITOR_ACTION_KEY && env.MONITOR_ACTION_KEY !== "reemplazar-por-una-clave-privada-larga";
  const enabled = env.MONITOR_ACTIONS_ENABLED === "true" || env.MONITOR_ACTIONS_ENABLED === void 0 && legacyEnabled;
  if (!enabled) return json2({ error: "Habilitar MONITOR_ACTIONS_ENABLED=true en el servidor para usar eliminar y reenviar." }, 503);
  if (request.headers.get("Origin") !== new URL(request.url).origin || request.headers.get("Sec-Fetch-Site") === "cross-site") return json2({ error: "Origen no permitido." }, 403);
  if (!request.headers.get("Content-Type")?.startsWith("application/json")) return json2({ error: "Formato de solicitud no permitido." }, 415);
  let body;
  try {
    body = await request.json();
  } catch {
    return json2({ error: "Solicitud inv\xE1lida." }, 400);
  }
  if (!body || typeof body !== "object") return json2({ error: "Solicitud inv\xE1lida." }, 400);
  const { queue, id, action } = body;
  if (!QUEUES.has(queue) || typeof id !== "string" || !/^[a-zA-Z0-9:_-]{1,150}$/.test(id) || !["retry", "delete"].includes(action)) return json2({ error: "Cola, trabajo o acci\xF3n no permitidos." }, 400);
  const base = `https://${queue === "envioSifen" ? "core" : "controller"}-monitor.futura100.com.py/admin/trabajos/api/queues/${encodeURIComponent(queue)}/${encodeURIComponent(id)}`;
  try {
    const check = await fetch(base, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(15e3) });
    if (!check.ok) return json2({ error: `No se pudo verificar el trabajo (HTTP ${check.status}).` }, 502);
    const data = await check.json();
    if (data.status !== "failed") return json2({ error: "El trabajo ya no tiene inconvenientes pendientes. Actualiz\xE1 el listado." }, 409);
    const response = await fetch(`${base}/${action === "retry" ? "retry/failed" : "clean"}`, { method: "PUT", headers: { Accept: "application/json" }, signal: AbortSignal.timeout(15e3) });
    if (!response.ok) return json2({ error: `El monitor rechaz\xF3 la acci\xF3n (HTTP ${response.status}).` }, 502);
    const text = await response.text();
    if (text) {
      let result;
      try {
        result = JSON.parse(text);
      } catch {
        return json2({ error: "Respuesta inesperada del monitor. Actualiz\xE1 antes de reintentar." }, 502);
      }
      if (result.error || result.ok === false || result.status === "error") return json2({ error: "El monitor no confirm\xF3 la acci\xF3n. Actualiz\xE1 antes de reintentar." }, 502);
    }
    return json2({ ok: true, action, queue, id });
  } catch {
    return json2({ error: "No se pudo confirmar la acci\xF3n. Actualiz\xE1 antes de volver a intentarlo." }, 502);
  }
}

// functions/api/core-failed.js
var core_failed_exports = {};
__export(core_failed_exports, {
  onRequestGet: () => onRequestGet3,
  onRequestOptions: () => onRequestOptions3
});

// functions/api/jira-attachment.js
var jira_attachment_exports = {};
__export(jira_attachment_exports, {
  onRequestGet: () => onRequestGet4
});
var BASE = "https://grupobepa.atlassian.net";
var IMAGE = /^image\/(png|jpeg|jpg|gif|webp|avif)$/i;
var json3 = (error, status, code, action, extra = {}) => new Response(JSON.stringify({ error, code, action, ...extra }), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
async function onRequestGet4({ request, env }) {
  const p = new URL(request.url).searchParams, key = p.get("key"), id = p.get("id");
  if (!key || !/^[A-Z][A-Z0-9_]*-\d+$/i.test(key) || !id || !/^\d{1,30}$/.test(id)) return json3("Ticket o imagen inv\xE1lidos.", 400, "INVALID_ATTACHMENT", "Volv\xE9 a abrir el ticket desde su listado.");
  if (!env.JIRA_EMAIL || !env.JIRA_TOKEN) return json3("Faltan las credenciales de Jira en el servidor de im\xE1genes.", 503, "JIRA_CONFIG_MISSING", "Configurar JIRA_EMAIL y JIRA_TOKEN en el entorno del servidor y volver a publicar.");
  const headers = { Authorization: `Basic ${btoa(`${env.JIRA_EMAIL}:${env.JIRA_TOKEN}`)}`, Accept: "application/json" };
  try {
    const check = await fetch(`${BASE}/rest/api/3/issue/${encodeURIComponent(key)}?fields=attachment`, { headers, signal: AbortSignal.timeout(15e3) });
    if (!check.ok) return json3("Jira no permiti\xF3 leer los adjuntos del ticket.", check.status, "ISSUE_ACCESS_DENIED", "Revis\xE1 los permisos de lectura del usuario de la API para este ticket.", { upstreamStatus: check.status });
    const issue = await check.json(), attachment = issue.fields?.attachment?.find((a) => String(a.id) === id);
    if (!attachment) return json3("La imagen no pertenece a este ticket o fue eliminada.", 404, "ATTACHMENT_NOT_FOUND", "Actualiz\xE1 el detalle del ticket para obtener sus adjuntos actuales.");
    if (!IMAGE.test(attachment.mimeType || "")) return json3("El archivo no es una imagen compatible.", 415, "UNSUPPORTED_IMAGE", "Abr\xED este archivo desde Jira.");
    if (attachment.size > 20 * 1024 * 1024) return json3("La imagen supera 20 MB.", 413, "IMAGE_TOO_LARGE", "Abr\xED el adjunto desde Jira.");
    const response = await fetch(`${BASE}/rest/api/3/attachment/content/${encodeURIComponent(id)}?redirect=false`, { headers: { ...headers, Accept: attachment.mimeType }, redirect: "manual", signal: AbortSignal.timeout(15e3) });
    if (!response.ok) return json3("Jira no permiti\xF3 descargar esta imagen.", response.status === 401 || response.status === 403 || response.status === 404 ? response.status : 502, "IMAGE_UPSTREAM_ERROR", "Revis\xE1 los permisos de adjuntos y las restricciones del comentario en Jira.", { upstreamStatus: response.status });
    return new Response(response.body, { headers: { "Content-Type": attachment.mimeType, "X-Content-Type-Options": "nosniff", "Content-Disposition": "inline", "Cache-Control": "private, max-age=120" } });
  } catch {
    return json3("No se pudo conectar para obtener la imagen.", 502, "JIRA_CONNECTION_ERROR", "Volv\xE9 a intentar cuando Jira est\xE9 disponible.");
  }
}

// functions/api/jira-issue.js
var jira_issue_exports = {};
__export(jira_issue_exports, {
  onRequestGet: () => onRequestGet5,
  onRequestOptions: () => onRequestOptions4
});
var JIRA_BASE = "https://grupobepa.atlassian.net";
var CORS3 = { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json", "Cache-Control": "no-store" };
var FIELDS = "summary,status,assignee,reporter,priority,project,issuetype,created,updated,resolutiondate,description,comment,labels,timeoriginalestimate,timespent,timeestimate,parent,subtasks,attachment";
var json4 = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: CORS3 });
async function onRequestGet5({ request, env }) {
  const key = new URL(request.url).searchParams.get("key");
  if (!key || !/^[A-Z][A-Z0-9_]*-\d+$/i.test(key)) return json4({ error: "Clave de ticket inv\xE1lida." }, 400);
  if (!env.JIRA_EMAIL || !env.JIRA_TOKEN) return json4({ error: "Credenciales no configuradas" }, 500);
  const headers = { Authorization: `Basic ${btoa(`${env.JIRA_EMAIL}:${env.JIRA_TOKEN}`)}`, Accept: "application/json" };
  try {
    const response = await fetch(`${JIRA_BASE}/rest/api/3/issue/${encodeURIComponent(key)}?expand=renderedFields,changelog&fields=${FIELDS}`, { headers, signal: AbortSignal.timeout(15e3) });
    if (!response.ok) return json4({ error: `No se pudo leer el ticket (Jira HTTP ${response.status}).` }, response.status);
    const issue = await response.json();
    let comments = [], commentsError = "", startAt = 0;
    try {
      for (let page = 0; page < 500; page++) {
        const response2 = await fetch(`${JIRA_BASE}/rest/api/3/issue/${encodeURIComponent(key)}/comment?expand=renderedBody&maxResults=100&orderBy=created&startAt=${startAt}`, { headers, signal: AbortSignal.timeout(15e3) });
        if (!response2.ok) throw Error(`No se pudieron leer todos los comentarios (Jira HTTP ${response2.status}).`);
        const data = await response2.json();
        if (!Array.isArray(data.comments)) throw Error("Jira no devolvi\xF3 un listado de comentarios v\xE1lido.");
        comments.push(...data.comments);
        startAt += data.comments.length;
        if (data.isLast === true || typeof data.total === "number" && startAt >= data.total || data.total === void 0 && data.comments.length < 100) break;
        if (!data.comments.length || page === 499) throw Error("La lectura de comentarios qued\xF3 incompleta.");
      }
    } catch (e) {
      commentsError = e.message || "No se pudieron leer todos los comentarios.";
    }
    comments = [...new Map(comments.map((c) => [c.id, c])).values()];
    return json4({ issue, comments, ...commentsError ? { commentsError } : {} });
  } catch {
    return json4({ error: "No se pudo conectar para leer el ticket." }, 502);
  }
}
async function onRequestOptions4() {
  return new Response(null, { status: 204, headers: { ...CORS3, "Access-Control-Allow-Methods": "GET, OPTIONS" } });
}

// functions/api/jira.js
var jira_exports = {};
__export(jira_exports, {
  onRequestOptions: () => onRequestOptions5,
  onRequestPost: () => onRequestPost2
});
var JIRA_BASE2 = "https://grupobepa.atlassian.net";
async function onRequestPost2(context) {
  const { request, env } = context;
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "application/json"
  };
  if (!env.JIRA_EMAIL || !env.JIRA_TOKEN) {
    return new Response(
      JSON.stringify({ error: "Credenciales de Jira no configuradas en el servidor" }),
      { status: 500, headers: corsHeaders }
    );
  }
  let body;
  try {
    body = await request.json();
  } catch (e) {
    return new Response(
      JSON.stringify({ error: "Body inv\xE1lido" }),
      { status: 400, headers: corsHeaders }
    );
  }
  const { jql, fields, maxResults = 100, startAt = 0, nextPageToken } = body;
  if (!jql) {
    return new Response(
      JSON.stringify({ error: "jql requerido" }),
      { status: 400, headers: corsHeaders }
    );
  }
  const basicAuth = btoa(`${env.JIRA_EMAIL}:${env.JIRA_TOKEN}`);
  const fieldList = fields || [
    "summary",
    "status",
    "assignee",
    "project",
    "issuetype",
    "timeoriginalestimate",
    "timespent",
    "timeestimate",
    "created",
    "updated",
    "priority"
  ];
  let jiraRes;
  try {
    jiraRes = await fetch(`${JIRA_BASE2}/rest/api/3/search/jql`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${basicAuth}`,
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: JSON.stringify({
        jql,
        fields: fieldList,
        maxResults,
        ...nextPageToken ? { nextPageToken } : {},
        fieldsByKeys: false
      })
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ error: "No se pudo conectar con Jira: " + e.message }),
      { status: 502, headers: corsHeaders }
    );
  }
  if (!jiraRes.ok) {
    const errText = await jiraRes.text();
    return new Response(
      JSON.stringify({ error: `Jira respondi\xF3 ${jiraRes.status}: ${errText}` }),
      { status: jiraRes.status, headers: corsHeaders }
    );
  }
  const data = await jiraRes.json();
  return new Response(JSON.stringify(data), { headers: corsHeaders });
}
async function onRequestOptions5() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, X-Dashboard-Token"
    }
  });
}

// functions/api/sifen-semaforo.js
var sifen_semaforo_exports = {};
__export(sifen_semaforo_exports, {
  onRequestGet: () => onRequestGet6,
  onRequestOptions: () => onRequestOptions6
});
var UPSTREAM4 = "https://semaforo-sifen.dnit.gov.py/semafororest/estado";
var HEADERS2 = {
  "Access-Control-Allow-Origin": "*",
  "Content-Type": "application/json",
  "Cache-Control": "no-store"
};
var json5 = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: HEADERS2 });
async function onRequestGet6() {
  try {
    const res = await fetch(UPSTREAM4, {
      headers: { Accept: "application/json" },
      cf: { cacheTtl: 0, cacheEverything: false }
    });
    if (!res.ok) return json5({ error: `DNIT respondi\xF3 HTTP ${res.status}` }, 502);
    return new Response(await res.text(), { headers: HEADERS2 });
  } catch (e) {
    return json5({ error: e.message }, 502);
  }
}
async function onRequestOptions6() {
  return new Response(null, {
    status: 204,
    headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, OPTIONS" }
  });
}

// pages-worker.js
var routes = {
  "/api/bull-controller": bull_controller_exports,
  "/api/bull-core": bull_core_exports,
  "/api/bull-failed": bull_failed_exports,
  "/api/bull-job-action": bull_job_action_exports,
  "/api/core-failed": core_failed_exports,
  "/api/jira-attachment": jira_attachment_exports,
  "/api/jira-issue": jira_issue_exports,
  "/api/jira": jira_exports,
  "/api/sifen-semaforo": sifen_semaforo_exports
};
var methods = { GET: "onRequestGet", POST: "onRequestPost", PUT: "onRequestPut", DELETE: "onRequestDelete", OPTIONS: "onRequestOptions" };
var pages_worker_default = { async fetch(request, env, ctx) {
  const path = new URL(request.url).pathname, route = routes[path];
  if (!route) {
    if (path.startsWith("/api/")) return Response.json({ error: "Ruta de API no encontrada." }, { status: 404, headers: { "Cache-Control": "no-store" } });
    return env.ASSETS.fetch(request);
  }
  const handler = route[methods[request.method]];
  if (!handler) return Response.json({ error: "M\xE9todo no permitido." }, { status: 405, headers: { Allow: Object.entries(methods).filter(([, name]) => route[name]).map(([method]) => method).join(", ") } });
  try {
    return await handler({ request, env, params: {}, data: {}, waitUntil: ctx.waitUntil.bind(ctx), next: () => env.ASSETS.fetch(request) });
  } catch {
    return Response.json({ error: "No se pudo completar la consulta del servidor." }, { status: 502, headers: { "Cache-Control": "no-store" } });
  }
} };
export {
  pages_worker_default as default
};
