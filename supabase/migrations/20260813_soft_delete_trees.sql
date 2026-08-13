-- Borrado lógico de árboles. Los datos relacionados se conservan para permitir
-- auditoría y una eventual restauración, pero el árbol deja de ser accesible.
alter table public.trees
  add column if not exists is_deleted boolean not null default false,
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_by uuid references auth.users(id) on delete set null;

create index if not exists trees_active_updated_at_idx
  on public.trees (updated_at desc)
  where is_deleted = false;

create or replace function public.soft_delete_tree(tree_id uuid)
returns table (id uuid, is_deleted boolean, deleted_at timestamptz)
language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;
  if not public.is_tree_owner(tree_id) then
    raise exception 'Only the tree owner can delete this tree';
  end if;

  update public.trees
  set is_deleted = true, deleted_at = coalesce(deleted_at, now()), deleted_by = auth.uid(), updated_at = now()
  where public.trees.id = tree_id and public.trees.is_deleted = false
  returning public.trees.id, public.trees.is_deleted, public.trees.deleted_at;

  if not found then raise exception 'Tree not found or already deleted'; end if;
  return next;
end;
$$;

revoke all on function public.soft_delete_tree(uuid) from public, anon;
grant execute on function public.soft_delete_tree(uuid) to authenticated;

-- No permitir que un árbol borrado siga apareciendo por RLS.
drop policy if exists trees_select_member on public.trees;
create policy trees_select_member on public.trees for select to authenticated
using ((select public.is_tree_member(id)) and is_deleted = false);
