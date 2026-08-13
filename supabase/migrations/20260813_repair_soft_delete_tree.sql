-- Reparación del borrado lógico de árboles.
-- Ejecutar después de 20260812_multi_tree_roles.sql y 20260813_soft_delete_trees.sql.
-- Esta migración unifica la firma del RPC y evita cualquier DELETE físico.

alter table public.trees
  add column if not exists is_deleted boolean not null default false,
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_by uuid references auth.users(id) on delete set null;

drop function if exists public.soft_delete_tree(uuid);

create function public.soft_delete_tree(tree_id uuid)
returns table (id uuid, is_deleted boolean, deleted_at timestamptz)
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  deleted_tree public.trees;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if not exists (
    select 1
    from public.tree_memberships membership
    where membership.tree_id = public.soft_delete_tree.tree_id
      and membership.user_id = auth.uid()
      and membership.role = 'owner'::public.tree_role
  ) then
    raise exception 'Only the tree owner can delete this tree';
  end if;

  update public.trees
  set is_deleted = true,
      deleted_at = coalesce(public.trees.deleted_at, now()),
      deleted_by = auth.uid(),
      updated_at = now()
  where public.trees.id = public.soft_delete_tree.tree_id
    and public.trees.is_deleted = false
  returning public.trees.* into deleted_tree;

  if not found then
    raise exception 'Tree not found or already deleted';
  end if;

  return query
    select deleted_tree.id, deleted_tree.is_deleted, deleted_tree.deleted_at;
end;
$$;

revoke all on function public.soft_delete_tree(uuid) from public, anon;
grant execute on function public.soft_delete_tree(uuid) to authenticated;

drop policy if exists trees_select_member on public.trees;
create policy trees_select_member on public.trees for select to authenticated
using ((select public.is_tree_member(id)) and is_deleted = false);

notify pgrst, 'reload schema';
