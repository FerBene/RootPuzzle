# PRD: Unificación de modales de personas

## Executive Summary

Unificar las interfaces de **Alta**, **Vista** y **Edición** de personas/piezas para que se perciban como tres modos de una misma ficha. La referencia visual será el modal actual de **Nueva pieza**, conservando la identidad, los componentes y los tokens existentes.

La primera fase se enfocará en la estructura, jerarquía y consistencia visual. No incluirá un editor nuevo de fuentes/citas si la aplicación no cuenta actualmente con ese flujo.

## Problem and Context

Actualmente Alta, Vista y Edición comparten datos, pero no la misma experiencia:

- Alta y Edición usan `PersonForm`, pero no muestran siempre los mismos campos en el mismo orden.
- Imagen, email, ocupación, fallecimiento y notas están parcialmente ocultos detrás de `+ datos`.
- Vista utiliza una composición tipo ficha/hero distinta al formulario.
- Vista repite la identidad de la persona y muestra acciones que no son necesarias, como `Ver en árbol`.
- Las fechas pueden mostrarse en formato ISO en lugar de un formato humanizado.
- Las fuentes y citas existen en el modelo, pero no tienen una sección específica dentro de la ficha.

La aplicación ya dispone de `Modal`, `PersonForm`, `PersonAvatar`, `LifeDateField`, `LifePlaceField`, `RelationList`, `PersonPicker` y tokens visuales reutilizables.

## Goals and Non-Goals

### Goals

- Crear una experiencia común para los modos `create`, `view` y `edit`.
- Usar el modal de Nueva pieza como referencia visual.
- Mantener el mismo ancho, padding, header, orden y espaciado en los tres modos.
- Mostrar la imagen arriba del contenido en Alta, Vista y Edición.
- Eliminar `+ datos` y mostrar todos los campos directamente.
- Eliminar textos redundantes de Vista y Edición.
- Reemplazar el botón textual Editar por un icono de lápiz accesible.
- Humanizar fechas completas, parciales y aproximadas.
- Mantener relaciones, lugares, fotos, validaciones y persistencia existentes.
- Mostrar Fuentes como sección independiente sin alterar el modelo actual.

### Non-Goals

- No cambiar el schema de Supabase ni la forma del snapshot.
- No rediseñar toda la aplicación ni crear un nuevo design system.
- No modificar la lógica de parentescos salvo lo necesario para reutilizar la UI.
- No crear en esta fase un editor completo de fuentes/citas si no existe actualmente.
- No cambiar el comportamiento del árbol, zoom, foco o navegación.
- No eliminar datos existentes ni ejecutar migraciones automáticamente.

## Personas

### Investigador familiar

Necesita consultar una ficha completa rápidamente, reconocer la persona por su imagen y comparar datos sin cambiar de contexto.

### Editor del árbol

Necesita pasar de Vista a Edición sin que el contenido se reordene ni cambie drásticamente.

### Usuario casual

Necesita entender la ficha sin mensajes técnicos, estados redundantes o acciones ambiguas.

## User Flows

### Crear una persona

1. El usuario pulsa `Nueva pieza`.
2. Se abre el modal común en modo `create`.
3. Ve el avatar en la parte superior y puede cargar/recortar una imagen.
4. Completa los campos en el orden definido.
5. Pulsa `Cancelar` o `Crear pieza`.
6. La validación mantiene el comportamiento actual y devuelve el foco al primer error.

### Consultar una persona

1. El usuario selecciona una tarjeta o persona.
2. Se abre el mismo modal en modo `view`.
3. El header identifica a la persona principalmente por su nombre.
4. Los datos se muestran en los mismos bloques y orden que en Alta/Edición, como contenido de lectura.
5. El usuario puede cerrar o entrar en Edición mediante el icono de lápiz.

### Editar una persona

