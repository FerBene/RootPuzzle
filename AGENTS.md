# AGENTS.md

Guía operativa para agentes de Codex que trabajen en `arbol-genealogico-web`. Busca cambios coherentes con el producto, la arquitectura y las decisiones UX/UI existentes. No reemplaza los PRD; los complementa.

## Project Overview

Root Puzzle (también llamado Raíces en algunos artefactos) es una aplicación web para construir, investigar y documentar árboles genealógicos. Gestiona personas, parentescos, eventos, lugares, fuentes, citas, hallazgos y sugerencias; visualiza árbol, timeline y mapa; importa/exporta JSON y GEDCOM; publica una vista pública; y, con Supabase configurado, autentica usuarios, permite múltiples árboles y colaboración por roles.

La experiencia es local-first: sin credenciales de Supabase, los datos viven en `localStorage`. Con Supabase, el cliente carga y sincroniza un snapshot relacional del árbol seleccionado.

Antes de cambiar una funcionalidad: entender el flujo actual, localizar componentes/modelo/persistencia, leer el PRD relacionado, diseñar dentro de los patrones existentes, implementar estados de error y validar regresiones.

## Tech Stack

- Next.js `16.2.4`, App Router y `output: 'export'` en `next.config.mjs`.
- React `19.2.5` y `react-dom` `19.2.5`.
- JavaScript ESM; no hay TypeScript en la aplicación principal.
- CSS global en `app/globals.css`; no hay Tailwind configurado.
- `lucide-react` para iconografía.
- `@supabase/supabase-js` para Auth, RPC y Postgres.
- `d3-geo`, `topojson-client` y `world-atlas` para el mapa familiar.
- Service worker manual en `public/sw.js`, registrado por `components/ServiceWorkerRegistrar.js` sólo en producción.
- Alias `@/*` configurado en `jsconfig.json`.

No agregues dependencias nuevas sin justificar por qué no alcanza una solución existente.

## Architecture

### Estructura

- `app/`: entrada Next.js, metadata y CSS global. `page.js` monta `GenealogyApp`; `layout.js` define idioma, manifest, iconos y service worker.
- `components/GenealogyApp.js`: Client Component monolítico que orquesta sesión, árbol, navegación por hash, persistencia, sincronización y la mayoría de vistas/formularios.
- `components/FamilyMap.js`: mapa, marcadores, zoom/pan y timeline geográfica.
- `components/ServiceWorkerRegistrar.js`: ciclo de vida del service worker.
- `lib/model.js`: snapshot, defaults, normalización, relaciones y claves de localStorage.
- `lib/supabaseClient.js`: cliente opcional y detección de configuración.
- `lib/supabaseStore.js`: mapeo camelCase/snake_case, lectura/escritura relacional, árboles, invitaciones y RPC.
- `lib/gedcom.js`: importación/exportación GEDCOM.
- `lib/geocoding.js`: búsqueda de lugares y geocoding.
- `lib/hallazgos.js` y `lib/hallazgosLogic.js`: categorías, assets y progreso de Hallazgos.
- `lib/seedData.js`: datos iniciales del árbol de ejemplo.
- `supabase/`: schema base, migraciones, reparaciones y Edge Functions.
- `scripts/`: verificaciones y tests Node.
- `public/`: assets, manifest, service worker y arte de Hallazgos.
- `docs/`: PRD y notas técnicas; leer el documento específico antes de modificar esa área.
- `.agents/skills/`: skills locales del proyecto, ignoradas por Git. Consultar las pertinentes, especialmente UI/UX, accessibility y Next/React.

### Patrones y límites

- La aplicación principal es cliente. No conviertas partes en Server Components ni muevas lógica fuera de la frontera `use client` sin revisar serialización y acceso a browser APIs.
- La navegación vive en `GenealogyApp` y usa hashes: `#canvas`, `#people`, `#timeline`, `#family-map`, `#findings`, `#sources`, `#data`, `#profile` y `#collaborators`.
- Reutiliza `Modal`, `PersonDrawer`, `PersonForm`, botones, cards, empty states y tokens existentes antes de crear variantes.
- La UI usa camelCase; `supabaseStore.js` traduce a snake_case para Postgres.
- Las mutaciones locales deben conservar el snapshot y pasar por `normalizeDatabase`.
- La sincronización remota guarda colecciones completas y puede sobrescribir cambios concurrentes; no inventar sincronización por entidad sin resolver conflictos.
- No mezclar árboles remotos ni confiar en un `tree_id` del cliente como autorización.
- No convertir enlaces públicos en acceso a datos privados o escritura.

