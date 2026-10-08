La configuración vigente, el visor de imágenes y la publicación con `public/_worker.js` están en **LEEME-AJUSTES.md**. La verificación de imágenes está en **QA-IMAGENES.md**. Las secciones siguientes conservan el historial de cambios.

> Para esta entrega, usar `LEEME-AJUSTES.md` y `QA-AJUSTES.md`; las instrucciones siguientes corresponden a versiones anteriores.

# Dashboard BEPA · versión mejorada

## Abrir el proyecto

El dashboard principal está en `/` y la TV mejorada en `/tv.html`.
`/tv-react.html` redirige a la nueva TV. La versión anterior se conserva en `/tv-clasica.html`.

El ZIP incluye el código fuente y `public/` compilado. No incluye `node_modules`.

Desde la carpeta principal:

```bash
npm run install:tv
npm run dev
```

Abrir `http://localhost:5174/` para el dashboard principal. La TV permanece en `http://localhost:5174/tv.html`. Ahora `npm run dev` también funciona desde la raíz. Vite redirige `/api` al despliegue existente `https://main.dashboard-bepa.pages.dev` durante el desarrollo local. Debe estar accesible y tener sus credenciales de Jira configuradas. No hace falta copiar credenciales al navegador.

Para ejecutar las Functions localmente con tus propias variables:

```bash
npm run build
npx wrangler pages dev public
```

Configurar los mismos secretos y variables de Cloudflare que utilizaba el proyecto original, mediante `.dev.vars` sin subir credenciales al repositorio. En producción, `/api` permanece en el propio despliegue.

## Correcciones del análisis Controller

- Diálogo centrado y con altura limitada a la ventana.
- RUC con nombre completo; acepta tildes, ñ, caracteres internacionales, XML con namespace y CDATA.
- Busca razón social, nombre y otras variantes del emisor. Si solo existe `username`, lo usa como identificación disponible. No utiliza el nombre del receptor. Si la fuente no envía el nombre, indica que no está disponible.
- Consulta los trabajos al abrir el análisis, incluso si faltaba el contador de la cola.
- Una lectura ausente no se convierte en cero fallos: muestra consulta pendiente o error de conexión.

## Mejoras

- Iconos SVG Lucide consistentes en dashboard y TV. Iconos locales, sin descargar una fuente de iconos externa.
- Motion para entrada de tarjetas y respuesta al seleccionar; números interpolados suavemente.
- TV con recorrido por áreas cada 12 segundos, pausa, reloj, pantalla completa y vista compacta. La pausa no detiene los datos.
- Seleccionar un área abre tickets, con búsqueda por clave, texto, colaborador o proyecto y filtros de estado.
- Seleccionar una persona de soporte muestra sus tickets y enlaces a Jira.
- Indicadores con explicación de su criterio al seleccionarlos.
- Estética neutra, contraste mejorado, tarjetas, barras y tablas con respuesta al cursor; alertas mantienen su color.
- Dashboard principal: filtros, menús, tarjetas, tablas y modales mejorados, acceso directo a TV y ayuda contextual.
- Chart.js incluido localmente en `public/vendor/`: los gráficos no dependen de una CDN.
- Consultas Jira y Bull en paralelo. El polling espera que termine la lectura y pausa en pestañas ocultas. Reintenta después de errores.
- Timeout en consultas TV. Los errores de contadores Jira conservan la última lectura en lugar de mostrar cero como si fuese un resultado válido.
- Diseño adaptable, foco visible, controles por teclado y foco contenido dentro del diálogo del Controller.
- Respeto a la preferencia de reducir movimiento del sistema operativo.
- El despliegue exige compilar correctamente la TV antes de publicar.

## Publicación

El workflow incluido compila `tv-react` y publica `public` en el proyecto Cloudflare original. Revisar los secretos `CF_API_TOKEN` y `CF_ACCOUNT_ID` ya requeridos por el workflow.

Este archivo no se publicó automáticamente. Reemplazar los archivos del repositorio y ejecutar el build antes de subir cambios.

