# Documentación técnica: multiárboles y roles

## Objetivo

Evolucionar el modelo actual de Root Puzzle a un modelo multi-tenant basado en Supabase Auth, con aislamiento por árbol y autorización por membresía.

## Situación actual

- `public.trees` no tiene `owner_id`.
- Las tablas de dominio (`people`, `sources`, `events`, `partnerships`, `parent_child`, `citations`, `detective_suggestions`) tienen `tree_id`.
- El cliente guarda el último `tree_id` en `localStorage`.
- `getRemoteTree()` obtiene un ID local o el árbol más reciente.
- `saveRemoteTree()` crea/actualiza el árbol más reciente.
- Las políticas RLS del esquema permiten operaciones públicas a todos los roles.

## Modelo recomendado

### Opción elegida: tabla de membresías

Usar una tabla explícita `tree_memberships` en lugar de guardar solo `owner_id` en `trees`.

```sql
create type public.tree_role as enum ('owner', 'editor', 'viewer');

alter table public.trees
  add column created_by uuid references auth.users(id),
  add column is_public boolean not null default false,
  add column public_token text unique;

create table public.tree_memberships (
  tree_id uuid not null references public.trees(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.tree_role not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (tree_id, user_id)
);

create index tree_memberships_user_id_idx
  on public.tree_memberships (user_id);

create index tree_memberships_tree_role_idx
  on public.tree_memberships (tree_id, role);
```

La membresía es la fuente de verdad para acceso. `created_by` sirve como trazabilidad y apoyo a la migración; no debe reemplazar la tabla de membresías en las políticas.

## Funciones auxiliares de autorización

Conviene encapsular las comprobaciones repetidas en funciones `security definer` dentro de un schema privado, con `search_path` fijo, chequeo explícito de `auth.uid()` y ejecución revocada para roles no necesarios.

Conceptualmente:

```sql
private.is_tree_member(tree_id uuid)
private.can_view_tree(tree_id uuid)
private.can_edit_tree(tree_id uuid)
private.is_tree_owner(tree_id uuid)
```

Cada función debe consultar `tree_memberships` usando `(select auth.uid())` y contar con índices. No se debe confiar en un rol enviado desde el cliente.

## RLS recomendado

Para tablas de datos privadas, el patrón conceptual es:

```sql
create policy people_select_member on public.people
for select to authenticated
using ((select private.can_view_tree(tree_id)));

create policy people_write_editor on public.people
for insert to authenticated
with check ((select private.can_edit_tree(tree_id)));

create policy people_update_editor on public.people
for update to authenticated
using ((select private.can_edit_tree(tree_id)))
with check ((select private.can_edit_tree(tree_id)));

create policy people_delete_editor on public.people
for delete to authenticated
using ((select private.can_edit_tree(tree_id)));
```

Repetir el patrón para las entidades genealógicas. Para `trees` y `tree_memberships`, reservar las mutaciones administrativas al owner. Para invitaciones, usar una tabla separada y una función/RPC de aceptación para evitar que un usuario pueda autoasignarse roles.

Las políticas públicas actuales deben eliminarse. `anon` no debería leer tablas privadas. La publicación pública debería resolverse por una vista o RPC de lectura limitada que solo exponga los campos aprobados, validando `is_public` + `public_token`.

## Invitaciones

Tabla sugerida:

```sql
create table public.tree_invitations (
  id uuid primary key default gen_random_uuid(),
  tree_id uuid not null references public.trees(id) on delete cascade,
  email text not null,
  role public.tree_role not null check (role in ('editor', 'viewer')),
  token_hash text not null unique,
  invited_by uuid not null references auth.users(id),
  expires_at timestamptz not null,
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);
```

El token plano solo debe existir en el enlace enviado; la base guarda su hash. La aceptación debe verificar expiración, email cuando corresponda, estado y que el invitador sea owner.

## Cambios en el cliente

1. Crear un `TreeContext` o store equivalente con:
   - usuario actual;
   - árboles accesibles;
   - árbol seleccionado;
   - membresía/rol actual;
   - acciones de crear, seleccionar y refrescar.
2. Reemplazar `remoteTreeStorageKey` como fuente de selección por una preferencia local validada contra `tree_memberships`.
3. Cambiar `getRemoteTree(remoteTreeId)` por `listAccessibleTrees()` + `getRemoteTree(treeId)`.
4. Cambiar `saveRemoteTree()` para recibir siempre un `treeId` seleccionado y no buscar el último árbol global.
5. Bloquear mutaciones de UI según rol, manteniendo RLS como autoridad final.
6. Añadir administración de miembros visible solo para owner.
7. Mostrar estados de loading, sin árboles, sin permisos y sesión expirada.
8. Firmar/validar los enlaces públicos sin permitir que el hash privado del canvas eluda autenticación.

