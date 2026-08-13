-- Evita que una actualización cambie accidentalmente un registro de árbol.
-- Ejecutar después del esquema multiárbol.

create or replace function public.prevent_tree_id_reassignment()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'UPDATE' and old.tree_id is distinct from new.tree_id then
    raise exception 'A record cannot be moved between trees';
  end if;
  return new;
end;
$$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array['people', 'sources', 'events', 'partnerships', 'parent_child', 'citations', 'detective_suggestions'] loop
    execute format('drop trigger if exists prevent_tree_id_reassignment on public.%I', table_name);
    execute format('create trigger prevent_tree_id_reassignment before update on public.%I for each row execute function public.prevent_tree_id_reassignment()', table_name);
  end loop;
end $$;