## Datos y alcance

Se conservan las consultas y reglas de diagnóstico originales. Los cambios de interfaz no certifican la exactitud de las fuentes externas. Las pruebas locales usan respuestas simuladas; la conexión de producción requiere las variables de Cloudflare y validación en el despliegue.

## Últimos ajustes

- Controller integrado como sección fija, actualizado automáticamente sin abrir un diálogo.
- Cuenta regresiva y tiempo de última actualización retirados de la TV. Se conserva la hora de cada inconveniente.
- Entrada del dashboard principal en Vite: `/` e `/index.html`; TV en `/tv.html`.
- En desarrollo local, Bull se lee a través de proxies Vite directamente desde los monitores Core y Controller. Jira utiliza el proxy del despliegue existente. Si el upstream falla o no entrega colas, se informa sin inventar valores.
- En producción se conservan las Functions de la propia instalación.

## Listado y análisis de tres colas

El mapa se reemplazó por un listado de Core y Controller. Cada fila abre la cola exacta, con su nombre técnico sin abreviar.

El análisis fijo incluye `consultaDocumentoCore` y `RetornoDocumentoCore` de Controller y `envioSifen` de Core. Permite filtrar por cola, buscar nombres/RUC y abrir el detalle de cada caso. El origen y la cola figuran en la tabla. Ante una lectura parcial, conserva los registros anteriores de la cola que falló y muestra el aviso.

Los nombres se extraen del emisor en JSON o XML y se reutilizan entre trabajos del mismo RUC. El RUC no se repite como nombre. Si los trabajos solo aportan RUC y ningún nombre, no se inventa una razón social: muestra `Nombre no disponible`. Para completar esos casos hará falta un catálogo de clientes por RUC o que la fuente envíe el nombre. Los nombres JSON mantienen su texto original; XML se interpreta según sus entidades y CDATA.

Detener la versión anterior con Ctrl+C antes de ejecutar esta carpeta.

## Análisis independientes y nombre confirmado

Los tres botones muestran exclusivamente el análisis de su propia cola, incluyendo diagnóstico, indicadores, clientes y registros. El color por volumen es verde con cero casos, amarillo entre 1 y 19 y rojo desde 20. Una lectura desconocida se distingue de cero casos.

El catálogo `tv-react/src/config/clientes.ts` incluye el nombre confirmado por el usuario: RUC `80114656`, `KORORO'I S.A`. Se muestra el nombre arriba y el RUC debajo; conserva los caracteres exactos del catálogo.

La carpeta del ZIP se llama `dashboard-bepa-analisis` para distinguirla de versiones anteriores. Cerrá el servidor anterior con Ctrl+C, entrá en esta carpeta y ejecutá `npm run install:tv` y `npm run dev`. El puerto es estricto: no inicia en otro puerto silenciosamente si el 5174 está ocupado. Abrir `/tv.html` en el servidor Vite nuevo.

## Dashboard principal completo

Las cuatro vistas (Ejecutivo, Detalle por usuario, Dirección y Épicas) tienen un diseño actualizado. Menú lateral en escritorio, navegación adaptable en móvil, iconos SVG locales, tarjetas y tablas con transiciones y controles de teclado.

- Gráficos: seleccionar una barra abre las tareas del colaborador.
- Métricas de colaborador: filtran la persona y el estado seleccionado.
- Filtros: ocultar/mostrar, limpiar todos y resumen de resultados. La búsqueda de ticket respeta los filtros de proyecto, persona, estado y fecha.
- Detalle y épicas: expandir/contraer grupos, abrir tickets con clic o Enter.
- Dirección: reporte con tablas y acción de impresión.
- Exportar CSV: descarga todos los tickets de la selección, con nombre, estado, proyecto y tiempos.
- Actualización automática sin contador visible, sin solicitudes simultáneas; pausa en pestañas ocultas.

Esta versión conserva la TV y abre el dashboard principal por defecto al ejecutar npm run dev.

## TV compacta y nombres de clientes · 2026-10-06

