# PRD: Multiárboles y roles de acceso

## Estado

Borrador para discusión. No implica implementación todavía.

## Resumen ejecutivo

Root Puzzle debe pasar de operar sobre un único árbol compartido a soportar múltiples árboles familiares independientes. Cada árbol tendrá sus propios datos, configuración y colaboradores. Una persona autenticada verá únicamente los árboles a los que pertenece y podrá operar según su rol:

- `owner`: administra el árbol, sus miembros y todos sus datos.
- `editor`: consulta y modifica los datos genealógicos, pero no administra miembros ni elimina el árbol.
- `viewer`: consulta los datos, sin capacidad de modificarlos.

La autorización debe estar garantizada por Supabase Auth + PostgreSQL RLS. La interfaz deberá reflejar los permisos, pero nunca ser la única barrera de seguridad.

## Problema y contexto

La aplicación actual:

- obtiene el último árbol disponible o uno guardado en `localStorage`;
- no asocia `trees` con un usuario autenticado;
- utiliza `tree_id` en las tablas de datos, pero no existe una tabla de pertenencia usuario-árbol;
- permite acceso público mediante políticas RLS demasiado amplias;
- sincroniza todo el árbol completo desde el cliente;
- cuenta ya con login de Supabase, pero todavía no con autorización por recurso.

Esto impide que dos usuarios trabajen con árboles distintos de forma segura y no permite colaboración controlada.

## Objetivos

1. Aislar los datos de cada árbol por usuario y membresía.
2. Permitir que un usuario tenga cero, uno o varios árboles.
3. Permitir que un árbol tenga varios miembros con roles distintos.
4. Hacer cumplir owner/editor/viewer en PostgreSQL mediante RLS.
5. Mantener enlaces públicos de árboles como una capacidad explícita, separada del acceso privado.
6. Migrar el árbol actual sin perder datos.
7. Mantener una experiencia sencilla para el caso habitual de un solo árbol.

## Fuera de alcance inicial

- Roles personalizados.
- Permisos por persona, fuente o evento individual.
- Grupos, organizaciones o facturación.
- Historial completo de auditoría por campo.
- Edición simultánea con resolución avanzada de conflictos.
- Login social; se mantiene email/contraseña en la primera versión.
- Compartir mediante enlaces editables sin membresía.

## Usuarios y casos de uso

### Owner de un árbol

Persona que crea o reclama un árbol familiar. Puede editar todo, invitar o quitar colaboradores, cambiar roles, renombrar el árbol, activar/desactivar publicación y eliminar el árbol.

### Editor

Familiar o investigador colaborador. Puede agregar, editar y eliminar personas, relaciones, eventos, fuentes y sugerencias dentro de los árboles asignados. No puede gestionar miembros ni cambiar la configuración de seguridad.

### Viewer

Invitado que necesita consultar el árbol. Puede navegar, buscar, abrir fichas y visualizar fuentes y cronología. No puede guardar cambios ni importar/exportar datos privados salvo que el producto lo autorice explícitamente más adelante.

## Flujo principal

1. El usuario inicia sesión.
2. La aplicación consulta sus membresías activas.
3. Si no tiene árboles, ve un estado vacío con la acción `Crear árbol`.
4. Si tiene un árbol, se abre automáticamente el último seleccionado.
5. Si tiene varios, aparece un selector de árbol persistente en la navegación.
6. La aplicación carga únicamente el árbol seleccionado.
7. La UI muestra acciones según el rol.
8. Cada operación de lectura o escritura vuelve a estar limitada por RLS.

## Flujos adicionales

### Crear árbol

El usuario autenticado completa nombre y descripción opcional. La operación crea el árbol y su membresía inicial con rol `owner` en una transacción o función RPC segura.

### Invitar colaborador

El owner introduce un email y selecciona `editor` o `viewer`. Para MVP se recomienda una invitación por email con token de un solo uso. Si el email ya corresponde a un usuario, la aceptación agrega la membresía; si no, el enlace lleva primero al registro.

### Cambiar rol

Solo un owner puede cambiar `editor` ↔ `viewer`. El sistema debe impedir que el último owner sea degradado o eliminado sin transferir antes la propiedad.

### Abandonar un árbol

Un editor/viewer puede salir. Un owner debe transferir la propiedad o eliminar el árbol antes de salir.

### Enlace público

La publicación pública debe ser una decisión del owner, almacenada en el árbol. Un enlace público debe ser de solo lectura y no debe conceder acceso a la consola privada ni a operaciones de escritura.

## Matriz de permisos MVP

| Acción | Owner | Editor | Viewer |
|---|---:|---:|---:|
| Ver árbol y datos | Sí | Sí | Sí |
| Buscar y navegar | Sí | Sí | Sí |
| Crear/editar personas | Sí | Sí | No |
| Eliminar personas | Sí | Sí | No |
| Crear/editar relaciones | Sí | Sí | No |
| Crear/editar fuentes y eventos | Sí | Sí | No |
| Importar JSON/GEDCOM | Sí | Sí | No |
| Exportar datos privados | Sí | Sí | No en MVP |
| Ejecutar detective | Sí | Sí | No |
| Aceptar/rechazar sugerencias | Sí | Sí | No |
| Renombrar/configurar árbol | Sí | No | No |
| Invitar miembros | Sí | No | No |
| Cambiar roles | Sí | No | No |
| Quitar miembros | Sí | No | No |
| Activar/desactivar publicación | Sí | No | No |
| Eliminar árbol | Sí | No | No |

