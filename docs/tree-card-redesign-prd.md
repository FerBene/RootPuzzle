# PRD: Tarjetas de piezas en el lienzo

## Executive Summary
Rediseñar las tarjetas individuales del lienzo para que cada pieza se lea como una ficha genealógica premium, con versión completa y vacía, y con orientación horizontal o vertical según el espacio disponible, especialmente al rotar un celular.

## Problem and Context
Las tarjetas actuales son compactas y funcionales, pero no comunican jerarquía visual ni estado de completitud. En el lienzo se necesita reconocer rápido quién es la persona, qué parentesco tiene, si falta foto o datos, y qué rama familiar representa.

## Goals and Non-Goals
Goals:
- Mostrar foto o placeholder visual cuando no hay imagen.
- Mostrar parentesco, nombre, fecha de nacimiento y rama familiar.
- Mostrar una versión horizontal para pantallas anchas y una vertical para mobile portrait.
- Mantener click para abrir ficha y doble click para enfocar.
- Mantener el botón Centrar funcionando con el nuevo tamaño de tarjeta.

Non-goals:
- No crear un editor inline dentro de la tarjeta.
- No rediseñar el drawer completo de persona.
- No cambiar el modelo de datos.

## Personas
- Investigador familiar: compara muchas piezas y necesita detectar faltantes.
- Usuario casual en mobile: rota el teléfono para navegar mejor el árbol.
- Colaborador público: necesita entender rápidamente sobre quién está aportando información.

## User Flows
- El usuario abre el lienzo y ve tarjetas con foto, parentesco, nombre y datos clave.
- Si faltan datos, la tarjeta muestra placeholders discretos en lugar de texto roto o vacío.
- En mobile portrait la tarjeta usa composición vertical; en landscape o desktop usa composición horizontal.
- Al tocar Centrar, el lienzo encuadra todas las tarjetas con las nuevas dimensiones.

## Functional Requirements
- FR1: La tarjeta debe renderizar foto si `profileImage` existe.
- FR2: Si no hay foto, debe renderizar un placeholder de retrato.
- FR3: Si no hay nombre, fecha o rama, debe mostrar skeleton/placeholder visual.
- FR4: El parentesco debe seguir usando los labels ya calculados por género e idioma.
- FR5: La tarjeta debe exponer cantidad de fuentes cuando existan citas asociadas.
- FR6: La orientación de tarjeta debe cambiar por viewport: mobile portrait vertical, landscape/desktop horizontal.
- FR7: El layout del árbol debe usar las dimensiones reales de la variante activa.

## Non-Functional Requirements
- No debe romper exportación PDF, centrar, zoom, pan ni líneas.
- Debe compilar con `next build`.
- Debe mantener legibilidad en modo oscuro.
- Debe evitar texto desbordado dentro de la tarjeta.

## Metrics
- El botón Centrar encuadra el 100% de tarjetas visibles.
- No hay overflow textual visible en nombres largos.
- Build y verificación del repo pasan.

## Risks and Dependencies
- Tarjetas más grandes pueden requerir mayor zoom automático en árboles grandes.
- La versión PDF del lienzo sigue siendo una exportación simplificada en canvas.
- Las fuentes por persona dependen de `citations.personId`; si no hay citas cargadas, el contador no aparece.

## Rollout Plan
1. Crear componente de tarjeta enriquecida.
2. Parametrizar dimensiones del layout por orientación.
3. Ajustar CSS de tarjeta horizontal/vertical, estados completos/vacíos y dark mode.
4. Validar con `npm run verify` y `npm run build`.

## Open Questions
- Si una persona tiene varias ramas/apellidos, hoy se muestra el primer apellido como rama principal.
- Más adelante se puede sumar un menú real al botón de tres puntos; por ahora conserva la interacción de abrir ficha.
