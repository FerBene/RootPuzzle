# PRD — Mejora del Mapa familiar y recorrido temporal

## Resumen ejecutivo

Mejorar la sección **Mapa familiar** para que el usuario pueda investigar la expansión geográfica de su familia con un recorrido temporal claro, constante y comprensible. La primera fase reemplazará el timelapse basado exclusivamente en años con nacimientos por una escala temporal de pasos uniformes. También se corregirán ambigüedades en las métricas, se harán explícitos los estados de datos incompletos y se reforzarán accesibilidad, responsive y feedback de reproducción.

La solución debe conservar la identidad editorial, natural y cálida existente de Root Puzzle.

## Problema y contexto

Actualmente la timeline se construye con los años únicos de nacimiento registrados. Esto produce intervalos irregulares: un paso puede avanzar un año y el siguiente veinte. El usuario no puede interpretar de forma consistente cuánto tiempo representa cada avance del botón Play.

La pantalla también presenta oportunidades de claridad:

- Las métricas superiores no explican si representan personas, lugares o eventos.
- “Ubicaciones pendientes” puede contar personas, mientras que la leyenda usa otro alcance temporal.
- El mapa es acumulativo, pero esa regla no está suficientemente explicada.
- La timeline muestra demasiadas etiquetas y repite el año actual en varias zonas.
- Los años sin nacimientos no se diferencian claramente de los años sin datos.
- Faltan estados específicos para ausencia de fechas, ausencia de coordenadas, filtros sin resultados y errores.

## Objetivos

1. Hacer que cada paso del timelapse tenga una separación temporal constante.
2. Hacer que cada paso automático tenga una duración constante y predecible.
3. Comunicar claramente que el mapa muestra el acumulado hasta el año de corte.
4. Diferenciar personas visibles, personas incorporadas en el período y personas sin ubicación.
5. Mejorar la comprensión de filtros, marcadores, popovers y estados incompletos.
6. Mantener navegación por teclado, contraste, foco visible y soporte para movimiento reducido.
7. Mantener el comportamiento correcto en 360, 390, 768, 1024 y 1440 px.

## No objetivos

- No cambiar el modelo genealógico ni la estructura del snapshot.
- No agregar nuevos tipos de eventos familiares en esta fase.
- No reemplazar el mapa mundial ni introducir una librería cartográfica nueva.
- No convertir el mapa en una vista pública ni alterar las reglas de autorización.
- No rediseñar la identidad visual global de la aplicación.
- No geocodificar automáticamente lugares como parte de este alcance.

## Usuarios y necesidades

### Investigador familiar

Necesita recorrer la historia por períodos, entender cuándo aparecen personas y localizar los lugares relevantes sin perder contexto.

### Editor u owner

Necesita detectar rápidamente personas sin año o ubicación, revisar lugares pendientes y navegar desde el mapa hacia el árbol.

### Usuario con necesidades de accesibilidad

Necesita operar el filtro, slider, reproducción, mapa y popovers con teclado y lector de pantalla, sin depender de animaciones.

## Supuestos

- El mapa seguirá usando el año de nacimiento como eje temporal inicial.
- Sólo los eventos con año válido participan del recorrido temporal.
- Una persona sin coordenadas puede aparecer en listas y métricas, pero no como marcador confirmado.
- El mapa seguirá mostrando ubicaciones acumuladas hasta el año de corte.
- La cadencia temporal será constante dentro de una reproducción.

## Flujo principal

1. El usuario entra a **Mapa familiar**.
2. Ve el año de corte inicial, el resumen de personas y el estado de ubicaciones.
3. Opcionalmente selecciona una rama familiar.
4. Selecciona el paso temporal: 1, 5 o 10 años.
5. Ajusta opcionalmente la velocidad de reproducción.
6. Pulsa **Reproducir**.
7. El año avanza por pasos uniformes, incluso cuando no hay nacimientos en un paso.
8. El mapa incorpora las personas cuyo año ya quedó incluido en el corte.
9. El usuario puede pausar, continuar, mover el slider, seleccionar un marcador o reiniciar.
10. Al seleccionar una ubicación, puede revisar las personas y navegar hacia ellas en el árbol.

## Reglas temporales

### Rango

- `startYear`: año mínimo válido de los eventos filtrados.
- `endYear`: año máximo válido de los eventos filtrados.
- La escala debe redondearse al paso seleccionado para mantener intervalos uniformes.
- El rango debe recalcularse al cambiar la rama o el conjunto de personas.

### Pasos

El MVP debe soportar:

- 1 año.
- 5 años.
- 10 años.

El valor por defecto recomendado es 10 años para árboles con un rango histórico amplio. La selección debe conservarse mientras el usuario permanezca en la sección, salvo que el nuevo filtro haga que el rango deje de ser válido.

