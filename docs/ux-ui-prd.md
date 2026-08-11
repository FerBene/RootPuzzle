# PRD UX/UI - Root Puzzle

## Executive Summary
Root Puzzle necesita conservar todas sus capacidades actuales, pero reducir la carga visual y ordenar la interfaz alrededor del trabajo principal: mirar, recorrer y editar el lienzo familiar. La solucion define una jerarquia estable: navegacion global, encabezado contextual, lienzo/area de trabajo, paneles secundarios y ajustes de cuenta.

## Problem and Context
La app ya soporta arbol visual, piezas/personas, vinculos, linea de tiempo, fuentes, importacion/exportacion, publicacion, aportes publicos, detective genealogico, perfil, tema e idioma. El problema no es falta de funcionalidad, sino mezcla de patrones visuales: encabezados grandes en pantallas donde no aportan, acciones globales repetidas, controles de lienzo sin agrupacion clara y mobile con poco espacio util.

Hechos:
- El lienzo es la pantalla de mayor valor y debe priorizar superficie visible.
- El alta de una nueva pieza ya esta simplificada y los campos secundarios estan en "+ datos".
- Mi perfil concentra tema e idioma.
- El menu lateral ya puede colapsarse en desktop.

Supuestos:
- La app sigue siendo MVP local-first con sincronizacion Supabase opcional.
- El idioma por ahora es una preferencia visible, no una traduccion completa de la UI.

## Goals and Non-Goals
Goals:
- Mantener todas las funcionalidades actuales accesibles.
- Reducir encabezados y estadisticas donde compiten con la tarea.
- Hacer que cada seccion tenga una accion primaria propia.
- Agrupar controles avanzados del lienzo para escaneo rapido.
- Asegurar mobile-first para lienzo, perfil, piezas, fuentes y datos.
- Usar componentes visuales consistentes para ajustes y acciones.

Non-goals:
- Reescribir el modelo de datos.
- Cambiar flujos de importacion/exportacion.
- Implementar traduccion completa ES/EN.
- Agregar autenticacion o sincronizacion obligatoria.

## Personas
- Dueño del arbol: carga piezas, edita vinculos, revisa fuentes, exporta backups y publica el arbol.
- Familiar colaborador: mira el arbol publico y aporta una pieza.
- Investigador familiar: revisa cronologia, fuentes y sugerencias antes de aceptar cambios.

## User Flows
- Explorar lienzo: abrir Arbol, elegir rama o ver todo, filtrar ascendencia/descendencia/generacion, mover y ampliar.
- Alta de pieza: tocar "Nueva pieza", cargar datos minimos opcionales, abrir "+ datos" solo si hace falta.
- Gestionar piezas: ir a Piezas, buscar, abrir ficha, editar, vincular familiares o agregar eventos.
- Revisar investigacion: ir a Linea de tiempo o Fuentes para validar datos.
- Operaciones de datos: ir a Datos para backup, GEDCOM, PDF, publicacion, detective e importacion de piezas.
- Ajustes personales: ir a Mi perfil, cambiar tema con iconos sol/luna y cambiar idioma con el mismo patron de toggle.

## Functional Requirements
- FR1: El encabezado debe mostrar solo informacion y accion relevante por seccion.
- FR2: Las estadisticas globales deben priorizarse en Arbol y no invadir secciones operativas.
- FR3: Fuentes debe usar "Nueva fuente" como accion primaria contextual.
- FR4: Datos debe quedar disponible tambien en navegacion mobile.
- FR5: Perfil debe mantener tema e idioma como controles consistentes, responsivos y sin duplicarse en el menu.
- FR6: El lienzo debe agrupar seleccion de rama, filtros y herramientas sin crecer excesivamente.
- FR7: El menu desktop debe seguir colapsando a iconos.
- FR8: La navegacion por hash debe soportar todas las secciones visibles, incluyendo Perfil.

## Non-Functional Requirements
- Responsive desde 360px hasta desktop ancho.
- Controles tactiles minimos de 44px en mobile cuando sean acciones frecuentes.
- Sin texto solapado ni encabezados que empujen el lienzo fuera del primer viewport.
- Contraste suficiente en tema claro y oscuro.
- Sin perdida de datos locales ni cambios destructivos.

## Metrics
- En mobile, el lienzo debe ocupar la mayor parte del viewport inicial.
- Todas las secciones principales deben ser alcanzables con un toque desde mobile.
- El header de Arbol debe quedar compacto y no duplicar controles del lienzo.
- El build y la verificacion local deben pasar antes de publicar.

## Risks and Dependencies
- Riesgo: esconder demasiado puede bajar descubribilidad. Mitigacion: mantener acciones primarias visibles y tooltips en iconos.
- Riesgo: mobile con seis destinos puede quedar apretado. Mitigacion: navegacion inferior compacta y estable.
- Dependencia: `lucide-react` para iconografia moderna.
- Dependencia: estado local en `localStorage` y sincronizacion remota opcional.

## Rollout Plan
1. Ordenar encabezados y acciones por seccion.
2. Compactar y agrupar controles de lienzo.
3. Completar navegacion mobile con Datos.
4. Consolidar Perfil y toggles.
5. Validar responsive y build.

## Open Questions
- Cuando se implemente i18n real, definir si el idioma afecta contenido ya cargado o solo UI.
- Definir si "Detective" debe convertirse en seccion propia cuando crezca.
- Definir un sistema de permisos si Supabase pasa a ser obligatorio.
