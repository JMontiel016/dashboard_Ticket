# Corrección de imágenes y visor · 6 de octubre de 2026

## Diagnóstico de lectura

Se consultaron únicamente los detalles de CW-236 y RRHH-741 y las rutas de lectura del servidor configurado en Vite. Los detalles devolvieron metadatos de adjuntos PNG. `/api/jira-attachment?key=CW-236&id=44752` y `/api/jira-attachment?key=RRHH-741&id=44763` devolvieron HTTP 200 con `Content-Type: text/html`, en vez de una imagen. Esto es compatible con una ruta no desplegada que termina en el fallback del dashboard. No se descargaron imágenes reales ni se modificaron tickets.

La versión anterior había probado la lectura con respuestas simuladas de imagen y no había detectado que el backend publicado seguía devolviendo HTML. Ahora el cliente verifica el tipo de respuesta, explica el error y no considera HTML 200 como una imagen cargada.

## Resultado

La compilación TypeScript/Vite y del Worker pasó. `public/_worker.js` incluye las nueve APIs; no incluye credenciales. Mantiene la lectura de Jira, Core, Controller y semáforo, además de las validaciones existentes de acciones.

Pasaron 10 grupos nuevos en `tests/images.mjs`:

| Prueba | Resultado |
| --- | --- |
| Transferencia real dentro del test | Dos PNG de prueba, 2200 × 1400 y 1000 × 1400, del upstream simulado al Worker compilado y al navegador mediante HTTP; CSP de la entrega con imágenes blob. |
| Visor y zoom | Visor de más de 1350 px a 1440 px de pantalla, tamaño original al 100 %, zoom al 125 % y ajuste automático. El zoom desplaza dentro del visor. |
| Descarga | Conserva nombre con Ñ, bytes y resolución del adjunto original. |
| Navegación y teclado | Anterior/siguiente, flechas, foco contenido y Escape. Cerrar el visor mantiene abierto el ticket y devuelve el foco al botón. |
| Ruta incorrecta | HTML 200 reproducido; mensaje de backend ausente y solución visible. |
| Configuración | Credenciales faltantes informan HTTP 503 y variables necesarias, sin exponer secretos. |
| Permisos | HTTP 403 de Jira conservado, aviso detallado y recarga exitosa tras cambiar la respuesta del upstream simulado. |
| Contenido inválido | Bytes HTML con MIME PNG se detectan al decodificar; no se muestran como una imagen válida. |
| Móvil | Visor a 390 px, ajuste y tamaño original; no desborda el documento. |
| JavaScript | Sin errores JavaScript con CSP real. |

También pasaron siete comprobaciones de `tests/worker.mjs`: archivos estáticos, API ausente sin fallback HTML, métodos/preflight, lecturas existentes, detalle Jira, bytes de imagen y bloqueo de acciones deshabilitadas sin escritura. Pasaron las pruebas de datos, las 15 de acciones, las 12 del detalle Jira, las 12 de presentación y el smoke test del frontend compilado.

Capturas: `capturas-qa/visor-imagen-original.png` y `capturas-qa/visor-imagen-movil.png`. Muestran imágenes de prueba identificadas como tales, no los adjuntos reales de los tickets.

## Para validar en la instalación

Esta actualización está preparada, pero no publicada en Cloudflare. Publicar la carpeta `public/` completa con `_worker.js` y conservar las variables de Jira en el entorno usado por la URL del dashboard. Abrir CW-236 o RRHH-741, pulsar Ver imagen en detalle y comprobar su archivo original. La disponibilidad y los permisos reales de descarga de Jira no se validaron porque el servidor publicado aún no sirve esa ruta de imágenes.


## Comprobación local independiente del servidor publicado

Se añadió `npm run dev` con configuración de Jira en la terminal y comprobación de un adjunto original antes de abrir. Las tres APIs de Jira funcionan en Vite y no requieren publicar antes de revisar las imágenes. `npm run conectar:jira` cambia la cuenta local; el token se escribe oculto y se guarda en un `.env` de permisos 0600.

`npm run test:local-jira`: siete grupos aprobados. Comprueba autenticación del servidor, PNG completo de 2200 × 1400, búsqueda y detalle mediante las APIs locales, vista previa en el navegador, tamaño original y descarga idéntica, ausencia de solicitudes al proxy publicado, rechazo de HTML 200 y archivos inválidos, y respuesta JSON 503 si faltan credenciales. El `.env` conserva otras opciones existentes.

El Jira y los archivos de esta prueba son simulados. No se dispone del token privado del usuario en este entorno, por lo que las imágenes privadas de producción todavía requieren la configuración local. El asistente realiza esa comprobación real en el equipo del usuario; no declara lista la conexión si la descarga falla.
