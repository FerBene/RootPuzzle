# PRD: Invitaciones y colaboración por árbol

## Estado

Borrador detallado para revisión. No implica implementación hasta cerrar las decisiones abiertas.

## 1. Resumen ejecutivo

Root Puzzle debe permitir que el owner de un árbol invite a otras personas como colaboradores (`editor`) o espectadores (`viewer`). La invitación debe estar asociada a un árbol específico, a un email y a un rol concreto. El destinatario recibirá un enlace seguro, iniciará sesión o creará una cuenta y aceptará la invitación. A partir de ese momento, la membresía quedará registrada en `tree_memberships` y el usuario podrá acceder únicamente a ese árbol con los permisos asignados.

El flujo debe usar Supabase Auth para la identidad, una Edge Function para enviar invitaciones y operaciones administrativas, y PostgreSQL/RLS para que la autorización no dependa de la interfaz.

## 2. Problema y contexto

La aplicación ya tiene:

- autenticación por email y contraseña;
- múltiples árboles y selector de árbol;
- roles `owner`, `editor` y `viewer`;
- tabla `tree_memberships`;
- RLS basada en la membresía;
- RPC `create_tree` para crear un árbol y asignar su owner.

Todavía falta el mecanismo de colaboración. Hoy los roles deben asignarse manualmente desde SQL, lo que:

- no es usable para un owner no técnico;
- no permite enviar una invitación desde el producto;
- no ofrece expiración, revocación ni trazabilidad;
- obliga a conocer el UUID del usuario;
- dificulta que alguien sin cuenta pueda incorporarse al árbol.

## 3. Objetivo del producto

Permitir que un owner comparta un árbol de forma segura y autogestionada, con control explícito sobre quién puede editar y quién solo puede consultar.

## 4. Objetivos

1. Permitir invitar por email a un árbol específico.
2. Permitir elegir `editor` o `viewer` al crear la invitación.
3. Permitir que el destinatario acepte la invitación después de iniciar sesión o registrarse.
4. Evitar que un usuario pueda modificar el árbol antes de aceptar.
5. Permitir al owner ver, cambiar y revocar colaboradores.
6. Evitar invitaciones duplicadas o ambiguas.
7. Mantener la autorización efectiva en Supabase, no solo en React.
8. Proteger las claves administrativas: la `service_role key` nunca debe llegar al navegador.

## 5. No objetivos del MVP

- Co-owners o múltiples propietarios con idéntico nivel administrativo.
- Invitaciones masivas por CSV.
- Grupos u organizaciones.
- Roles personalizados.
- Permisos por entidad individual.
- Comentarios, chat o notificaciones internas.
- Auditoría completa de cada cambio de datos.
- SSO o login social.
- Invitaciones públicas sin destinatario definido.

## 6. Supuestos

- Cada árbol tiene un owner único en el MVP.
- El owner puede invitar únicamente como `editor` o `viewer`.
- Un email identifica al destinatario de una invitación.
- El destinatario debe autenticarse con el mismo email invitado.
- Supabase Auth será el proveedor de identidad.
- Supabase Edge Functions será el límite seguro para usar APIs administrativas.
- El proveedor inicial de email será el sistema configurado en Supabase Auth, salvo decisión posterior.

## 7. Personas

### Owner

Investiga su familia y necesita invitar a un familiar para que aporte información o a otra persona para que revise el árbol.

Necesita:

- saber quién tiene acceso;
- entender qué puede hacer cada rol;
- revocar acceso rápidamente;
- evitar compartir credenciales.

### Editor invitado

Puede agregar o corregir personas, relaciones, fuentes y eventos. No debe poder cambiar permisos ni invitar a terceros.

### Viewer invitado

Quiere consultar el árbol sin riesgo de alterar información. Puede navegar y buscar, pero no debe ver controles de edición.

### Destinatario sin cuenta

Recibe la invitación, crea una cuenta con el email invitado y entra al árbol sin tener que conocer UUIDs ni ejecutar SQL.

## 8. Experiencia propuesta

### Ubicación

Agregar una sección `Colaboradores` o `Miembros` accesible desde el perfil del árbol. Solo se muestra para owner.

La pantalla tendrá:

- nombre del árbol actual;
- rol del usuario actual;
- lista de miembros activos;
- lista de invitaciones pendientes;
- formulario para enviar una invitación.