No cambies la forma del snapshot (`people`, `places`, `parentChild`, `partnerships`, `events`, `sources`, `citations`, sugerencias y `settings`) sin actualizar normalización, GEDCOM, UI y store remoto.

## UX/UI Guidelines

La identidad actual es natural/editorial: fondos cálidos claros, superficies crema, verde/teal, terracota, acentos dorados y tema oscuro. No reemplazarla por una estética genérica ni introducir una nueva paleta sólo por preferencia personal.

- `app/globals.css` es el sistema vigente: usar tokens y mantener claro/oscuro coherentes.
- Priorizar el canvas familiar, la lectura de relaciones y la edición de personas.
- Usar `lucide-react`; los icon-only requieren `aria-label`, foco visible y `title` cuando ayude.
- Reutilizar `primaryButton`, `secondaryButton`, `textButton`, `iconButton`, cards, drawers, modales y estados vacíos existentes.
- No añadir colores literales ni overrides globales si existe un token.
- Mantener responsive desde 360 px; en mobile conservar superficie útil del canvas, áreas táctiles cómodas y navegación accesible.
- Mantener la jerarquía navegación → encabezado contextual → área de trabajo → paneles secundarios.
- Todo flujo debe considerar loading, vacío inicial, vacío por filtro, error, permisos, datos incompletos y éxito.
- Operaciones destructivas requieren confirmación clara y alcance explícito.
- Feedback de guardado, importación, publicación y sincronización debe ser visible y anunciable, no sólo cromático.
- Respetar `prefers-reduced-motion`: eliminar movimiento no esencial sin ocultar contenido.
- Contraste y foco deben funcionar en ambos temas; no usar color como única señal.
- Imágenes decorativas usan `alt=""`; las informativas describen su contenido.
- Modales y drawers bloqueantes deben tener título asociado, Escape, foco inicial, focus trap y restauración de foco.

## Functional Analysis

Antes de implementar una funcionalidad, Codex debe:

- Identificar actores: visitante público, usuario local, owner, editor y viewer.
- Describir estados: sesión, árbol seleccionado, permisos, carga, vacío, error, sincronización y offline.
- Revisar el flujo completo, no sólo el botón que dispara la acción.
- Buscar componentes hermanos y utilidades en `GenealogyApp.js`, `model.js`, `supabaseStore.js` y los PRD.
- Revisar impacto en localStorage, Supabase, GEDCOM/JSON, vista pública y navegación por hash.
- Considerar IDs legacy, fechas parciales, lugares sin coordenadas, árboles sin personas, múltiples padres, familias ensambladas, filtros sin resultados y pérdida de conexión.
- Verificar permisos en UI y RLS/RPC. Ocultar un botón no es autorización.
- Si hay ambigüedad funcional importante, explicitarla antes de implementar o documentar el supuesto; no inventar una política irreversible.
- Evitar soluciones que funcionen sólo para el caso feliz.

## Data & Backend

### Persistencia y modelo

- `localStorage` usa `STORAGE_KEY = 'raices.genealogy.v1'`.
- Tema, idioma, fondo del canvas y árbol remoto tienen claves separadas.
- `normalizeDatabase` es obligatorio al cargar o mutar datos.
- Las fechas tienen año/mes/día, precisión y certeza; conservar datos legacy al editar.
- IDs locales se convierten a UUID en `supabaseStore.js` al sincronizar.

### Supabase, Auth y seguridad

