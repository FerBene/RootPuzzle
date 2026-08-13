/*
  REPARACIÓN MANUAL — mover todos los datos al árbol "mi FLIA"

  Ejecutar una sola vez en Supabase SQL Editor, después de:
  - 20260812_multi_tree_roles.sql
  - 20260813_protect_tree_bound_records.sql

  El script aborta si no existe exactamente un árbol con ese nombre.
  No elimina árboles vacíos ni membresías.
*/

begin;

create or replace function public.repair_move_all_tree_data(target_tree_name text default 'mi FLIA')
returns table (
  target_tree_id uuid,
  target_tree_name text,
  people_moved integer,
  sources_moved integer,
  events_moved integer,
  partnerships_moved integer,
  parent_child_moved integer,
  citations_moved integer,
  suggestions_moved integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  target_id uuid;
  matching_trees integer;
  moved_people integer := 0;
  moved_sources integer := 0;
  moved_events integer := 0;
  moved_partnerships integer := 0;
  moved_parent_child integer := 0;
  moved_citations integer := 0;
  moved_suggestions integer := 0;
  table_name text;
begin
  select count(*)::integer, min(id)
    into matching_trees, target_id
  from public.trees
  where lower(trim(name)) = lower(trim(coalesce(target_tree_name, 'mi FLIA')));

  if matching_trees <> 1 then
    raise exception 'Expected exactly one target tree named %, found %', target_tree_name, matching_trees;
  end if;

  -- Se deshabilita únicamente el trigger de protección durante esta reparación controlada.
  foreach table_name in array array['people', 'sources', 'events', 'partnerships', 'parent_child', 'citations', 'detective_suggestions'] loop
    execute format('alter table public.%I disable trigger prevent_tree_id_reassignment', table_name);
  end loop;

  update public.people set tree_id = target_id where tree_id <> target_id;
  get diagnostics moved_people = row_count;

  update public.sources set tree_id = target_id where tree_id <> target_id;
  get diagnostics moved_sources = row_count;

  update public.events set tree_id = target_id where tree_id <> target_id;
  get diagnostics moved_events = row_count;

  update public.partnerships set tree_id = target_id where tree_id <> target_id;
  get diagnostics moved_partnerships = row_count;

  update public.parent_child set tree_id = target_id where tree_id <> target_id;
  get diagnostics moved_parent_child = row_count;

  update public.citations set tree_id = target_id where tree_id <> target_id;
  get diagnostics moved_citations = row_count;

  update public.detective_suggestions set tree_id = target_id where tree_id <> target_id;
  get diagnostics moved_suggestions = row_count;

  update public.trees
  set root_person_id = coalesce(root_person_id, (select min(id) from public.people where tree_id = target_id)), updated_at = now()
  where id = target_id;

  foreach table_name in array array['people', 'sources', 'events', 'partnerships', 'parent_child', 'citations', 'detective_suggestions'] loop
    execute format('alter table public.%I enable trigger prevent_tree_id_reassignment', table_name);
  end loop;

  return query select target_id, (select name from public.trees where id = target_id), moved_people, moved_sources, moved_events, moved_partnerships, moved_parent_child, moved_citations, moved_suggestions;
exception when others then
  -- El rollback de la transacción revierte también los ALTER TABLE.
  raise;
end;
$$;

revoke all on function public.repair_move_all_tree_data(text) from public, anon, authenticated;

-- La reparación se ejecuta al correr este archivo completo.
select * from public.repair_move_all_tree_data('mi FLIA');

commit;