### Formulario de invitación

Campos:

- Email: obligatorio, formato válido.
- Rol: `Editor` o `Viewer`.
- Mensaje opcional: texto corto que se incluirá en el correo.

Acciones:

- `Enviar invitación`.
- `Cancelar`.

Texto de ayuda sugerido:

> Los editores pueden modificar el árbol. Los viewers solo pueden consultarlo.

### Lista de miembros

Cada fila muestra:

- email o identidad disponible;
- rol actual;
- fecha de incorporación;
- última actividad, si está disponible;
- acciones del owner.

Acciones:

- cambiar `editor` ↔ `viewer`;
- revocar acceso;
- confirmar antes de quitar.

El owner actual debe aparecer claramente y no puede ser eliminado ni degradado si es el último owner.

### Lista de invitaciones pendientes

Cada fila muestra:

- email invitado;
- rol propuesto;
- fecha de creación;
- fecha de expiración;
- estado;
- acciones `Reenviar` y `Revocar`.

## 9. Flujos de usuario

### Flujo A — Enviar una invitación

1. El owner abre el árbol.
2. Entra a `Colaboradores`.
3. Ingresa el email.
4. Selecciona `Editor` o `Viewer`.
5. Opcionalmente agrega un mensaje.
6. Presiona `Enviar invitación`.
7. La aplicación llama a una Edge Function autenticada.
8. La función verifica que el usuario actual sea owner del árbol.
9. La función cancela o reemplaza una invitación pendiente duplicada según la política definida.
10. Se genera un token aleatorio de un solo uso.
11. Se guarda únicamente el hash del token en la base.
12. Se envía el email con un enlace de aceptación.
13. La UI muestra confirmación y actualiza la lista.

### Flujo B — Destinatario con cuenta

1. El destinatario abre el enlace.
2. Si no tiene sesión, ve una pantalla de login.
3. Inicia sesión con el email invitado.
4. El sistema valida token, expiración, email y estado.
5. Se crea la membresía con el rol invitado.
6. La invitación pasa a `accepted`.
7. El usuario es enviado al árbol correspondiente.

### Flujo C — Destinatario sin cuenta

1. El destinatario abre el enlace.
2. El sistema conserva el token en una URL segura o estado de sesión temporal.
3. El destinatario crea una cuenta con el email invitado.
4. Confirma su email si la configuración de Auth lo requiere.
5. Vuelve al enlace o recibe un enlace de continuación.
6. Se valida la invitación y se crea la membresía.

### Flujo D — Cambiar rol

1. El owner selecciona un miembro activo.
2. Cambia `editor` por `viewer` o viceversa.
3. El sistema muestra una confirmación si el cambio reduce permisos.
4. Se actualiza la membresía.
5. La próxima operación del usuario respeta el nuevo rol; idealmente la sesión se refresca mediante `onAuthStateChange` o al volver a cargar el árbol.

### Flujo E — Revocar acceso

1. El owner selecciona `Revocar acceso`.
2. Confirma la operación.
3. Se elimina o desactiva la membresía.
4. El usuario deja de poder consultar el árbol en la siguiente consulta.
5. Si tenía el árbol abierto, la UI muestra `Ya no tenés acceso a este árbol` y lo devuelve al selector.

### Flujo F — Revocar invitación pendiente

1. El owner selecciona una invitación pendiente.
2. La revoca.
3. El token queda inutilizable.
4. Si el destinatario intenta usarlo, recibe un mensaje genérico de invitación inválida.

### Flujo G — Reenviar

1. El owner selecciona `Reenviar`.
2. Se invalida el token anterior.
3. Se genera un nuevo token y nueva expiración.
4. Se registra el nuevo envío.

## 10. Estados de una invitación

Estados de producto:

- `pending`: creada y todavía utilizable.
- `accepted`: aceptada y convertida en membresía.
- `expired`: superó la fecha de expiración.
- `revoked`: invalidada por el owner.
- `replaced`: reemplazada por un reenvío o una nueva invitación.

Se recomienda no reutilizar tokens ni reactivar invitaciones aceptadas.

## 11. Reglas de negocio

