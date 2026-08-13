/*
  MIGRACIÓN: MULTIÁRBOLES Y ROLES

  Cómo ejecutarla en Supabase SQL Editor
  --------------------------------------
  PAUSA 0 — Antes de ejecutar
  1. Confirmá que el esquema base ya fue ejecutado y que existen:
     public.trees, public.people, public.sources, public.events,
     public.partnerships, public.parent_child, public.citations y
     public.detective_suggestions.
  2. Hacé un backup de la base de producción.
  3. Confirmá que existe al menos un usuario en Authentication > Users.
  4. Abrí este archivo, copiá todo su contenido y pegalo en SQL Editor.

  PAUSA 1 — Ejecutá la migración completa
  Presioná Run una sola vez. No ejecutes por separado cada bloque: las
  funciones y políticas dependen unas de otras.

  PAUSA 2 — Asignar el árbol existente
  Esta migración crea la estructura, pero NO asigna automáticamente el árbol
  existente a un usuario. Después de comprobar que terminó correctamente,
  ejecutá el bloque de asignación que está al final del archivo usando el UUID
  real del usuario owner.

  PAUSA 3 — Probar antes de abrir la aplicación
  Ejecutá las consultas de verificación del final. Deben mostrar la tabla de
  membresías, las políticas nuevas y al menos una membresía owner.

  PAUSA 4 — Reiniciar la aplicación
  Cerrá/recargá el navegador y verificá que el selector de árboles aparezca.
  Si el proyecto usa variables locales, no reemplaces NEXT_PUBLIC_SUPABASE_URL
  ni NEXT_PUBLIC_SUPABASE_ANON_KEY.

  IMPORTANTE
  - Esta migración reemplaza las políticas públicas de las tablas privadas.
  - No la ejecutes sobre una base que todavía no tenga el esquema base.
  - Si falla, detené el proceso y guardá el mensaje de Supabase antes de
    reintentar.
*/

-- Multiárboles y roles. Ejecutar después del esquema base.
do $$ begin
  create type public.tree_role as enum ('owner', 'editor', 'viewer');
exception when duplicate_object then null;
end $$;

alter table public.trees
  add column if not exists created_by uuid references auth.users(id) on delete set null,
  add column if not exists is_public boolean not null default false,
  add column if not exists public_token text unique;

