# PRD — Unificación de logo y tipografía de Root Puzzle

## Executive Summary

Root Puzzle necesita un sistema de marca reutilizable para que el logo, el nombre de la aplicación y el subtítulo se perciban como una misma identidad en menú, login, carga, estados vacíos y vistas públicas. La solución propone un único lockup de marca, con variantes de tamaño y contexto, apoyado en tokens que funcionen en modo claro y oscuro.

## Problem and Context

La auditoría UX/UI detectó que:

- El wordmark usa Georgia en el sidebar, mientras que otros encabezados utilizan Inter.
- El logo recibe tratamientos distintos según la pantalla: fondos, `mix-blend-mode`, filtros, tamaños y radios diferentes.
- El sidebar muestra nombre y subtítulo, pero el login muestra sólo “Root Puzzle”.
- Loading y estados vacíos reutilizan el logo sin un sistema compartido de proporciones y contraste.
- Los tokens de marca están repartidos entre reglas base, overrides de tema claro y overrides de tema oscuro.

La identidad editorial/natural existente se conserva. El objetivo no es rediseñar el logo, sino ordenar su presentación.

## Goals and Non-Goals

### Goals

- Crear un componente de lockup reutilizable para logo, nombre y subtítulo.
- Unificar tipografía, jerarquía, espaciado, proporciones y estados de foco/hover.
- Mantener legibilidad y contraste en modo claro y oscuro.
- Conservar variantes compactas para sidebar colapsado, mobile y pantallas de carga.
- Actualizar metadata y manifest para que el nombre oficial sea consistente.

### Non-Goals

- Rediseñar o regenerar el archivo de logo.
- Cambiar la navegación, el layout general o la paleta completa de la aplicación.
- Agregar una librería de tipografías externa.
- Convertir usos decorativos del logo en navegación si el flujo no lo requiere.

## Personas

- Usuario local: reconoce rápidamente la aplicación al abrirla y al volver desde una vista interna.
- Usuario autenticado: necesita una señal de marca clara y confiable en el login.
- Visitante público: debe identificar Root Puzzle en una vista pública sin confundirla con un producto distinto.

## User Flows

1. El usuario abre la aplicación: ve el mismo lockup de marca en el sidebar.
2. El usuario colapsa el sidebar: queda el símbolo como marca compacta y accesible, sin texto truncado.
3. El usuario inicia sesión: ve logo, “Root Puzzle” y “Genealogía web” con la misma jerarquía que en el menú.
4. El usuario abre una vista pública o un estado de carga/vacío: recibe una variante contextual del mismo sistema visual.
5. El usuario cambia de tema: el lockup conserva contraste, proporción y jerarquía sin saltos.

## Functional Requirements

- FR1: Debe existir un componente compartido para el lockup de marca.
- FR2: El componente debe aceptar al menos las variantes `sidebar`, `auth`, `compact` y `loading`.
- FR3: El nombre visible debe ser “Root Puzzle” y el subtítulo “Genealogía web”, salvo que el contexto requiera ocultarlo por espacio.
- FR4: El logo debe conservar proporción, `object-fit: contain` y un tratamiento definido por tokens, sin depender de `mix-blend-mode` para ser legible.
- FR5: El sidebar y login deben utilizar el mismo componente, no markup duplicado.
- FR6: Los estados de loading/vacío deben reutilizar el símbolo y sus tokens de tamaño/contraste.
- FR7: El lockup debe tener foco visible si el contenedor es interactivo y texto alternativo adecuado cuando el logo comunique información.
- FR8: La variante compacta debe ocultar texto sin perder una etiqueta accesible.

## Non-Functional Requirements

- NFR1: Mantener responsive desde 360 px.
- NFR2: Cumplir contraste WCAG AA en claro y oscuro para el nombre y subtítulo.
- NFR3: Respetar `prefers-reduced-motion`; cualquier hover será no esencial.
- NFR4: No agregar dependencias nuevas.
- NFR5: No modificar el archivo de imagen del logo ni introducir secretos.

## Metrics

- 100% de las instancias visibles de nombre/logo identificadas usan el lockup o una variante documentada.
- 0 tratamientos con contraste insuficiente en las combinaciones claro/oscuro soportadas.
- 0 textos “Root Puzzle” duplicados con estilos independientes en los componentes principales.
- Validación visual en 360, 768, 1440 px y ambos temas.

## Risks and Dependencies

- El logo actual contiene un fondo/brillo integrado; el componente debe evitar que el fondo de la superficie lo vuelva ilegible.
- Exportaciones HTML/PDF que incluyen el nombre deben conservar el texto de producto, aunque no compartan React.
- La metadata y el manifest pueden requerir actualización junto con el componente para evitar nombres históricos.

## Rollout Plan

### Fase 1 — Sistema compartido

Crear el componente de marca y tokens de tipografía, color, tamaño y espaciado.

### Fase 2 — Superficies principales

Aplicarlo al sidebar, login, loading y estados vacíos; validar claro/oscuro y responsive.

### Fase 3 — Superficies secundarias

Revisar vista pública, metadata, manifest y textos de exportación para cerrar inconsistencias.

## Open Questions

- ¿El subtítulo debe permanecer siempre “Genealogía web” o podrá configurarse por árbol en el futuro?
- ¿La vista pública debe mostrar el lockup completo o una variante con sólo el nombre?

