# PRD — Consolidación y mejora UX/UI de Root Puzzle

## Resumen ejecutivo

Este proyecto convierte los hallazgos de la auditoría UX/UI en un plan de implementación priorizado. El objetivo es conservar la identidad visual y las capacidades actuales de Root Puzzle, mientras se corrigen la deriva de estilos, la navegación mobile, la accesibilidad del foco y los patrones inconsistentes de feedback, modales, estados y responsive.

El trabajo se divide en tres fases: fundamentos visuales y accesibilidad; navegación, estados y responsive; y refinamiento de consistencia y escalabilidad. No contempla cambiar el modelo genealógico ni agregar funcionalidades de producto ajenas a la experiencia actual.

## Problema y contexto

Root Puzzle tiene una identidad visual reconocible y una superficie funcional amplia: árbol, personas, timeline, mapa, fuentes, datos, colaboración, perfil y hallazgos. La auditoría detectó que el crecimiento incremental produjo:

- Tres bloques `:root` con tokens visuales diferentes en `app/globals.css`.
- Reglas de estilo duplicadas y overrides por componente.
- Foco de teclado inconsistente entre tema claro y oscuro.
- Navegación mobile sin acceso directo a Datos, Fuentes y Colaboradores.
- Modales y drawers sin gestión completa del foco.
- Feedback de carga, guardado, sincronización y error distribuido.
- Responsive complejo, especialmente en el canvas, formularios, Hallazgos y navegación inferior.
- Animaciones parciales sin una política global de movimiento reducido.
- Traducción ES/EN incompleta.

### Hechos

- La aplicación ya soporta temas claro y oscuro.
- La aplicación usa React, Next.js, `lucide-react`, localStorage y Supabase opcional.
- `npm run verify` pasa actualmente.
- El build debe volver a validarse después de cerrar el proceso que mantiene bloqueado `.next/trace`.

### Supuestos

- La identidad actual verde/teal, terracota y natural debe consolidarse, no reemplazarse.
- La aplicación seguirá siendo local-first con sincronización remota opcional.
- La implementación se realizará incrementalmente sin migrar el modelo de datos.

## Objetivos

1. Tener un único sistema de tokens visuales, semántico y mantenible.
2. Garantizar foco visible y navegación por teclado en ambos temas.
3. Hacer accesibles desde mobile las áreas operativas principales.
4. Crear patrones consistentes para modales, drawers, estados de carga, errores, guardado y reintento.
5. Validar la experiencia desde 360 px hasta desktop ancho.
6. Respetar `prefers-reduced-motion` en toda la aplicación.
7. Reducir la complejidad de `globals.css` y evitar nuevos overrides.
8. Mantener el producto reconocible y todas las funcionalidades actuales.

## No objetivos

- Reescribir el modelo de datos genealógico.
- Cambiar los flujos de importación/exportación.
- Hacer obligatoria la autenticación o Supabase.
- Rediseñar completamente la marca.
- Incorporar Framer Motion u otra librería si no aporta valor y no existe una necesidad concreta.
- Agregar funcionalidades genealógicas nuevas.

## Usuarios objetivo

### Dueño del árbol

Gestiona personas, vínculos, fuentes, backups, publicación, sincronización y colaboradores. Necesita descubrir rápidamente las acciones operativas y recibir confirmación clara de cada resultado.

### Familiar colaborador

Consulta el árbol y aporta información. Necesita formularios simples, navegación clara, validación entendible y una experiencia segura en móvil.

### Investigador familiar

Recorre timeline, mapa, fuentes y hallazgos. Necesita densidad informativa controlada, filtros comprensibles y estados de datos incompletos visibles.

### Usuario con necesidades de accesibilidad

Navega con teclado, lector de pantalla o movimiento reducido. Necesita foco visible, semántica correcta, estados anunciados y ausencia de animaciones obligatorias.

## Flujos principales

### 1. Navegación mobile

1. El usuario abre la navegación inferior.
2. Puede acceder al árbol, personas, timeline, mapa, hallazgos, perfil y Datos.
3. Accede a Fuentes y Colaboradores desde un destino secundario “Más” o desde una agrupación claramente visible.
4. El destino activo queda anunciado visualmente y mediante estado accesible.

