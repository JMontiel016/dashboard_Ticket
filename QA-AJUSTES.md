# QA de ajustes · 6 de octubre de 2026

Resultado: compilación TypeScript/Vite y Worker correcta, pruebas del servidor y de datos correctas, y **39 grupos de pruebas de navegador** correctos (17 de regresión, 12 de presentación y 10 del visor de imágenes). Sin errores JavaScript detectados. La prueba nueva de imágenes transfiere los archivos de prueba mediante HTTP y el Worker compilado, con upstream Jira simulado. También pasó el smoke test de `public/` compilado.

La causa de las imágenes ausentes y la corrección de publicación están documentadas en `QA-IMAGENES.md`. La carpeta `public/` ahora contiene el servidor completo en `_worker.js`.

| Punto | Resultado y evidencia |
| --- | --- |
| Colores por cola | Consulta 18 y envío 10 en amarillo; retorno 20 en rojo. Un único encabezado de análisis de ancho completo sigue la selección; ya no hay botón duplicado junto a servicios. |
| Plegado | Ocultar/mostrar conserva la cola seleccionada y su gravedad. |
| WhatsApp | Etiqueta sin IA; sin tickets abiertos. Nueve ingresados hoy frente a ocho casos activos en la prueba adicional, para verificar que el contador tiene su consulta independiente. |
| Paneles fijos | Carga de trabajo e Indicadores permanecen visibles aunque existan preferencias antiguas de plegado; sin controles de ocultar. Tarjetas de al menos 170 px de alto en escritorio. |
| Áreas y TV | Selección de Soporte, apertura del panel de tickets y activación/pausa del recorrido automático. |
| Tres formatos | Lista, Tarjetas e Indicadores en Todos, Solo Core y Solo Controller; enlaces de cada cola al monitor correcto; colores por cola y preferencia de formato tras recarga. |
| Servicios completos | Nueve colas Core y seis Controller en los tres formatos, a 1440 y 390 px. Altura natural, sin barra interna, sin recorte de filas y con los tres contadores visibles. |
| Colaboradores | Automático muestra Jaime y Diana; excluye una cuenta Jira inactiva y otra sin actividad reciente. Manual permite elegir la antigua, buscar, guardar y recuperar al recargar. Exclusiones conservadas al volver al automático y selección compartida con la TV. |
| Cuatro indicadores Jira | Diálogo centrado, listado completo de 25 casos, páginas de 10/10/5, búsqueda, descripción y fechas del caso. |
| Detalle ampliado | Más de 1100 px de ancho en escritorio; descripción y comentarios diferenciados, autor, fecha, imagen cargada y texto del contenido de 15 px. En móvil, una columna sin desbordamiento. |
| Fallos del detalle | Recarga tras HTTP 503, comentarios parcialmente leídos e imagen HTTP 403 con avisos visibles. Una respuesta tardía del ticket anterior no reemplaza el nuevo detalle. |
| Personalización móvil | Diálogo oscuro sin desbordamiento, cierre con Escape y devolución del foco al botón. Se corrigió el ancho mínimo de los contenedores de gráficos. |
| Fallos de Jira | Mensaje de error y nueva consulta; no muestra una lista vacía como una lectura exitosa. |
| Acciones | Reenviar/eliminar con un clic, una solicitud por clic, sin diálogo de clave, actualización posterior. Rechazo visible y sin reintento automático. |
| Fuentes parciales | Una cola sin lectura se muestra desconocida; no se presenta como cero sano. |
| Dashboard oscuro | Ejecutivo, Detalle por usuario, Reporte de dirección y Por épica; tablas sin fondo blanco, contraste de etiquetas, apertura del detalle de ticket y cambio de tema. |
| Funciones del dashboard | Búsqueda de ticket, reinicio de filtros y exportación CSV. |
| Móvil | TV, diálogo de indicador y cuatro vistas del dashboard a 390 px sin desbordamiento horizontal del documento. El registro de trabajos se desplaza dentro de su contenedor para mantener letras y columnas legibles. |

15 comprobaciones del servidor: rutas/métodos de las tres colas para ambas acciones, bloqueo cuando no están habilitadas, origen diferente, ID inválido y solicitud inválida; trabajos completed/active/waiting sin escritura; error dentro de una respuesta HTTP 200 y fallo de conexión.

12 comprobaciones adicionales del servidor Jira: entradas y credenciales inválidas; 105 comentarios con páginas menores a 100; fallo parcial; página vacía incompleta; errores de ticket/conexión; adjunto ajeno, MIME no compatible y exceso de tamaño; contenido de imagen obtenido desde endpoint fijo sin redirigir credenciales; redirección inesperada informada como error. Todas usan `fetch` simulado.

Pruebas de datos: fechas de Paraguay cerca de medianoche, fin de mes y año, listados y contadores de 1.105 casos, token repetido y respuesta inválida.

También pasó la prueba de `public/` compilado: recursos JS/CSS sin 404, tema y vista de tarjetas sin errores JavaScript.

Los resultados están en `tests/qa-results.json`, `tests/layout-results.json` y `tests/images-results.json`. Capturas actuales en `capturas-qa/`. También pasaron siete comprobaciones del Worker compilado: rutas, transferencia binaria, métodos, recursos estáticos y validación de acciones.

## Alcance

Las pruebas de regresión interceptan las APIs; la prueba de imágenes ejecuta el Worker compilado con un upstream simulado. No se reenviaron ni eliminaron trabajos reales. El diagnóstico adicional leyó los metadatos de dos tickets reales y confirmó que la ruta publicada de imágenes devolvía HTML. No se validaron permisos reales de descarga ni se desplegó esta entrega.

El criterio de colores y los umbrales de diagnóstico de la versión anterior se conservaron. Un patrón de trabajos con inconvenientes no demuestra por sí solo un certificado vencido o una intermitencia SIFEN.

La garantía de funcionamiento en tu entorno requiere una validación final con tu configuración y fuentes reales. Las pruebas aquí descritas cubren las rutas indicadas; no significan que cualquier módulo, dato o navegador futuro esté libre de fallos.
