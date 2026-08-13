-- Permite al owner renombrar el árbol activo sin modificar sus registros.

create or replace function public.rename_tree(tree_id uuid, tree_name text)
returns table (id uuid, name text)
language plpgsql security definer set search_path = public
as $$
declare
  updated_tree public.trees;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if not public.is_tree_owner(tree_id) then raise exception 'Only the tree owner can rename this tree'; end if;
  if nullif(trim(tree_name), '') is null then raise exception 'A tree name is required'; end if;

  update public.trees
  set name = trim(tree_name), updated_at = now()
  where public.trees.id = tree_id
  returning * into updated_tree;

  if not found then raise exception 'Tree not found'; end if;
  return query select updated_tree.id, updated_tree.name;
end;
$$;

revoke all on function public.rename_tree(uuid, text) from public, anon;
grant execute on function public.rename_tree(uuid, text) to authenticated;

/* Diagnóstico seguro para detectar registros repartidos entre árboles:
select t.id, t.name, count(p.id) as people
from public.trees t
left join public.people p on p.tree_id = t.id
group by t.id, t.name
order by t.created_at;
*/