### 2. Abrir y cerrar un modal

1. El usuario activa una acción.
2. El modal enfoca el primer control útil.
3. El foco queda contenido dentro del modal.
4. Escape y el botón de cierre cierran el modal.
5. El foco vuelve al elemento que lo abrió.

### 3. Guardar cambios

1. El usuario confirma una edición.
2. La acción muestra estado “Guardando”.
3. El contenido no queda bloqueado más tiempo del necesario.
4. Se muestra éxito, error con explicación y, cuando corresponde, “Reintentar”.
5. El estado de sincronización queda visible sin depender de mensajes efímeros.

### 4. Usar el canvas

1. El usuario identifica el área de trabajo principal sin competir con encabezados o estadísticas.
2. Puede agrupar filtros, visibilidad, escala, fondo y exportación.
3. Los controles icon-only tienen etiqueta y foco.
4. En mobile, el canvas conserva una superficie útil y no genera scroll accidental por controles superpuestos.

### 5. Navegar con movimiento reducido

1. El sistema detecta `prefers-reduced-motion: reduce`.
2. Se conserva el mismo contenido y la misma jerarquía.
3. Se eliminan o minimizan animaciones, desplazamientos, escalas y pulsos no esenciales.

## Requisitos funcionales

### P0 — Fundamentos visuales y accesibilidad

#### FR-01 — Tokens únicos

- Debe existir un único origen de verdad para tokens globales.
- Deben definirse tokens semánticos para fondo, superficie, superficie secundaria, texto, texto secundario, borde, acción primaria, acción secundaria, foco, peligro y estados de persona.
- Los temas claro y oscuro deben cambiar valores de tokens, no reescribir componentes completos sin necesidad.
- Los estilos específicos de Hallazgos deben quedar encapsulados como tokens de esa experiencia.

#### FR-02 — Foco visible

- Todo botón, enlace, control de formulario, tarjeta interactiva y control del canvas debe tener estado `:focus-visible` visible.
- El foco debe cumplir contraste suficiente en claro y oscuro.
- No se debe eliminar `outline` sin reemplazo equivalente.

#### FR-03 — Semántica de modales y drawers

- Los modales deben usar `role="dialog"`, `aria-modal="true"` y título asociado.
- Deben implementar foco inicial, focus trap, Escape y restauración de foco.
- Los drawers que bloquean el fondo deben seguir el mismo patrón.

#### FR-04 — Política global de movimiento

- Debe existir una regla global para `prefers-reduced-motion`.
- La reducción no debe ocultar contenido ni cambiar la funcionalidad.
- Los pulsos del mapa, entradas de drawers, loaders y transiciones de Hallazgos deben quedar cubiertos.

### P1 — Navegación, estados y responsive

#### FR-05 — Navegación mobile completa

- Datos debe estar disponible con un toque desde mobile.
- Fuentes y Colaboradores deben estar disponibles mediante un destino secundario claro.
- El destino activo debe tener estado visual, `aria-current` o equivalente y etiqueta accesible.
- La navegación no debe tapar contenido ni acciones importantes.

#### FR-06 — Feedback de operaciones

- Debe existir un patrón reutilizable para loading, éxito, error, advertencia y reintento.
- Las operaciones de Supabase deben mostrar guardado, fallo y reintento.
- Importación, exportación, publicación, copia de enlaces y detective deben comunicar el resultado.
- Los mensajes importantes deben anunciarse con `aria-live` sin producir ruido excesivo.

#### FR-07 — Estados de datos

Cada sección debe contemplar, cuando corresponda:

- Cargando.
- Vacío inicial.
- Vacío por búsqueda/filtro.
- Error.
- Sin permisos.
- Datos incompletos.
- Lista larga.

#### FR-08 — Responsive por escenarios

Debe validarse el comportamiento en 360, 390, 768, 1024 y 1440 px, incluyendo:

- Árbol y canvas.
- Toolbar y filtros.
- Formularios y modales.
- Personas y drawer.
- Timeline.
- Mapa.
- Hallazgos.
- Navegación inferior.

#### FR-09 — Canvas organizado