1. El usuario pulsa el lápiz desde Vista.
2. El modal conserva posición, orden y contexto.
3. Los valores pasan de lectura a controles editables sin reacomodar la ficha.
4. El usuario puede cancelar sin persistir cambios o guardar mediante `Guardar cambios`.

## Functional Requirements

### FR1 — Modal común

Debe existir una base compartida para los tres modos, idealmente `PersonModal` o una composición equivalente, con `mode: create | view | edit`.

Debe reutilizar el componente `Modal` vigente, incluyendo foco inicial, focus trap, Escape, cierre y restauración de foco.

### FR2 — Header

- `create`: título `Nueva pieza` y cierre.
- `view`: nombre de la persona, lápiz, eliminar si corresponde y cierre.
- `edit`: nombre de la persona, badge discreto `EDITANDO` si se conserva y cierre.
- No mostrar `Ficha personal`, `MODO VISTA` ni `MODO EDICIÓN`.
- El lápiz debe tener `aria-label="Editar persona"` y `title` equivalente.

### FR3 — Imagen

- La imagen debe ser el primer elemento de contenido en los tres modos.
- El tamaño objetivo será de aproximadamente 88–104 px, ajustable según responsive.
- En `create` y `edit` debe permitir cargar, reemplazar, recortar y quitar la imagen.
- En `view` debe ser únicamente lectura.
- Sin imagen debe reutilizarse `PersonAvatar` con placeholder e iniciales actuales.

### FR4 — Orden de información

Todos los modos deben respetar este orden:

1. Imagen
2. Nombres y apellidos
3. Apodo
4. Nacimiento
5. Fallecimiento
6. Ocupación
7. Email
8. Relaciones familiares
9. Notas
10. Fuentes

En desktop Nombres y Apellidos deben compartir una grilla; en mobile pueden apilarse.

### FR5 — Datos de identidad

Debe existir una sección reutilizable para Nombres, Apellidos y Apodo.

- `create` y `edit`: inputs existentes.
- `view`: valores read-only, usando `—` cuando corresponda.
- No debe repetirse innecesariamente el nombre completo dentro del modal.

### FR6 — Nacimiento y Fallecimiento

Ambas secciones deben reutilizar el patrón de `LifeDateField` y `LifePlaceField`.

- `create` y `edit`: controles actuales de día, mes, año, precisión y lugar.
- `view`: la misma estructura visual con valores de lectura.
- Las fechas deben humanizarse según idioma y precisión.
- Deben soportarse año, año/mes, fecha completa, aproximación y ausencia de datos.
- No mostrar fechas ISO directamente al usuario.

### FR7 — Campos directos

Ocupación, Email y Notas deben estar visibles sin `+ datos`.

- `create` y `edit`: controles editables actuales.
- `view`: contenido read-only.
- Los valores vacíos deben mostrar `—` o la convención existente.

### FR8 — Relaciones

La sección de relaciones debe ocupar la misma posición en los tres modos.

- `view`: reutilizar `RelationList` para padres, parejas e hijos.
- `create`: conservar la selección de relaciones iniciales existente.
- `edit`: mantener la lógica actual de vínculos sin cambiar el modelo.

La decisión de si las relaciones se guardan junto con el formulario o inmediatamente debe mantenerse explícita y no mezclarse accidentalmente con el nuevo layout.

### FR9 — Fuentes

Debe existir una sección independiente titulada `Fuentes`.

- En `view`, mostrar las fuentes/citas asociadas a la persona.
- En `create` y `edit`, no ocultar ni perder datos existentes.
- Si no existe un editor de citas, mostrar la sección en modo lectura o dejar explícita la limitación.
- La edición completa de citas queda fuera de esta fase y no debe inventarse una nueva persistencia.

### FR10 — Footer y acciones

- `create`: `Cancelar` y `Crear pieza`.
- `edit`: `Cancelar` y `Guardar cambios`.
- `view`: sin footer si no aporta acciones; la edición vive en el header.
- El footer debe ser sticky cuando el modal tenga scroll y no debe quedar cubierto por la navegación mobile.

