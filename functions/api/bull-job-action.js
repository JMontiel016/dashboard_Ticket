// Acciones habilitadas por el operador en el servidor. No se entrega una clave al navegador.
const QUEUES = new Set(['consultaDocumentoCore', 'envioSifen', 'RetornoDocumentoCore']);
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
export async function onRequestPost({ request, env }) {
  const legacyEnabled = env.MONITOR_ACTION_KEY && env.MONITOR_ACTION_KEY !== 'reemplazar-por-una-clave-privada-larga';
  const enabled = env.MONITOR_ACTIONS_ENABLED === 'true' || (env.MONITOR_ACTIONS_ENABLED === undefined && legacyEnabled);
  if (!enabled) return json({ error: 'Habilitar MONITOR_ACTIONS_ENABLED=true en el servidor para usar eliminar y reenviar.' }, 503);
  if (request.headers.get('Origin') !== new URL(request.url).origin || request.headers.get('Sec-Fetch-Site') === 'cross-site') return json({ error: 'Origen no permitido.' }, 403);
  if (!request.headers.get('Content-Type')?.startsWith('application/json')) return json({ error: 'Formato de solicitud no permitido.' }, 415);
  let body;
  try { body = await request.json(); } catch { return json({ error: 'Solicitud inválida.' }, 400); }
  if (!body || typeof body !== 'object') return json({ error: 'Solicitud inválida.' }, 400);
  const { queue, id, action } = body;
  if (!QUEUES.has(queue) || typeof id !== 'string' || !/^[a-zA-Z0-9:_-]{1,150}$/.test(id) || !['retry','delete'].includes(action)) return json({ error: 'Cola, trabajo o acción no permitidos.' }, 400);
  const base = `https://${queue === 'envioSifen' ? 'core' : 'controller'}-monitor.futura100.com.py/admin/trabajos/api/queues/${encodeURIComponent(queue)}/${encodeURIComponent(id)}`;
  try {
    const check = await fetch(base, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(15000) });
    if (!check.ok) return json({ error: `No se pudo verificar el trabajo (HTTP ${check.status}).` }, 502);
    const data = await check.json();
    if (data.status !== 'failed') return json({ error: 'El trabajo ya no tiene inconvenientes pendientes. Actualizá el listado.' }, 409);
    const response = await fetch(`${base}/${action === 'retry' ? 'retry/failed' : 'clean'}`, { method: 'PUT', headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(15000) });
    if (!response.ok) return json({ error: `El monitor rechazó la acción (HTTP ${response.status}).` }, 502);
    const text = await response.text();
    if (text) { let result; try { result = JSON.parse(text); } catch { return json({ error: 'Respuesta inesperada del monitor. Actualizá antes de reintentar.' }, 502); }
      if (result.error || result.ok === false || result.status === 'error') return json({ error: 'El monitor no confirmó la acción. Actualizá antes de reintentar.' }, 502);
    }
    return json({ ok: true, action, queue, id });
  } catch { return json({ error: 'No se pudo confirmar la acción. Actualizá antes de volver a intentarlo.' }, 502); }
}
