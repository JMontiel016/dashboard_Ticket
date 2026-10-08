# Ajustes del dashboard · 6 de octubre de 2026

Esta versión actualiza el dashboard y la TV del proyecto dashboard-bepa-temas-acciones.

## Últimos ajustes

### Corrección de imágenes · 6 de octubre

**Para comprobar imágenes antes de publicar:** ejecutar `npm run dev`. La primera vez solicita el correo y el token de API de Jira en la terminal, con el token oculto. Comprueba los bytes de una imagen del ticket CW-236 y guarda la conexión en un `.env` privado. Después inicia el dashboard. Las búsquedas, detalles e imágenes de Jira se sirven directamente desde el servidor local; no dependen de publicar cambios en producción ni del proxy anterior que devolvía HTML.

Si ya existe un `.env` con `JIRA_EMAIL` y `JIRA_TOKEN`, utiliza esa conexión y verifica una imagen antes de abrir. Para cambiarla, ejecutar `npm run conectar:jira`. Si el usuario no puede ver CW-236, configurar `JIRA_VERIFY_KEY` con un ticket que pueda leer y que tenga una imagen. Crear el token en https://id.atlassian.com/manage-profile/security/api-tokens. No enviar el token por chat ni incorporarlo al frontend.

Se verificó que el servidor publicado utilizado por el proyecto devolvía HTML con HTTP 200 al pedir `/api/jira-attachment`, en lugar de bytes de una imagen. La entrega anterior contenía la Function en `functions/api`, pero no la empaquetaba dentro de `public/`. Una subida solo de archivos estáticos podía dejar sin publicar esa ruta.

Ahora `npm run build` genera **`public/_worker.js`**, con las nueve APIs del proyecto, incluido el servidor de imágenes. Publicar **toda la carpeta `public/`**, conservando `_worker.js`, `_routes.json` y los demás archivos. El Worker usa las mismas variables de Jira del servidor; no incorpora tokens en el código generado.

Las imágenes tienen vista previa y botón **Ver imagen en detalle**. El visor grande permite ajustar a pantalla, tamaño original, zoom de 10 a 400 %, anterior/siguiente, flechas del teclado y descarga del archivo original. Muestra nombre, formato, tamaño y dimensiones. Escape cierra primero el visor y mantiene abierto el ticket.

Cuando no se puede cargar, se muestra la causa: ruta que devuelve HTML, credenciales faltantes, permiso denegado, conexión o contenido inválido. El botón Reintentar vuelve a leer el adjunto.

- Servicios completos sin altura máxima ni barra de desplazamiento interna en Lista, Tarjetas e Indicadores. Se muestran nombre, estado, inconvenientes, activos y pendientes en escritorio y móvil. Si el contenido supera la pantalla, la página crece normalmente; no se achican los textos para comprimir todo.
- El dashboard ofrece **Más activos (30 días)** y **Elegir personas**. Personalizar equipo permite buscar, marcar y excluir colaboradores. El modo automático muestra cuentas activas con tareas abiertas y actividad reciente; las cuentas desactivadas en Jira no se incluyen. Las preferencias se guardan en este navegador y se comparten con Carga de trabajo en la TV. Los totales, gráficos y exportación del dashboard corresponden a los colaboradores visibles.
- Carga de trabajo e Indicadores de tickets quedan siempre visibles, sin controles para ocultarlos. Las tarjetas y cifras son más grandes.
- Los cuatro indicadores abren un diálogo de hasta 1.280 px: lista a la izquierda y detalle a la derecha. El detalle separa **Descripción del ticket**, **Comentarios y respuestas** e **Imágenes adjuntas**, con autor, fechas y enlace a Jira. En móvil se adapta a una columna.
- Las imágenes se leen mediante una Function del servidor que verifica su pertenencia al ticket. Son compatibles PNG, JPEG, GIF, WebP y AVIF de hasta 20 MB. Una imagen denegada o una consulta incompleta muestra un aviso.
- WhatsApp muestra únicamente los ingresados hoy; se quitó el contador de tickets abiertos. El contador incluye los casos creados hoy aunque ya se hayan cerrado.
- Análisis de inconvenientes usa un encabezado de ancho completo, con Mostrar/Ocultar y color según la cola seleccionada. Se eliminó el botón duplicado junto al título de servicios.
- Se corrigió el desbordamiento de gráficos al cambiar de escritorio a móvil.

