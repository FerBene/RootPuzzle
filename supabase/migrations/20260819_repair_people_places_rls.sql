-- Repara permisos de sincronización para personas y lugares normalizados.
-- people queda restringida a miembros autenticados del árbol.
-- places es un catálogo geográfico compartido y conserva acceso público.

alter table public.people enable row level security;
alter table public.places enable row level security;

drop policy if exists "Allow public read access" on public.people;
drop policy if exists "Allow public insert access" on public.people;
drop policy if exists "Allow public update access" on public.people;
drop policy if exists "Allow public delete access" on public.people;
drop policy if exists people_select_member on public.people;
drop policy if exists people_insert_editor on public.people;
drop policy if exists people_update_editor on public.people;
drop policy if exists people_delete_editor on public.people;

create policy people_select_member on public.people
  for select to authenticated
  using ((select public.is_tree_member(tree_id)));
create policy people_insert_editor on public.people
  for insert to authenticated
  with check ((select public.can_edit_tree(tree_id)));
create policy people_update_editor on public.people
  for update to authenticated
  using ((select public.can_edit_tree(tree_id)))
  with check ((select public.can_edit_tree(tree_id)));
create policy people_delete_editor on public.people
  for delete to authenticated
  using ((select public.can_edit_tree(tree_id)));

drop policy if exists "Allow public read access" on public.places;
drop policy if exists "Allow public insert access" on public.places;
drop policy if exists "Allow public update access" on public.places;
drop policy if exists "Allow public delete access" on public.places;

create policy "Allow public read access" on public.places
  for select to public using (true);
create policy "Allow public insert access" on public.places
  for insert to public with check (true);
create policy "Allow public update access" on public.places
  for update to public using (true) with check (true);
create policy "Allow public delete access" on public.places
  for delete to public using (true);

grant select, insert, update, delete on public.people to authenticated;
grant select, insert, update, delete on public.places to anon, authenticated;