### Reproducción

- Cada paso debe tener una duración constante.
- La duración sugerida por defecto es 800 ms por paso.
- Pausar debe conservar exactamente el año actual.
- Reanudar debe continuar desde el año actual.
- Si se pulsa Reproducir al llegar al final, debe reiniciar desde el comienzo y comunicarlo claramente.
- Reiniciar debe volver al primer paso y cerrar la ubicación seleccionada.
- Un cambio manual en el slider debe pausar la reproducción.
- La reproducción debe usar una referencia temporal estable para evitar deriva visible entre pasos.

### Datos del período

- “Hasta [año]” representa todas las personas con año menor o igual al corte.
- “Nuevas en este paso” representa sólo las personas cuyo año cae dentro del tramo incorporado desde el paso anterior.
- Una persona nacida entre dos cortes aparece en el primer corte que la incluye.
- Los pasos sin nuevos nacimientos siguen siendo visibles y deben mostrar el acumulado sin novedades.

## Requisitos funcionales

### FR-01 — Escala temporal uniforme

La timeline debe generarse con pasos constantes y no con la lista de años únicos de nacimiento.

### FR-02 — Controles de cadencia

Debe existir un control accesible para seleccionar 1, 5 o 10 años por paso. El control debe indicar el valor activo.

### FR-03 — Controles de reproducción

Debe existir una única acción primaria de reproducción que alterne entre Reproducir y Pausar. Reiniciar debe ser una acción secundaria independiente.

### FR-04 — Indicador de progreso

La timeline debe comunicar el año de corte, el paso seleccionado y la posición relativa dentro del rango. Las etiquetas deben ser legibles y no saturar el ancho disponible.

### FR-05 — Resumen semántico

El resumen debe distinguir, como mínimo:

- Personas hasta el año de corte.
- Ubicaciones confirmadas.
- Personas sin ubicación.
- Personas nuevas en el paso actual, cuando corresponda.

Los nombres deben describir qué se cuenta. No debe haber dos componentes mostrando cifras con alcances distintos bajo la misma etiqueta.

### FR-06 — Contexto del período

El bloque “En este año” debe evolucionar a un contexto del corte actual, con:

- año de corte;
- personas nuevas en el paso;
- ubicaciones nuevas, si existen;
- mensaje explícito cuando el paso no tiene novedades;
- acceso a las personas y ubicaciones disponibles.

### FR-07 — Filtro de rama

El filtro debe mostrar una opción global y las ramas disponibles. Cuando sea posible, debe incluir el conteo de personas por rama. Al cambiarlo, debe reiniciar el recorrido, cerrar popovers y recalcular el rango.

### FR-08 — Marcadores

- Los marcadores confirmados deben diferenciarse de las personas sin coordenadas.
- El tamaño o contador del marcador debe comunicar la cantidad de personas agrupadas.
- El foco de teclado debe ser visible.
- La etiqueta accesible debe incluir lugar y cantidad.
- La selección debe abrir un popover estable dentro del viewport.

### FR-09 — Popover de ubicación

Debe mostrar lugar, cantidad de personas, rango temporal disponible y las personas asociadas. Cada persona debe conservar la acción “Ver en el árbol”. Debe poder cerrarse con botón, Escape y, si el patrón vigente lo permite, al hacer clic fuera.

### FR-10 — Estados de datos

La sección debe diferenciar estos estados:

1. Sin personas.
2. Personas sin año de nacimiento.
3. Años disponibles pero ninguna ubicación confirmada.
4. Filtro sin resultados.
5. Personas con ubicación pendiente.
6. Error de carga o procesamiento.
7. Carga o sincronización en progreso.

Cada estado debe incluir una explicación breve y una acción útil cuando sea posible.

### FR-11 — Accesibilidad

- El slider debe anunciar el año de corte y su significado acumulativo.
- La reproducción debe exponer un estado `aria-live="polite"` sin anunciar cada frame de forma excesivamente invasiva.
- Todos los controles deben ser operables por teclado.
- Los estados de foco deben funcionar en tema claro y oscuro.
- Los marcadores SVG deben conservar nombre accesible y activación con Enter y Espacio.
- Escape debe cerrar el popover.

### FR-12 — Movimiento reducido

Con `prefers-reduced-motion: reduce`:

- se debe conservar toda la funcionalidad;
- se deben eliminar pulsos y transiciones no esenciales;
- el cambio de paso puede ser inmediato;
- el estado temporal debe seguir siendo anunciado y comprensible.

### FR-13 — Responsive

En mobile:

- el mapa debe conservar una superficie útil mínima;
- el filtro y los controles temporales deben ser táctiles;
- las etiquetas de años deben reducirse a hitos legibles o desplazarse sin overflow de página;
- el resumen no debe generar tarjetas ilegibles;
- el contexto del período debe apilarse correctamente.

## Requisitos no funcionales

- Mantener JavaScript ESM y la arquitectura cliente existente.
- Reutilizar `lucide-react`, tokens y patrones de botones actuales.
- No agregar dependencias nuevas.
- Mantener compatibilidad con `output: 'export'`.
- No cambiar el modelo de datos ni romper sincronización local o Supabase.
- Evitar cálculos y actualizaciones innecesarias durante la reproducción.
- Mantener el mapa usable con zoom, paneo y selección de ubicaciones.
- No introducir overflow horizontal en los tamaños definidos por el proyecto.

## Métricas de éxito

### Calidad funcional

- 100% de los pasos de una reproducción tienen la misma cadencia configurada, con una tolerancia razonable de renderizado.
- 0 discrepancias entre métricas superiores y leyendas cuando describen el mismo alcance.
- 100% de las ramas y filtros recalculan correctamente rango, conteos y contexto.
- 100% de los estados definidos tienen mensaje y comportamiento verificable.

### Experiencia

- Un usuario puede explicar correctamente qué significa “hasta este año” sin asistencia.
- Un usuario puede cambiar el paso temporal y reproducir el rango completo sin perder la posición inesperadamente.
- El usuario puede identificar qué personas no tienen ubicación confirmada.
- No hay overflow horizontal en 360, 390, 768, 1024 y 1440 px.

### Accesibilidad

- Todos los controles principales tienen foco visible.
- El flujo completo funciona con teclado.
- El contenido sigue siendo utilizable con movimiento reducido.
- Los cambios de reproducción tienen un estado accesible comprensible.

## Dependencias

- Datos de personas con `birthYear` o año extraíble de `birthDate`.
- Datos de lugares y coordenadas existentes.
- Componente actual [FamilyMap.js](../components/FamilyMap.js).
- Tokens y responsive definidos en [globals.css](../app/globals.css).
- Reglas de accesibilidad y movimiento del PRD general de UX.

## Riesgos y mitigaciones

### Árboles con rangos muy amplios

Una escala de un año puede generar demasiados pasos. Mitigación: ofrecer 5 y 10 años, y recomendar un valor por defecto según el rango.

### Interpretación incorrecta de nacimientos entre cortes

Una persona nacida entre dos pasos puede parecer incorporarse tarde. Mitigación: explicar “hasta el año de corte” y mostrar el período incorporado.

### Reproducción costosa

Recalcular agrupamientos y SVG en cada frame puede afectar rendimiento. Mitigación: separar el reloj de reproducción de la actualización visual y memoizar derivaciones.

### Exceso de controles

Cadencia, velocidad, filtros y zoom pueden sobrecargar la pantalla. Mitigación: mostrar cadencia como control principal y mantener velocidad en un control secundario o menú compacto.

### Datos incompletos

La falta de año o coordenadas puede hacer que el usuario crea que faltan personas. Mitigación: métricas diferenciadas y estados accionables.

## Plan de rollout

### Fase 1 — Modelo temporal y claridad de datos

- Implementar rango y pasos constantes.
- Reemplazar reproducción por pasos uniformes.
- Corregir nombres y alcances de métricas.
- Comunicar el carácter acumulativo del mapa.
- Mantener Play, Pausa, Reiniciar y slider.

### Fase 2 — Controles y contexto

- Agregar selector de cadencia.
- Mejorar indicador de progreso.
- Incorporar resumen de novedades del paso.
- Mejorar filtro de rama con conteos.
- Ajustar leyenda y marcadores.

### Fase 3 — Estados, accesibilidad y refinamiento

- Completar estados de carga, vacío, error y filtro sin resultados.
- Agregar anuncios accesibles y cierre con Escape.
- Revisar movimiento reducido.
- Validar responsive, tema oscuro y navegación por teclado.
- Mejorar popover y agrupamiento de marcadores si las pruebas lo justifican.

## Validación y pruebas

Debe validarse como mínimo:

- reproducción con años consecutivos;
- reproducción con grandes saltos entre nacimientos;
- pasos sin novedades;
- pausa, reanudación y reinicio;
- cambio de rama durante reproducción;
- cambio de cadencia;
- personas sin año;
- personas sin coordenadas;
- filtro sin resultados;
- selección de marcadores y navegación al árbol;
- teclado y Escape;
- `prefers-reduced-motion`;
- tema claro y oscuro;
- viewports 360, 390, 768, 1024 y 1440 px.

Validaciones del proyecto:

```bash
npm run verify
npm run build
git diff --check
```

## Preguntas abiertas