- Los controles deben agruparse por función: navegación, filtros, visibilidad, escala, fondo y exportación.
- Las acciones primarias deben permanecer visibles.
- Las herramientas secundarias pueden colapsarse en mobile.
- Los controles deben mantener áreas táctiles de al menos 44 px cuando sean acciones frecuentes.

### P2 — Consistencia y escalabilidad

#### FR-10 — Modularización de estilos

- La hoja global debe separarse por responsabilidad o, como mínimo, organizarse en bloques claramente delimitados.
- Los nuevos componentes no deben añadir overrides globales arbitrarios.
- Los estilos de tema deben usar tokens siempre que sea posible.

#### FR-11 — Internacionalización completa de UI

- Todo texto visible debe provenir del diccionario de idioma.
- Deben cubrirse sidebar, navegación mobile, mapa, colaboradores, Hallazgos, formularios y mensajes de operación.
- No se requiere traducir contenido ingresado por usuarios.

#### FR-12 — Iconografía consistente

- Reemplazar emojis usados como iconos funcionales por iconos de `lucide-react` o componentes equivalentes.
- Crear un patrón común para botones icon-only con etiqueta, tooltip opcional y foco.

#### FR-13 — Listas largas

- La lista de personas debe conservar búsqueda, selección y contexto al volver del drawer.
- Si el volumen lo requiere, debe incorporar agrupación alfabética o virtualización.
- El sistema debe definir un umbral medible para activar optimización.

## Requisitos no funcionales

- Mantener compatibilidad con Next.js 16, React 19 y las dependencias existentes.
- No introducir una librería de animación adicional sin justificación técnica.
- No perder datos locales ni modificar operaciones destructivas existentes.
- Cumplir navegación básica por teclado en las áreas principales.
- Mantener contraste suficiente en temas claro y oscuro.
- Mantener una experiencia usable desde 360 px.
- `npm run verify` debe continuar pasando.
- `npm run build` debe pasar en un entorno sin procesos bloqueando `.next`.
- Las mejoras deben poder desplegarse por fases y revertirse de forma independiente cuando sea posible.

## Criterios de aceptación

### Sistema visual

- [ ] `globals.css` no tiene más de un bloque global de tokens por tema.
- [ ] No existen redefiniciones accidentales de `--bg`, `--surface`, `--ink`, `--muted`, `--line` y `--accent`.
- [ ] Los componentes principales consumen tokens semánticos.

### Accesibilidad

- [ ] La navegación por teclado muestra foco visible en claro y oscuro.
- [ ] Un modal permite completar todo el flujo sin usar mouse.
- [ ] Al cerrar un modal, el foco vuelve al elemento disparador.
- [ ] Los drawers bloqueantes tienen semántica y foco correctos.
- [ ] `prefers-reduced-motion` elimina movimientos no esenciales.

### Navegación

- [ ] Datos se abre desde mobile con un toque.
- [ ] Fuentes y Colaboradores se encuentran desde una entrada secundaria visible.
- [ ] El destino activo es comprensible visualmente y para tecnologías asistivas.

### Estados y operaciones

- [ ] Guardar, importar, publicar, copiar, sincronizar y ejecutar detective muestran resultado.
- [ ] Los errores relevantes incluyen una acción de recuperación cuando es posible.
- [ ] Cada sección principal tiene estado vacío y estado de error apropiado.

### Responsive

- [ ] No hay scroll horizontal accidental en 360 px.
- [ ] Las acciones frecuentes cumplen un área táctil mínima de 44 px.
- [ ] Los modales, formularios y drawers son utilizables en móvil.
- [ ] El canvas mantiene controles accesibles sin cubrir el contenido principal.

## Métricas de éxito

### Métricas de calidad

- 0 bloques duplicados de tokens globales.
- 100% de botones y enlaces interactivos principales con foco visible.
- 100% de modales y drawers bloqueantes con gestión de foco.
- 100% de secciones principales con estados vacío, error y carga definidos.
- 0 problemas de overflow horizontal en los viewports definidos.
- 100% de destinos principales accesibles desde mobile según el mapa de navegación.

### Métricas de producto

- Reducir el tiempo necesario para encontrar Datos y Fuentes en mobile.
- Reducir errores de interpretación durante guardado y sincronización.
- Aumentar la finalización de formularios desde teclado y móvil.
- Reducir regresiones visuales causadas por overrides de CSS.

