# PRD - Lienzo Familiar Root Puzzle

## Executive Summary
El lienzo debe permitir leer relaciones familiares complejas sin desperdiciar espacio ni mezclar parentescos visualmente. La mejora propone un layout por grupos familiares: rama directa, hermanos, parejas y parentescos colaterales se distribuyen con reglas distintas y etiquetas relativas a la persona enfocada.

## Problem and Context
Problemas observados:
- Algunas tarjetas quedan demasiado separadas, especialmente en vistas amplias o en "todas las piezas".
- Hermanos, parejas y otros parientes aparecen en una misma banda sin diferenciacion visual suficiente.
- La vista "todas las piezas" no comunica tios, primos, sobrinos u otras ramas colaterales.

Hechos:
- La app ya tiene datos de parentesco padre/hijo y parejas.
- El lienzo permite foco de rama, vista completa y escala temporal.
- Las tarjetas ya muestran una etiqueta de relacion.

Supuestos:
- La persona enfocada es el punto de referencia para nombrar parentescos en vista completa.
- El MVP no necesita un motor genealogico exhaustivo, pero si reglas claras para parentescos frecuentes.

## Goals and Non-Goals
Goals:
- Compactar separaciones horizontales y verticales sin superponer tarjetas.
- Separar visualmente parejas, hermanos y parientes colaterales.
- En "todas las piezas", agrupar por componentes y familias nucleares.
- Etiquetar tios, primos, sobrinos, hermanos, parejas, ancestros y descendientes cuando sea posible.
- Mantener interacciones existentes: click para ficha, doble click para enfocar, filtros, escala temporal y PDF.
- Renombrar "Arbol" a "Mis raices".

Non-goals:
- Inferir parentescos politicos avanzados.
- Reemplazar el modelo de datos.
- Crear un editor grafico manual de posiciones.

## Personas
- Dueño del arbol: necesita entender rapidamente donde falta o sobra informacion.
- Familiar colaborador: necesita interpretar ramas y parentescos sin conocer el modelo genealogico.
- Investigador: necesita comparar generaciones y grupos familiares sin lineas cruzadas innecesarias.

## User Flows
- Ver rama enfocada: el usuario distingue linea directa, hermanos y parejas.
- Activar generacion: los hermanos aparecen agrupados a un lado y las parejas al otro.
- Ver todas las piezas: la app muestra ramas familiares agrupadas por padres, con etiquetas relativas al foco.
- Cambiar foco: doble click en una tarjeta reorganiza la lectura alrededor de esa persona.

## Functional Requirements
- FR1: Las tarjetas del mismo grupo familiar deben quedar contiguas.
- FR2: Las parejas deben usar borde/linea visual distinta a hermanos y relacion padre-hijo.
- FR3: Los hermanos no deben intercalarse con parejas.
- FR4: La vista completa debe agregar lineas de pareja y etiquetas relativas al foco.
- FR5: La vista completa debe agrupar hermanos por padres cuando existan.
- FR6: El layout debe reducir gaps por defecto y conservar un minimo anti-solapamiento.
- FR7: La seccion de arbol debe llamarse "Mis raices".

## Non-Functional Requirements
- El layout debe ser determinista.
- Debe funcionar con datos incompletos.
- No debe romper escala temporal ni exportacion PDF.
- Debe mantenerse legible en desktop y mobile.

## Metrics
- Menos espacio vacio horizontal en vista completa.
- Hermanos y parejas distinguibles sin abrir la ficha.
- Parentescos colaterales frecuentes etiquetados en la tarjeta.
- Build de produccion aprobado.

## Risks and Dependencies
- Riesgo: parentescos ambiguos con multiples padres o familias ensambladas. Mitigacion: fallback a "Pariente" o "Rama familiar".
- Riesgo: grupos grandes pueden requerir scroll horizontal. Mitigacion: compactar gaps y mantener pan/zoom.
- Dependencia: datos `parentChild` y `partnerships`.

## Rollout Plan
1. Ajustar constantes de espaciado.
2. Separar hermanos y parejas en rama enfocada.
3. Rehacer "todas las piezas" por componentes y grupos de padres.
4. Agregar etiquetas relativas al foco.
5. Agregar estilos visuales por tipo de relacion.
6. Validar `verify` y `build`.

## Open Questions
- Si el arbol crece mucho, evaluar layout manual guardado por usuario.
- Si se agrega i18n real, traducir etiquetas de parentesco y PRD.