## Migración de datos existentes

1. Crear una migración de esquema sin borrar tablas.
2. Agregar `created_by`, `is_public` y membresías.
3. Definir un usuario owner de migración a partir de la cuenta administradora elegida.
4. Crear una membresía `owner` para el árbol actual.
5. Verificar que todas las filas de dominio tengan `tree_id` válido.
6. Reemplazar las políticas públicas por las nuevas políticas autenticadas.
7. Validar lecturas, escrituras y enlaces públicos.
8. Eliminar compatibilidad con el fallback “último árbol” una vez migrado.

Si no existe un owner confiable, detener la activación de RLS privada y resolver la asignación explícitamente; no inventar un usuario ni dejar el árbol público como solución permanente.

## Consistencia y concurrencia

El store actual sincroniza colecciones completas y ejecuta borrados por diferencia. Con varios editores, dos clientes pueden sobrescribirse. Para MVP se puede:

- guardar `updated_at` y rechazar conflictos si cambió desde la última lectura;
- refrescar antes de guardar;
- mostrar un aviso de conflicto y permitir recargar;
- evitar `syncDeletions` global hasta contar con control de versión.

La solución posterior debería mutar entidades individuales o usar RPCs transaccionales para operaciones relacionadas.

## Seguridad y pruebas

Crear una matriz de pruebas SQL con dos usuarios, dos árboles y los tres roles:

- user A owner de tree 1 no lee tree 2;
- user B viewer de tree 1 puede leer pero no insertar, actualizar ni borrar;
- user C editor de tree 1 puede mutar datos pero no membresías;
- un usuario sin membresía no ve filas;
- anon no ve datos privados;
- un viewer no puede elevarse enviando `role=owner` desde el cliente;
- el último owner no puede eliminarse ni degradarse;
- una invitación expirada o usada no puede aceptarse;
- una URL pública solo devuelve campos permitidos y nunca habilita escritura.

## Antecedente: borrado lógico de árboles y RPC `soft_delete_tree`

Si el owner puede ver el botón **Eliminar árbol**, pero la llamada a
`/rest/v1/rpc/soft_delete_tree` falla, revisar el problema en este orden:

1. Confirmar que `soft_delete_tree(uuid)` existe en `pg_proc` y que
   `authenticated` tiene permiso `execute`.
2. Confirmar en `tree_memberships` que el usuario tenga `role = 'owner'` para
   el `tree_id`. En el SQL Editor, `auth.uid()` no representa la sesión del
   navegador; para diagnosticar se debe consultar la tabla sin ese filtro o
   simular el claim JWT dentro de una transacción reversible.
3. Ejecutar `notify pgrst, 'reload schema';` después de crear o reemplazar el
   RPC. Un `404` desde `/rpc/soft_delete_tree` indica que PostgREST no lo
   encuentra en su schema cache; no implica un problema de RLS del owner.
4. Si el endpoint pasa a responder `400`, revisar el cuerpo de la respuesta y
   la definición SQL. Los nombres de salida de `returns table` (`id`,
   `is_deleted`, `deleted_at`) pueden colisionar con nombres de columnas dentro
   del `update`. Las columnas deben calificarse mediante un alias:

```sql
update public.trees as target
set
  is_deleted = true,
  deleted_at = coalesce(target.deleted_at, now()),
  deleted_by = auth.uid(),
  updated_at = now()
where target.id = target_tree_id
  and target.is_deleted = false
returning target.* into deleted_tree;
```

La función vigente debe usar una única firma canónica (`target_tree_id` o
`tree_id`), tener `security definer` con `search_path` fijo, verificar
`public.is_tree_owner(target_tree_id)`, otorgar `execute` a `authenticated` y
recargar PostgREST después de la definición. En el incidente de agosto de
2026, la membresía owner era correcta y el problema se resolvió recreando el
RPC con referencias calificadas y ejecutando el reload del schema.

## Orden de implementación sugerido

1. Migración de esquema y funciones RLS.
2. Tests de aislamiento y roles.
3. Capa de acceso `listAccessibleTrees/getRemoteTree/saveRemoteTree`.
4. Selector de árboles y estado vacío.
5. Creación y administración básica.
6. Invitaciones.
7. Migración del árbol actual.
8. Publicación pública revisada.
9. Control de conflictos y auditoría futura.

## Decisiones que bloquean la implementación

- uno o varios owners;
- exportación para viewer;
- permisos de borrado para editor;
- mecanismo de invitación;
- alcance de los enlaces públicos;
- estrategia de conflictos para edición concurrente.