- Solo un owner puede crear invitaciones.
- Solo se pueden invitar roles `editor` y `viewer`.
- Un owner no puede invitar a otro owner en el MVP.
- El email de la invitación debe normalizarse con trim y lowercase.
- El destinatario debe coincidir con el email invitado.
- Una invitación expira, por ejemplo, a los 7 días; el valor debe ser configurable.
- Una invitación aceptada queda inutilizable.
- Una invitación revocada queda inutilizable.
- Si el email ya es miembro, no se crea otra invitación activa; se debe ofrecer cambiar su rol desde miembros.
- Debe existir como máximo una invitación pendiente por `tree_id + email`.
- Revocar a un miembro no elimina sus aportes históricos del árbol.
- El owner no puede quitarse ni degradarse si no existe otro owner.
- Un editor no puede invitar aunque tenga permisos de escritura sobre los datos.
- El token no debe contener información sensible ni el rol en texto confiable para autorización.

## 12. Matriz de permisos

| Acción | Owner | Editor | Viewer | Anónimo |
|---|---:|---:|---:|---:|
| Ver miembros | Sí | No | No | No |
| Crear invitación | Sí | No | No | No |
| Reenviar invitación | Sí | No | No | No |
| Revocar invitación | Sí | No | No | No |
| Cambiar rol | Sí | No | No | No |
| Revocar miembro | Sí | No | No | No |
| Ver datos del árbol | Sí | Sí | Sí | No |
| Editar datos genealógicos | Sí | Sí | No | No |
| Aceptar su propia invitación | No aplica | Sí al aceptar | Sí al aceptar | Sí, mediante registro/login |

## 13. Arquitectura técnica

### Componentes

1. Cliente Next/React:
   - pantalla de colaboradores;
   - formulario y estados de carga;
   - página de aceptación;
   - manejo de sesión y redirección.
2. Supabase Edge Function:
   - `create-tree-invitation`;
   - `accept-tree-invitation` si la aceptación requiere lógica privilegiada;
   - opcionalmente `resend-tree-invitation`.
3. PostgreSQL:
   - tabla de invitaciones;
   - funciones de validación;
   - RLS;
   - constraints e índices.
4. Supabase Auth:
   - login/registro;
   - confirmación de email;
   - invitación administrativa si se decide usar `auth.admin.inviteUserByEmail()`.

### Por qué Edge Function

`service_role key` y `auth.admin.inviteUserByEmail()` no deben ejecutarse desde el navegador. La Edge Function recibe el JWT del usuario, valida su identidad y ejecuta la operación administrativa con secretos del entorno.

## 14. Modelo de datos propuesto

```sql
create table public.tree_invitations (
  id uuid primary key default gen_random_uuid(),
  tree_id uuid not null references public.trees(id) on delete cascade,
  email text not null,
  role public.tree_role not null check (role in ('editor', 'viewer')),
  token_hash text not null unique,
  invited_by uuid not null references auth.users(id),
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'expired', 'revoked', 'replaced')),
  message text not null default '',
  expires_at timestamptz not null,
  accepted_at timestamptz,
  accepted_by uuid references auth.users(id),
  revoked_at timestamptz,
  revoked_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index tree_invitations_pending_email_idx
  on public.tree_invitations (tree_id, email)
  where status = 'pending';

create index tree_invitations_tree_id_idx
  on public.tree_invitations (tree_id, created_at desc);

create index tree_invitations_email_idx
  on public.tree_invitations (email);
```

El token debe generarse con suficiente entropía y guardarse hasheado. El enlace puede contener el token plano porque la base nunca lo almacena directamente.

## 15. Seguridad y RLS

### Invitaciones privadas

La tabla de invitaciones no debe ser consultable por `anon`. El owner puede leer invitaciones de sus árboles. Un usuario invitado no debe poder consultar invitaciones por email antes de demostrar que posee un token válido.

Política conceptual:

```sql
create policy invitations_owner_select
on public.tree_invitations
for select to authenticated
using ((select public.is_tree_owner(tree_id)));

create policy invitations_owner_insert
on public.tree_invitations
for insert to authenticated
with check ((select public.is_tree_owner(tree_id))
  and invited_by = (select auth.uid()));

create policy invitations_owner_update
on public.tree_invitations
for update to authenticated
using ((select public.is_tree_owner(tree_id)))
with check ((select public.is_tree_owner(tree_id)));
```

La aceptación debería ser una función/RPC controlada que:

1. reciba el token o un hash derivado;
2. valide expiración y estado;
3. obtenga la sesión actual;
4. compare el email de `auth.users` con el email normalizado de la invitación;
5. inserte la membresía con el rol almacenado en la base;
6. marque la invitación como `accepted` en una operación atómica.

El rol nunca debe venir como autoridad desde el cliente.

### Protección del token

- Usar tokens criptográficamente aleatorios.
- Almacenar solo un hash.
- Invalidar el token después de aceptarlo.
- No incluir el email completo ni datos del árbol en el token.
- No registrar el token plano en logs.
- No mostrar errores que permitan enumerar invitaciones válidas.

## 16. Diseño de Edge Functions

### `create-tree-invitation`

Entrada:

```json
{
  "treeId": "uuid",
  "email": "persona@example.com",
  "role": "editor",
  "message": "¿Podés ayudarme a revisar esta rama?"
}
```

Proceso:

1. Validar JWT.
2. Validar body y normalizar email.
3. Confirmar owner mediante RPC o consulta con RLS/cliente admin cuidadosamente acotado.
4. Comprobar que el email no sea el owner actual.
5. Resolver invitaciones duplicadas.
6. Generar token y hash.
7. Insertar invitación.
8. Enviar email mediante Supabase Auth o proveedor seleccionado.
9. Si el envío falla, marcar/revertir la invitación según una estrategia transaccional.
10. Devolver un resultado sin exponer secretos.

Salida exitosa:

```json
{
  "invitationId": "uuid",
  "status": "pending",
  "expiresAt": "timestamp"
}
```

### `accept-tree-invitation`

Entrada:

```json
{ "token": "token-plano-del-enlace" }
```

Proceso:

1. Validar que exista sesión.
2. Calcular hash.
3. Buscar invitación pendiente.
4. Verificar expiración.
5. Comparar email autenticado con email invitado.
6. Insertar/actualizar membresía.
7. Marcar invitación como aceptada.
8. Devolver árbol y rol, sin devolver datos innecesarios.

## 17. Email y contenido

Asunto sugerido:

> Te invitaron a colaborar en un árbol familiar de Root Puzzle

Contenido mínimo:

- nombre del árbol;
- nombre o email del invitador, si está disponible;
- rol asignado;
- mensaje opcional;
- botón `Aceptar invitación`;
- fecha de expiración;
- aviso de seguridad: ignorar si no esperabas la invitación.

No incluir en el email nombres sensibles de personas del árbol, notas privadas, fuentes ni datos genealógicos.

## 18. Estados de UI y errores

La interfaz debe manejar:

- email inválido;
- rol no permitido;
- usuario actual no owner;
- invitación duplicada;
- email ya miembro;
- envío de email fallido;
- invitación expirada;
- invitación revocada;
- invitación ya aceptada;
- email autenticado distinto al invitado;
- sesión ausente;
- árbol eliminado;
- pérdida de acceso mientras la pantalla está abierta;
- rate limit excedido.

Los mensajes no deben revelar si un email existe en Auth cuando eso facilite enumeración de usuarios.

## 19. Rate limiting y abuso

Aplicar límites en la Edge Function:

- máximo de invitaciones por owner y árbol en una ventana temporal;
- máximo de reenvíos por invitación;
- cooldown entre envíos al mismo email;
- límite global por IP si el proveedor lo permite;
- registrar intentos fallidos sin guardar tokens.

Cuando se alcance el límite, mostrar un mensaje de espera sin indicar detalles internos.

## 20. Migración y compatibilidad

1. Crear `tree_invitations`.
2. Agregar funciones y políticas RLS.
3. Verificar que exista el owner de cada árbol.
4. Crear Edge Functions y configurar secretos.
5. Activar la pantalla solo para owners.
6. Mantener la asignación manual por SQL como fallback temporal.
7. Migrar invitaciones pendientes existentes si las hubiera.

No cambiar las membresías existentes ni eliminar colaboradores durante el rollout.

## 21. Observabilidad

Registrar eventos no sensibles:

- invitación creada;
- invitación reenviada;
- invitación aceptada;
- invitación revocada;
- invitación expirada;
- envío fallido;
- rechazo por email diferente;
- rechazo por permisos.

No registrar:

- tokens;
- contraseñas;
- service role key;
- contenido privado del árbol;
- mensajes completos si pueden contener datos personales.