1. ¿El eje temporal debe seguir basado sólo en nacimientos o más adelante incluirá fallecimientos, matrimonios, migraciones y residencias?
2. ¿La cadencia debe persistir entre sesiones o sólo durante la visita actual?
3. ¿La velocidad debe ser configurable en el MVP o alcanza con una duración fija?
4. ¿“Rama familiar” seguirá siendo una aproximación por apellido o se reemplazará por ramas relacionales reales?
5. ¿Los lugares pendientes deben ofrecer un acceso directo a edición desde el mapa?
6. ¿El valor por defecto debe ser siempre 10 años o calcularse según el rango temporal?

## Criterio de finalización

La mejora estará lista cuando el recorrido temporal sea uniforme y explicable, las métricas no presenten alcances contradictorios, los estados incompletos sean accionables y la sección pueda utilizarse con teclado, movimiento reducido, tema oscuro y mobile sin regresiones.
## Fase 2 — Precisión y exploración de ubicaciones

### Problema específico

La vista temporal funciona, pero la exploración geográfica se degrada cuando varias personas nacieron en lugares cercanos:

- el zoom máximo actual no permite separar puntos próximos;
- los marcadores y sus cantidades pueden superponerse;
- el mapa puede iniciar mostrando todo el mundo aunque los datos estén concentrados en una región;
- no existe una acción explícita para volver a encuadrar todas las ubicaciones;
- una concentración de personas no tiene una presentación clara al acercarse.

### Objetivos adicionales

1. Permitir inspeccionar ubicaciones cercanas con zoom suficiente.
2. Hacer que la primera vista se adapte a la distribución real de la familia.
3. Evitar que puntos superpuestos oculten personas o información.
4. Mantener la relación entre mapa, timeline y ficha del árbol.
5. Conservar una experiencia usable con mouse, teclado y gestos táctiles.

### Requisitos funcionales adicionales

#### FR-14 — Autoencuadre

- Al cargar el mapa o cambiar de rama, debe encuadrarse según las ubicaciones visibles.
- El encuadre debe incluir margen suficiente para no pegar los puntos al borde.
- Con una ubicación se debe usar un zoom regional moderado.
- Sin ubicaciones confirmadas se conserva la vista mundial.
- El botón de centrar debe restaurar el encuadre calculado.

#### FR-15 — Zoom profundo

- El zoom máximo debe ser suficiente para inspeccionar puntos cercanos; la implementación inicial usará un límite de 24x.
- Rueda, botones y pinch deben conservar el punto focal.
- El zoom no debe permitir una escala inútilmente pequeña.
- El control de centrar debe tener etiqueta accesible.

#### FR-16 — Agrupamiento visual

- Las ubicaciones se agrupan sólo cuando la distancia visual actual no permite distinguirlas.
- Un grupo debe comunicar su cantidad sin superponer etiquetas ilegibles.
- Al acercarse, los puntos deben dejar de agruparse automáticamente cuando exista separación visual suficiente.
- Las ubicaciones coincidentes pueden seguir abriendo un detalle conjunto con todas las personas asociadas.
- La posición real de cada ubicación debe conservarse en los datos.

#### FR-17 — Detalle de concentración

- Seleccionar un grupo debe abrir un panel legible con todas las personas asociadas.
- Cada persona debe conservar la acción “Ver en el árbol”.
- Las personas sin coordenadas deben continuar visibles en estadísticas y novedades del período.

### Criterios de aceptación adicionales

- [ ] Una familia concentrada en una región abre enfocada en esa región.
- [ ] Dos ubicaciones cercanas pueden separarse mediante zoom hasta una escala útil.
- [ ] Ninguna cantidad principal queda superpuesta de forma ilegible.
- [ ] El botón de centrar vuelve al encuadre de los puntos visibles.
- [ ] El zoom con rueda y pinch mantiene el foco bajo el cursor o entre los dedos.
- [ ] Los puntos y grupos se pueden activar con teclado.
- [ ] El mapa funciona con cero, una, varias y muchas ubicaciones.
- [ ] El cambio de rama y el avance temporal recalculan el contenido sin mezclar ubicaciones anteriores.
- [ ] Se conserva el acceso a la ficha de cada persona.
- [ ] Se mantienen los temas claro y oscuro y el movimiento reducido.

### Diseño técnico de la fase 2

- Reutilizar `d3-geo`, la proyección existente y el `viewBox` actual.
- No cambiar el snapshot ni agregar campos.
- Derivar el encuadre a partir de las ubicaciones visibles.
- Agrupar por distancia visual en píxeles, no sólo por coordenadas redondeadas.
- Mantener marcadores SVG enfocables con `aria-label`.
- Mantener el agrupamiento dinámico sin animaciones obligatorias para usuarios con movimiento reducido.