- El color de Mostrar/Ocultar análisis sigue la cola seleccionada. Consulta, envío a SIFEN y retorno tienen indicadores separados.
- WhatsApp reemplaza las etiquetas WhatsApp IA y Claude WhatsApp de las interfaces; la clave de proyecto CW de Jira se conserva.
- Ingresados hoy, ingresados en el mes, finalizados en el mes y cerrados hoy abren un diálogo centrado: consulta completa, búsqueda, 10 resultados por página, responsable, estado, proyecto, prioridad, fechas, descripción y enlace al caso en Jira.
- Los cálculos de fecha usan Paraguay y los casos finalizados se consultan por resolutiondate. El usuario de la API de Jira debe tener configurada la misma zona horaria para que sus filtros JQL coincidan con el día de operación.
- El listado de servicios ofrece Lista, Tarjetas e Indicadores; filtros Todos, Solo Core y Solo Controller. Todos conservan el color de cada cola y su enlace al monitor correcto. Se conserva el formato elegido al recargar.
- Modo oscuro corregido en las cuatro vistas, tablas, grupos por usuario, etiquetas, filtros y detalles.
- Eliminar y reenviar se ejecutan con un clic, sin diálogo ni clave adicional. Se bloquean clics simultáneos, se muestra el error cuando corresponde y se vuelven a leer los datos después de una acción confirmada. Las acciones no se reintentan automáticamente.
- La verificación de acciones se hace en el servidor: cola permitida, ID válido, mismo origen y trabajo todavía en estado failed. Solo actúa sobre el trabajo seleccionado.
- Se corrigieron listas truncadas, fechas UTC, respuestas inválidas, paginación repetida, selección de búsquedas anteriores y actualización de casos después de una acción durante otra lectura.
- En móvil, el registro de trabajos mantiene columnas legibles con desplazamiento horizontal dentro del panel.

## Ejecutar localmente

Desde la carpeta que contiene este archivo:

```bash
npm run dev
```

Dashboard: http://localhost:5174/
TV: http://localhost:5174/tv.html

El comando instala las dependencias de la TV si hacen falta. Ingresar el correo y el token de API cuando lo solicite. La terminal confirma el nombre de una imagen descargada correctamente antes de iniciar Vite. Core y Controller usan sus APIs de lectura.

Para producción, conservar `JIRA_EMAIL` y `JIRA_TOKEN` en las variables del servidor de Cloudflare Pages, con permiso para leer los tickets y sus adjuntos. No usar prefijo `VITE`. El `.env` local tiene permisos privados y está excluido de Git y de la entrega. No se publica automáticamente.

Para pruebas automatizadas o revisar pantallas sin configurar una cuenta, `JIRA_LOCAL_SETUP=skip npm run dev` omite el asistente. En ese modo, una imagen sin credenciales locales devuelve un aviso JSON 503; no intenta cargar la página del proxy como si fuera una imagen.

## Acciones directas

Para una instalación nueva, copiar `.env.example` a `.env`; incluye:

```env
MONITOR_ACTIONS_ENABLED=true
```

En Cloudflare Pages, configurar esa misma variable del servidor y volver a desplegar. La variable no lleva prefijo VITE ni contiene una contraseña.

Compatibilidad: si ya existe una MONITOR_ACTION_KEY válida y no se configuró MONITOR_ACTIONS_ENABLED, las acciones siguen habilitadas desde el servidor sin pedir esa clave en el navegador. MONITOR_ACTIONS_ENABLED=false deshabilita las escrituras.

Como las acciones ahora son directas, deben habilitarse en un dashboard cuyo acceso ya esté restringido a los operadores. No se añadió un sistema de usuarios ni se modificó el acceso de Cloudflare.

## Compilación y despliegue existente

```bash
npm run build
```

El resultado se escribe en `public/`, con el frontend y el Worker que agrupa las Functions de `functions/api`. En modo avanzado Cloudflare usa `_worker.js` en lugar del directorio de Functions. Publicar la carpeta completa mediante el proceso que ya usa el proyecto. Esta entrega no fue desplegada.

Si se usa Wrangler, ejecutar desde la raíz del proyecto:

```bash
npx wrangler pages deploy public --project-name dashboard-bepa --branch main
```

Si el nombre o la rama del proyecto de Cloudflare son distintos, usar los valores de esa instalación. Si se usa Git, configurar `npm run build` como comando de build y `public` como carpeta de salida. La URL `main.dashboard-bepa.pages.dev` debe recibir la versión del servidor para mostrar las imágenes en producción. La prueba local de imágenes funciona sin ese despliegue.

## Repetir las pruebas

```bash
npm install
npm run install:tv
npm test
npx playwright install chromium
```

Con `npm run dev` ejecutándose en otra terminal:

```bash
npm run test:qa
```

También se puede iniciar Vite dentro de la prueba:

```bash
QA_START_SERVER=1 npm run test:qa
npm run test:layout
npm run test:compiled
npm run test:images
npm run test:local-jira
```

Los tests utilizan datos simulados. La prueba de imágenes transfiere PNG completos desde un Jira simulado, a través del Worker compilado y HTTP, hasta el navegador con la política CSP de la entrega. No ejecutan eliminaciones ni reenvíos en producción. Las capturas y los resultados están en `capturas-qa/`, `tests/qa-results.json`, `tests/layout-results.json` y `tests/images-results.json`. Ejecutar las pruebas de navegador por separado: cada una utiliza el puerto 5174.

Consultar `QA-AJUSTES.md` para el alcance y las limitaciones de la validación. No se garantiza ausencia de cualquier fallo futuro ni disponibilidad de servicios externos.