### FR11 — Estados y errores

Debe conservarse el comportamiento actual para:

- loading de guardado;
- validación de identidad;
- fechas inválidas;
- errores de imagen;
- errores de persistencia local o remota;
- cancelación sin guardar;
- eliminación con confirmación.

## Non-Functional Requirements

- Reutilizar tokens, componentes y clases vigentes de `app/globals.css`.
- Mantener tema claro y oscuro.
- Mantener responsive desde 360 px.
- Mantener contraste y foco visible.
- Usar `prefers-reduced-motion` para desactivar transiciones no esenciales.
- No modificar contratos de API, Supabase, GEDCOM ni el snapshot.
- No duplicar validaciones entre Vista y Edición.
- Mantener accesibilidad de botones icon-only, labels, landmarks y dialog.

## Suggested Architecture

Implementación recomendada, en forma incremental:

```text
PersonModal
├── PersonModalHeader
├── PersonAvatarSection
├── PersonIdentitySection
├── PersonLifeSection
│   ├── PersonDateSection
│   └── PersonPlaceSection
├── PersonContactSection
├── PersonRelationshipsSection
├── PersonNotesSection
├── PersonSourcesSection
└── PersonModalFooter
```

Cada sección debe aceptar `mode` o recibir una variante explícita `editable`, evitando condicionales duplicados en todo el formulario.

## Metrics

- Los tres modos comparten el mismo orden de secciones en el 100% de los casos.
- No quedan textos `+ datos`, `Ficha personal`, `MODO VISTA` ni `MODO EDICIÓN` en estos flujos.
- El 100% de las acciones icon-only tiene label accesible.
- Las fechas visibles en Vista no se muestran en formato ISO.
- Crear, editar, cancelar y eliminar mantienen sus resultados actuales.
- No se pierde información de personas, relaciones, lugares, imágenes ni fuentes existentes.
- `npm run verify`, `npm run test:hallazgos` cuando corresponda y `npm run build` pasan.

## Risks and Dependencies

- Unificar Vista y Edición puede aumentar el tamaño del modal y requerir scroll más cuidadoso.
- Mostrar todos los campos puede generar una experiencia demasiado extensa en mobile.
- La edición de relaciones tiene actualmente un comportamiento distinto al guardado de campos.
- Las fuentes/citas no tienen un editor integrado dentro de `PersonForm`.
- La humanización de fechas debe respetar datos legacy y fechas parciales.
- La imagen arriba del formulario puede afectar el foco inicial y el orden de teclado.

## Rollout Plan

### Fase 1 — Base visual y arquitectura

1. Definir `PersonModal` y contrato de modos.
2. Reutilizar `Modal` y mover la cabecera común.
3. Eliminar redundancias de Vista y Edición.
4. Establecer el orden común de secciones.

### Fase 2 — Campos y lectura

1. Mover imagen arriba y reutilizar cropper/avatar.
2. Eliminar `+ datos`.
3. Crear variantes read-only de identidad, fechas, lugares, notas y contactos.
4. Añadir formateo de fechas humanizado.

### Fase 3 — Relaciones, fuentes y responsive

1. Integrar `RelationList` y selectores en la posición común.
2. Mostrar fuentes/citas asociadas en una sección independiente.
3. Ajustar footer sticky, mobile, temas, foco y reduced motion.
4. Validar exportación, persistencia y sincronización.

## Open Questions

1. En modo Edición, ¿las relaciones se guardan junto con `Guardar cambios` o mantienen su guardado inmediato actual?
2. ¿En esta fase las Fuentes serán únicamente de lectura o se necesita diseñar también alta/edición de citas?
3. ¿El nombre del header debe ser el nombre completo o debe incluir el apodo cuando exista?
4. ¿La sección Fallecimiento debe ocultarse para personas vivas o mostrarse siempre con `—`?
5. ¿La imagen editable debe usar un overlay de cámara/lápiz o un botón textual secundario junto al avatar?