## 22. Criterios de aceptación

### Owner

- Puede abrir la pantalla de colaboradores.
- Puede enviar una invitación como editor o viewer.
- Recibe confirmación solo cuando la operación fue aceptada por backend.
- Puede ver invitaciones pendientes.
- Puede reenviar y revocar.
- Puede cambiar el rol de un miembro.
- Puede revocar un miembro.
- No puede eliminar o degradar al último owner.

### Destinatario

- Puede aceptar con una cuenta existente.
- Puede registrarse desde el enlace.
- No puede aceptar usando otro email.
- No puede reutilizar una invitación aceptada, revocada o expirada.
- Entra automáticamente al árbol correcto tras aceptar.

### Seguridad

- Un editor no puede crear invitaciones llamando directamente a la API.
- Un viewer no puede modificar datos.
- Un usuario sin membresía no puede leer datos del árbol.
- `anon` no puede consultar invitaciones privadas.
- El rol efectivo se toma de la base y no del cliente.
- La `service_role key` no aparece en el bundle ni en variables `NEXT_PUBLIC_*`.

## 23. Métricas

- Tasa de invitaciones enviadas con éxito.
- Tasa de aceptación.
- Tiempo mediano entre envío y aceptación.
- Tasa de invitaciones expiradas.
- Tasa de reenvíos.
- Tasa de errores por email incorrecto.
- Tiempo mediano para que un owner agregue un colaborador.
- Cero accesos no autorizados en pruebas RLS.

Metas iniciales sugeridas:

- 95% de invitaciones válidas enviadas sin error.
- 80% de invitaciones aceptadas dentro de 7 días.
- menos de 2% de errores por estado inconsistente.
- 100% de pruebas de aislamiento pasando.

## 24. Riesgos y mitigaciones

### Email no entregado

Mitigación: reenvío, estado visible, configuración de dominio y proveedor confiable.

### Usuario usa otro email

Mitigación: comparar email autenticado y ofrecer cerrar sesión/iniciar con el email invitado.

### Duplicados

Mitigación: índice único parcial por árbol/email/estado pendiente.

### Fuga del token

Mitigación: token de un solo uso, hash en DB, expiración, no registrar token.

### Owner revocado por error

Mitigación: restricciones de último owner y confirmaciones explícitas.

### Abuso de envío

Mitigación: rate limits, cooldown, logs y límites por owner.

### Conflictos de edición

Mitigación: separar invitaciones de sincronización; abordar control de versiones en una fase posterior.

## 25. Plan de rollout

### Fase 0 — Decisiones

- Confirmar duración de invitación.
- Confirmar proveedor de email.
- Confirmar si el registro requiere verificación de email.
- Confirmar política de duplicados.
- Confirmar si se permitirán varios owners en el futuro.

### Fase 1 — Backend seguro

- Crear tabla y migración.
- Crear índices, constraints y RLS.
- Crear RPC/funciones de aceptación.
- Crear Edge Function de envío.
- Configurar secretos y URLs.
- Probar con usuarios de staging.

### Fase 2 — UI owner

- Pantalla de colaboradores.
- Envío, estados y errores.
- Lista de miembros.
- Cambio de rol y revocación.

### Fase 3 — Aceptación

- Página de invitación.
- Login/registro contextual.
- Validación de email.
- Redirección al árbol.

### Fase 4 — Producción

- Activar rate limits.
- Verificar emails y dominio.
- Migrar y revisar owners.
- Activar feature flag.
- Monitorear errores durante los primeros días.

## 26. Preguntas abiertas

1. ¿La invitación debe expirar en 24 horas, 7 días o 30 días?
2. ¿Se exige confirmar email antes de aceptar?
3. ¿Usaremos el email nativo de Supabase o Resend/otro proveedor?
4. ¿Qué ocurre si el email ya pertenece a un miembro con otro rol?
5. ¿Se permite reenviar sin revocar la invitación anterior?
6. ¿El owner puede invitar a otro owner en una futura versión?
7. ¿Queremos permitir que un viewer exporte el árbol?
8. ¿El destinatario puede rechazar formalmente la invitación?
9. ¿Se necesita auditoría visible para el owner?
10. ¿Queremos incluir un mensaje personalizado o solo texto fijo?