- Supabase se activa sólo con `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- Auth usa email/contraseña y `onAuthStateChange`.
- Hay roles `owner`, `editor` y `viewer`, membresías, múltiples árboles e invitaciones mediante RPC.
- La autorización real vive en Postgres RLS/RPC; la UI sólo refleja permisos.
- Nunca exponer `service_role` ni claves administrativas en el navegador.
- Las migraciones son acumulativas y se aplican en orden cronológico. No editar una migración aplicada: crear otra correctiva.
- `supabase/schema.sql` contiene políticas públicas históricas; migraciones posteriores endurecen roles/RLS. Antes de afirmar que el sistema es seguro para producción, revisar el estado efectivo de políticas, especialmente `places`.
- Las funciones `security definer` deben fijar `search_path`, validar `auth.uid()` y limitarse a los roles necesarios.
- Cambios en `tree_id`, membresías, soft delete, invitaciones o publicación requieren revisar RLS, RPC, store y UI juntos.

### API y errores

- No hay API Routes de Next.js. El acceso remoto usa `lib/supabaseStore.js`, RPC de Supabase y `supabase/functions/geocode-place`.
- Las funciones de store devuelven `{ data, error }`; conservar ese contrato.
- Mostrar errores comprensibles, sin datos sensibles, y ofrecer reintento cuando sea seguro.
- No usar `alert` en nuevos flujos si existe un patrón visible reutilizable.

## Testing & Validation

`package.json` no define lint ni type checking. No afirmar que existen ni agregarlos implícitamente.

```bash
npm run verify
npm run test:hallazgos
npm run build
```

- `verify` comprueba encoding de código fuente y round-trip básico GEDCOM.
- `test:hallazgos` ejecuta tests Node para progreso y conteo de Hallazgos.
- `build` genera export estático en `out/`.
- Para cambios UI: probar teclado, temas, reduced motion, 360/390/768/1024/1440 px y datos vacíos/no válidos.
- Para cambios Supabase: revisar migraciones/RLS y probar owner/editor/viewer, usuario sin membresía y anon donde corresponda.
- Si `.next/trace` está bloqueado por otro proceso, no borrar carpetas amplias automáticamente; cerrar el proceso o informar el bloqueo y ejecutar validaciones disponibles.
- Antes de terminar, ejecutar `git diff --check` y revisar `git status`.

## Git Rules

- No hacer commits salvo solicitud explícita.
- No modificar archivos no relacionados.
- No eliminar código sin buscar sus usos y verificar el flujo que cubre.
- Preservar cambios previos; no usar `git reset --hard` ni `git checkout --` para limpiar.
- Mantener cambios pequeños, trazables y alineados con una fase del PRD.
- Usar `apply_patch` para editar archivos.
- No incluir secretos, `.env.local`, dumps de datos familiares ni claves Supabase.
- Las migraciones nuevas deben incluir orden y dependencias claras.

## Definition of Done

- [ ] La solución cubre el flujo completo y no sólo el caso feliz.
- [ ] Se reutilizaron componentes, tokens y utilidades existentes.
- [ ] Se revisaron permisos, persistencia local/remota y datos legacy.
- [ ] Se contemplan loading, empty, error, success y permisos aplicables.
- [ ] La UI mantiene identidad, responsive, contraste, foco y reduced motion.
- [ ] Los cambios destructivos tienen confirmación y alcance claro.
- [ ] `npm run verify` pasa.
- [ ] `npm run test:hallazgos` pasa si el cambio afecta dominio/Hallazgos.
- [ ] `npm run build` pasa o el bloqueo ambiental queda documentado.
- [ ] `git diff --check` pasa y el diff no incluye cambios no relacionados.
- [ ] Se revisaron navegación, hash, vista pública, import/export y sincronización.
- [ ] La entrega final resume archivos, validaciones e incertidumbres pendientes.

## Project Documentation

Leer según el área:

- `README.md`: instalación, export estático, backups y contexto histórico del MVP.
- `docs/ux-ui-prd.md`: jerarquía UX/UI y flujos de producto.
- `docs/ux-ui-improvement-prd.md`: mejoras visuales y accesibilidad.
- `docs/canvas-layout-prd.md`: layout y semántica del lienzo.
- `docs/tree-card-redesign-prd.md`: tarjetas del árbol.
- `docs/multi-tree-roles-prd.md`: árboles y roles.
- `docs/multi-tree-roles-technical.md`: RLS, migración, invitaciones y conflictos.
- `docs/tree-collaborator-invitations-prd.md`: invitaciones y colaboración.
- `supabase/schema.sql` y `supabase/migrations/`: estructura y evolución de base de datos.

Cuando README, PRD y código difieran, no asumir silenciosamente: documentar la discrepancia. Para comportamiento vigente, usar código y migraciones efectivamente aplicadas; para intención de producto, usar el PRD específico y más reciente.