create table if not exists public.tree_memberships (
  tree_id uuid not null references public.trees(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.tree_role not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (tree_id, user_id)
);

create index if not exists tree_memberships_user_id_idx on public.tree_memberships (user_id);
create index if not exists tree_memberships_tree_role_idx on public.tree_memberships (tree_id, role);

create or replace function public.create_tree(tree_name text, tree_description text default '')
returns table (id uuid, name text, description text, role public.tree_role)
language plpgsql
security definer
set search_path = public
as $$
declare
  new_tree public.trees;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  insert into public.trees (name, description, created_by)
  values (coalesce(nullif(trim(tree_name), ''), 'Mi árbol familiar'), coalesce(tree_description, ''), auth.uid())
  returning * into new_tree;
  insert into public.tree_memberships (tree_id, user_id, role)
  values (new_tree.id, auth.uid(), 'owner');
  return query select new_tree.id, new_tree.name, new_tree.description, 'owner'::public.tree_role;
end;
$$;

revoke execute on function public.create_tree(text, text) from public, anon;
grant execute on function public.create_tree(text, text) to authenticated;

create or replace function public.is_tree_member(check_tree_id uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (
  select 1 from public.tree_memberships
  where tree_id = check_tree_id and user_id = (select auth.uid())
); $$;

create or replace function public.can_edit_tree(check_tree_id uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (
  select 1 from public.tree_memberships
  where tree_id = check_tree_id
    and user_id = (select auth.uid())
    and role in ('owner', 'editor')
); $$;

create or replace function public.is_tree_owner(check_tree_id uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (
  select 1 from public.tree_memberships
  where tree_id = check_tree_id
    and user_id = (select auth.uid())
    and role = 'owner'
); $$;

revoke execute on function public.is_tree_member(uuid), public.can_edit_tree(uuid), public.is_tree_owner(uuid) from public, anon;
grant execute on function public.is_tree_member(uuid), public.can_edit_tree(uuid), public.is_tree_owner(uuid) to authenticated;

alter table public.tree_memberships enable row level security;
alter table public.trees enable row level security;

drop policy if exists "Allow public read access" on public.trees;
drop policy if exists "Allow public insert access" on public.trees;
drop policy if exists "Allow public update access" on public.trees;
drop policy if exists "Allow public delete access" on public.trees;
drop policy if exists trees_select_member on public.trees;
drop policy if exists trees_insert_authenticated on public.trees;
drop policy if exists trees_update_owner on public.trees;
drop policy if exists trees_delete_owner on public.trees;

create policy trees_select_member on public.trees for select to authenticated
using ((select public.is_tree_member(id)));
create policy trees_insert_authenticated on public.trees for insert to authenticated
with check ((select auth.uid()) = created_by);
create policy trees_update_owner on public.trees for update to authenticated
using ((select public.is_tree_owner(id))) with check ((select public.is_tree_owner(id)));
create policy trees_delete_owner on public.trees for delete to authenticated
using ((select public.is_tree_owner(id)));

drop policy if exists memberships_select_member on public.tree_memberships;
drop policy if exists memberships_insert_owner on public.tree_memberships;
drop policy if exists memberships_update_owner on public.tree_memberships;
drop policy if exists memberships_delete_owner on public.tree_memberships;
create policy memberships_select_member on public.tree_memberships for select to authenticated
using ((select public.is_tree_member(tree_id)));
create policy memberships_insert_owner on public.tree_memberships for insert to authenticated
with check ((select public.is_tree_owner(tree_id)) and role <> 'owner');
create policy memberships_update_owner on public.tree_memberships for update to authenticated
using ((select public.is_tree_owner(tree_id))) with check ((select public.is_tree_owner(tree_id)));
create policy memberships_delete_owner on public.tree_memberships for delete to authenticated
using ((select public.is_tree_owner(tree_id)));

create or replace function public.prevent_last_tree_owner_change()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if (tg_op = 'DELETE' or (tg_op = 'UPDATE' and new.role <> 'owner'))
     and old.role = 'owner'
     and not exists (
       select 1 from public.tree_memberships
       where tree_id = old.tree_id and role = 'owner' and user_id <> old.user_id
     ) then
    raise exception 'A tree must keep at least one owner';
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

drop trigger if exists keep_tree_owner on public.tree_memberships;
create trigger keep_tree_owner
before delete or update on public.tree_memberships
for each row execute function public.prevent_last_tree_owner_change();

do $$
declare tbl text;
begin
  foreach tbl in array array['people','sources','events','partnerships','parent_child','citations','detective_suggestions'] loop
    execute format('drop policy if exists "Allow public read access" on public.%I', tbl);
    execute format('drop policy if exists "Allow public insert access" on public.%I', tbl);
    execute format('drop policy if exists "Allow public update access" on public.%I', tbl);
    execute format('drop policy if exists "Allow public delete access" on public.%I', tbl);
    execute format('drop policy if exists %I_select_member on public.%I', tbl, tbl);
    execute format('drop policy if exists %I_insert_editor on public.%I', tbl, tbl);
    execute format('drop policy if exists %I_update_editor on public.%I', tbl, tbl);
    execute format('drop policy if exists %I_delete_editor on public.%I', tbl, tbl);
    execute format('create policy %I_select_member on public.%I for select to authenticated using ((select public.is_tree_member(tree_id)))', tbl, tbl);
    execute format('create policy %I_insert_editor on public.%I for insert to authenticated with check ((select public.can_edit_tree(tree_id)))', tbl, tbl);
    execute format('create policy %I_update_editor on public.%I for update to authenticated using ((select public.can_edit_tree(tree_id))) with check ((select public.can_edit_tree(tree_id)))', tbl, tbl);
    execute format('create policy %I_delete_editor on public.%I for delete to authenticated using ((select public.can_edit_tree(tree_id)))', tbl, tbl);
  end loop;
end $$;

grant select, insert, update, delete on public.tree_memberships to authenticated;

/*
  PAUSA 2 — ASIGNAR EL ÁRBOL EXISTENTE A UN OWNER
  ------------------------------------------------
  1. En Supabase > Authentication > Users copiá el User UID del usuario que
     debe ser owner.
  2. Reemplazá USER_UUID_HERE en el bloque siguiente.
  3. Ejecutalo una sola vez.

  Si hay más de un árbol existente, repetí el INSERT cambiando TREE_UUID_HERE.
  No uses el email como user_id.
*/

-- insert into public.tree_memberships (tree_id, user_id, role)
-- values ('TREE_UUID_HERE', 'USER_UUID_HERE', 'owner')
-- on conflict (tree_id, user_id) do update set role = 'owner';

/*
  PAUSA 3 — CONSULTAS DE VERIFICACIÓN
  Descomentá y ejecutá estas consultas después de asignar el owner.
*/

-- select id, name, created_by, is_public from public.trees order by created_at;
-- select tree_id, user_id, role from public.tree_memberships order by created_at;
-- select schemaname, tablename, policyname from pg_policies
-- where schemaname = 'public'
-- order by tablename, policyname;

/*
  Resultado esperado:
  - El árbol existente tiene una fila en tree_memberships con role = owner.
  - Las tablas privadas tienen políticas *_select_member, *_insert_editor,
    *_update_editor y *_delete_editor.
  - Ya no aparecen las políticas "Allow public ..." en las tablas privadas.

  Prueba funcional recomendada:
  1. Entrá como owner y creá un segundo árbol.
  2. Confirmá que ambos árboles aparecen en el selector.
  3. Probá un usuario viewer: debe leer, pero no guardar cambios.
  4. Probá un usuario editor: debe modificar datos, pero no administrar
     membresías.
*/