## Riesgos y dependencias

### Riesgos

- Consolidar tokens puede cambiar visualmente componentes que hoy dependen de overrides accidentales.
- Agregar destinos mobile puede aumentar la densidad de navegación.
- Un focus trap mal implementado puede dificultar el cierre o generar loops de foco.
- La modularización de CSS puede revelar dependencias de orden de importación.
- La reducción de animaciones puede afectar la percepción de feedback si no se reemplaza por estados visuales claros.

### Mitigaciones

- Hacer la migración de tokens por grupos de componentes.
- Validar cada fase con capturas comparativas claro/oscuro.
- Probar teclado antes y después de cada cambio de modal.
- Usar una matriz de viewports fija.
- Reemplazar animación eliminada por cambios de estado, texto o indicadores persistentes.

### Dependencias

- `lucide-react` para iconografía.
- `localStorage` y Supabase para persistencia y sincronización.
- Datos reales o fixtures con árboles pequeños, medianos y grandes.
- Validación manual en navegador para confirmar layout y foco.

## Plan de rollout

### Fase 1 — Fundamentos

1. Crear inventario final de tokens y colores.
2. Consolidar tokens claro/oscuro.
3. Aplicar foco visible global.
4. Crear componentes/patrones para IconButton, Modal, Drawer y feedback.
5. Implementar reduced motion global.

### Fase 2 — Navegación y estados

1. Completar navegación mobile.
2. Definir estados de carga, vacío, error, retry y permisos.
3. Integrar feedback de guardado y sincronización.
4. Mejorar estados vacíos de Fuentes, Datos, Personas y Mapa.
5. Revisar semántica y anuncios `aria-live`.

### Fase 3 — Responsive y canvas

1. Auditar viewports definidos.
2. Ajustar canvas, toolbar, filtros y controles táctiles.
3. Revisar modales, formularios, drawer y Hallazgos en móvil.
4. Corregir overflow y densidad.

### Fase 4 — Consistencia y escala

1. Modularizar `globals.css`.
2. Completar i18n.
3. Reemplazar emojis funcionales.
4. Consolidar botones icon-only.
5. Añadir estrategia para listas largas.

### Validación por fase

- Ejecutar `npm run verify`.
- Ejecutar `npm run build` sin procesos Next activos.
- Probar navegación por teclado.
- Probar temas claro/oscuro.
- Probar `prefers-reduced-motion`.
- Revisar 360, 390, 768, 1024 y 1440 px.
- Validar flujos principales con datos vacíos y con datos reales.

## Historias de usuario

- Como dueño del árbol, quiero encontrar Datos desde mobile para poder hacer backups sin navegar por rutas indirectas.
- Como usuario de teclado, quiero ver siempre dónde está el foco para completar cualquier flujo sin perderme.
- Como usuario que abre un modal, quiero que el foco quede dentro del diálogo y vuelva al botón original al cerrar.
- Como usuario con movimiento reducido, quiero usar la aplicación sin animaciones que me distraigan o incomoden.
- Como investigador, quiero distinguir claramente carga, error, datos incompletos y estados vacíos.
- Como usuario de Supabase, quiero saber si mis cambios se guardaron, fallaron o necesitan reintento.
- Como usuario mobile, quiero que el canvas conserve el contenido principal y no quede cubierto por controles.
- Como mantenedor, quiero cambiar un token visual una sola vez y que el cambio se aplique consistentemente.
- Como usuario bilingüe, quiero que todos los textos de navegación y acciones respeten el idioma seleccionado.

## Preguntas abiertas

1. ¿Datos debe ser un destino permanente de la navegación inferior o formar parte de un menú “Más”?
2. ¿Fuentes y Colaboradores deben tener acceso directo mobile o sólo estar dentro de “Más”?
3. ¿Se acepta una migración visual gradual o se requiere mantener pixel-perfect el estilo actual en cada fase?
4. ¿Qué volumen máximo de personas se espera por árbol para decidir si hace falta virtualización?
5. ¿Se desea incorporar una librería de focus trap o implementar el patrón internamente?
6. ¿El feedback de operaciones debe ser toast, banner persistente o una combinación según criticidad?
7. ¿Debe existir un modo explícito offline además del aviso actual de localStorage?

