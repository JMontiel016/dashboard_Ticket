# Validación vigente

La validación de esta entrega está en `QA-AJUSTES.md`. Las secciones siguientes son el historial de versiones anteriores; sus interfaces de clave y confirmación ya fueron reemplazadas.

# Validación de la versión mejorada

- `npm run build`: TypeScript y Vite completados correctamente.
- `node --check public/enhancements/dashboard.js`: correcto.
- Pruebas en Chromium, respuestas API simuladas: búsqueda de tickets, detalle por colaborador, recorrido automático, modo compacto, cierre de diálogo con Escape, ayuda y navegación del dashboard.
- Vista móvil de 390 px: sin desbordamiento horizontal del documento. El mapa se desplaza horizontalmente para conservar etiquetas legibles.
- Capturas revisadas en escritorio y móvil.
- Sin errores JavaScript detectados en las pruebas.

Las respuestas simuladas se usan solo en las pruebas externas al proyecto; el código entregado consulta las APIs reales de su propia instalación. No se ha publicado ni probado contra producción.

## Corrección de Controller

- Verificado en Chromium: centrado del panel, nombre y RUC con tildes, ñ, ampersand, caracteres internacionales, XML con namespace y CDATA.
- Verificado que un error HTTP muestra el aviso y conserva los datos de la última lectura.
- Scripts de inicio desde raíz y compilación correctos.

## Controller fijo y dashboard local

Probado en Chromium contra Vite con respuestas API simuladas: Controller como sección permanente sin diálogo; ausencia de cuenta regresiva; nombres Unicode y XML; error de conexión visible; dashboard principal accesible desde `/`. Sin errores de JavaScript. Build correcto. No se verificó disponibilidad de producción.

## Listado y tres colas

Build y sintaxis de Functions correctos. Chromium con respuestas simuladas: inclusión de tres colas, nombre literal con caracteres especiales, reutilización de nombre entre trabajos del mismo RUC, filtro por cola, enlaces exactos Core/Controller, ausencia de mapa y cuenta regresiva. Sin errores de JavaScript.

## Análisis independientes

Chromium con Vite y datos simulados: nombre confirmado KORORO'I S.A sobre RUC 80114656; botones con 2, 21 y 0 casos en amarillo, rojo y verde; indicadores y clientes separados por cola; enlace exacto; listado sin mapa; móvil sin desbordes. Sin errores de JavaScript. Se corrigió la prioridad del HTML compilado en Vite para que desarrollo sirva el código actualizado.

## Dashboard principal completo · 2026-10-06

Build de TypeScript/Vite correcto. Chromium contra Vite con API simulada: navegación por las cuatro vistas, selección real de barras del gráfico, filtros de tickets, limpiar filtros, ocultar/mostrar filtros, exportar CSV, métricas por colaborador, épicas con Enter, detalle de ticket y entrada TV sin errores JavaScript. Las cuatro vistas se comprobaron a 390 px sin desbordamiento horizontal del documento. No se validó conexión a las APIs de producción.

## TV compacta y nombres · 2026-10-06

Chromium con respuestas simuladas: catálogo por RUC, XML/base64 con Unicode, nombres con apóstrofes y ampersand, edición y persistencia tras recargar; Ver todos y Ver todo en diálogo centrado de ancho máximo 720 px, cierre X/Escape/clic fuera; secciones plegables conservadas tras recargar; cabecera visible al ocultar análisis; móvil 390 px sin desbordamiento; sin errores JavaScript. Pruebas del dashboard principal siguen pasando. No se verificaron fuentes de producción ni un directorio externo de clientes: un RUC sin nombre en los datos/catálogo requiere asociar su nombre real.

## Temas y acciones Failed · 2026-10-06

- Chromium: temas en ambas entradas y preferencia compartida; revisión de las cuatro vistas del dashboard en oscuro y TV en claro; móvil 390 px.
- Casos simulados: 25 trabajos de un solo RUC no indican intermitencia; 7 RUC alerta; 8 posible intermitencia; 10 umbral de intermitencia. Cada cola calculada por separado.
- Paginación: 25 filas muestra 10/10/5; cambio de cola reinicia página. Listas del diálogo también paginadas.
- Señales de gravedad permanecen en los controles de contenido oculto.
- Interfaz de acciones: tres colas, reenviar y eliminar, clave y confirmación, respuesta simulada y refresco posterior.
- Proxy con fetch simulado: rutas exactas por servicio; exige clave; rechaza origen distinto, parámetros inválidos y trabajos fuera de Failed antes de escribir.
- Rutas upstream verificadas por lectura de código del monitor Core y GET de un trabajo Failed. No se hicieron escrituras reales.
- Build completo y pruebas anteriores del dashboard correctos; sin errores JavaScript.