- Secciones de soporte, indicadores, servicios, diagnóstico, clientes y registro con Mostrar/Ocultar. Preferencia guardada en el navegador; la cabecera y tarjetas superiores permanecen visibles.
- Listado de servicios con filas compactas y altura limitada. Mostrar/Ocultar análisis completo desde el listado o su propio control.
- Ver todos y Ver todo abren un diálogo centrado de hasta 720 px, con altura limitada, desplazamiento interno, X, Escape, clic fuera y foco contenido.
- Nombre largo abreviado visualmente en tarjeta; nombre completo en tooltip y detalle, conservando todos sus caracteres.
- Catálogo confirmado por RUC en `tv-react/src/config/clientes.ts`, con los nombres identificados en las capturas. Extracción de emisor/empresa, nombre de fantasía y XML/base64, sin utilizar dNomRec (receptor).
- Nombres recibidos conservados por RUC, incluso entre lecturas y recargas. Edición por icono de lápiz junto al cliente; cuando el origen no aporta un nombre, Completar nombre permite registrar el nombre real. No se inventan razones sociales.
- Nombres editados y preferencias se guardan en localStorage del mismo navegador/origen. Para compartir un nombre confirmado con todas las instalaciones, añadirlo al catálogo clientes.ts y compilar.

## Temas, alertas, paginación y acciones · 2026-10-06

El icono de sol/luna cambia entre modo claro y oscuro en el dashboard principal y la TV. Se comparte la preferencia entre ambas entradas del mismo origen. Incluye tablas, filtros, gráficos, ventanas y estados vacíos. TV inicia compacta; conserva el control Compacto.

### Criterio de análisis por cola

Se calculan por separado los RUC distintos de trabajos en Failed, consultando las tres colas en paralelo. Un mismo RUC con muchos trabajos sigue siendo un solo cliente.

| RUC distintos | Resultado |
| --- | --- |
| 1–6 | Verificar cada cliente y sus errores |
| 7 | Alerta: verificar datos de los clientes |
| 8–9 | Posible intermitencia SIFEN |
| 10 o más | Intermitencia según el umbral del tablero |

Este es el criterio solicitado, no una confirmación técnica de caída externa. El registro mantiene el error original para verificar la causa. Amarillo con inconvenientes; rojo desde 20 trabajos en una cola o 10 RUC distintos. Los controles Mostrar/Ocultar conservan color y contador aun con el contenido cerrado. El listado considera todas sus colas y marca rojo desde 20 inconvenientes totales.

Registro y listas de detalle con 10 filas por página, navegación numérica, anterior/siguiente y salto a primeras/últimas páginas. Lee hasta 500 páginas de la fuente (50 trabajos cada una); si supera el límite avisa lectura incompleta y conserva la anterior, sin presentar resultados parciales como completos.

### Habilitar reenviar y eliminar

Los botones al lado de Ver todo están disponibles en **consultaDocumentoCore, envioSifen y RetornoDocumentoCore**. Actúan solo sobre el trabajo seleccionado en Failed. No incluyen borrado ni reenvío masivo.

1. En desarrollo, copiar `.env.example` a `.env` en la raíz y reemplazar `MONITOR_ACTION_KEY` por una clave privada larga propia. Reiniciar `npm run dev`.
2. En Cloudflare, configurar el mismo secreto `MONITOR_ACTION_KEY` en las variables del despliegue y publicar las Functions junto a public/.
3. Al reenviar o eliminar, ingresar esa clave en la ventana y confirmar la acción. La clave se conserva solo en memoria durante la sesión, nunca se incluye en el bundle ni se guarda en localStorage.

El servidor verifica que el trabajo siga en Failed antes de llamar al monitor. Usa sus rutas PUT individuales `retry/failed` y `clean`, observadas en su código actual. Si el monitor rechaza la acción, el mensaje permanece visible. Sin la clave configurada, las lecturas siguen funcionando y las acciones devuelven un aviso de configuración.

Las acciones se probaron con servicios simulados. No se eliminó ni reenvió ningún trabajo real durante esta actualización.