## Requisitos funcionales

### Identidad y selección de árbol

- RF1: El sistema debe requerir sesión para acceder a árboles privados.
- RF2: El sistema debe mostrar solo árboles con una membresía activa del usuario.
- RF3: El sistema debe permitir crear varios árboles por usuario.
- RF4: El sistema debe recordar el último árbol seleccionado por dispositivo y validar siempre el acceso en servidor.
- RF5: El cambio de árbol debe limpiar el estado local del árbol anterior antes de cargar el nuevo.

### Membresías

- RF6: Cada membresía debe tener exactamente un rol válido: `owner`, `editor` o `viewer`.
- RF7: Debe existir como máximo un owner lógico por árbol en MVP, salvo que se decida soportar co-owners.
- RF8: El owner debe poder invitar, cambiar roles y quitar miembros.
- RF9: No se debe poder quitar o degradar al último owner.
- RF10: Las invitaciones deben expirar y no poder reutilizarse después de aceptadas.

### Datos y permisos

- RF11: Todas las tablas genealógicas deben quedar indirectamente protegidas por la membresía del árbol.
- RF12: Las lecturas requieren pertenencia activa.
- RF13: Inserts, updates y deletes requieren rol owner o editor.
- RF14: Configuración del árbol, membresías y publicación requieren owner.
- RF15: La UI debe ocultar o deshabilitar acciones no permitidas y mostrar el rol actual.
- RF16: La API debe devolver errores de autorización claros sin filtrar datos.

### Migración y compatibilidad

- RF17: El árbol existente debe asociarse al usuario que lo migre o a un owner definido durante el rollout.
- RF18: Los IDs y relaciones existentes deben conservarse.
- RF19: Los enlaces públicos existentes deben seguir funcionando o mostrar una migración controlada.
- RF20: El modo local debe seguir funcionando cuando Supabase no está configurado, fuera del entorno productivo autenticado.

## Requisitos no funcionales

- Seguridad: ningún dato privado debe depender solo de filtros de JavaScript.
- Rendimiento: las políticas RLS deben usar funciones encapsuladas y columnas indexadas.
- Disponibilidad: cambiar de árbol no debe requerir recargar toda la aplicación.
- Consistencia: crear árbol + membresía owner debe ser atómico.
- UX: el caso de un solo árbol no debe agregar fricción innecesaria.
- Accesibilidad: selector, invitaciones, mensajes de error y estados de rol deben ser navegables por teclado y legibles por lector de pantalla.

## Métricas de éxito

- 100% de las consultas privadas pasan por una membresía válida.
- 0 filas de un árbol visible para un usuario sin membresía mediante cliente anon/authenticated.
- 100% de las mutaciones de viewer rechazadas por RLS.
- 100% de los árboles nuevos tienen owner inicial.
- Un usuario con un solo árbol llega al canvas en no más de un paso después del login.
- Un owner puede invitar y cambiar el rol de un colaborador sin soporte manual.
- Migración del árbol actual sin pérdida de personas ni relaciones.

## Riesgos y dependencias

- El esquema actual tiene RLS público: hay que reemplazarlo antes de considerar segura la multi-tenencia.
- El store actual busca el árbol más reciente; debe pasar a listar por membresía.
- El cliente usa `localStorage` para el ID del árbol; debe tratarlo solo como preferencia, nunca como autorización.
- Los enlaces públicos requieren una política separada para no abrir las tablas privadas.
- Supabase Auth debe tener configuradas las URLs de redirección para invitaciones y recuperación.
- El modelo actual sincroniza blobs completos desde el cliente; con colaboradores habrá riesgo de overwrites y conviene reducir el alcance de cada escritura.

## Plan de rollout

### Fase 0 — Decisiones

- Confirmar si habrá uno o varios owners.
- Confirmar si viewer puede exportar.
- Confirmar si editor puede borrar personas y datos.
- Definir política de enlaces públicos.

### Fase 1 — Modelo y seguridad

- Agregar propietario/membresías.
- Crear funciones auxiliares de autorización.
- Reemplazar políticas públicas por RLS por membresía.
- Agregar índices y pruebas SQL.

### Fase 2 — Selección y administración

- Selector de árboles.
- Crear árbol.
- Pantalla de miembros e invitaciones para owner.
- Mostrar rol y estados de acceso.

### Fase 3 — Adaptación del store

- Consultar árboles por membresía.
- Cargar por `tree_id` seleccionado.
- Hacer escrituras compatibles con permisos.
- Evitar que el cliente cambie de árbol por ID arbitrario.

### Fase 4 — Migración y publicación

- Asociar datos existentes a un owner.
- Validar enlaces públicos.
- Ejecutar pruebas de aislamiento y regresión.
- Activar la autenticación obligatoria en producción.

## Preguntas abiertas

1. ¿Un árbol puede tener varios owners o exactamente uno?
2. ¿El viewer puede descargar un GEDCOM/JSON?
3. ¿El editor puede borrar datos o solo crearlos y editarlos?
4. ¿Las invitaciones se envían por Supabase Auth email, por un proveedor externo o se copian como enlace?
5. ¿Un enlace público debe existir por árbol o por versión publicada?
6. ¿Qué ocurre con el árbol actual si no se puede determinar su owner?
7. ¿La publicación pública muestra todas las personas o permite ocultar campos sensibles?
8. ¿Se necesita auditoría de cambios desde el primer release?

