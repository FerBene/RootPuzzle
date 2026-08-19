-- Rediseño Relacional Completo para Raíces en Supabase (Multi-Árbol)

-- 1. Eliminar tablas previas en orden inverso de FKs para garantizar un entorno limpio
drop table if exists public.citations cascade;
drop table if exists public.parent_child cascade;
drop table if exists public.partnerships cascade;
drop table if exists public.events cascade;
drop table if exists public.detective_suggestions cascade;
drop table if exists public.sources cascade;
drop table if exists public.places cascade;
drop table if exists public.people cascade;
drop table if exists public.trees cascade;

-- 2. Tabla Principal: trees (Metadata del árbol sin blob JSONB)
create table public.trees (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Arbol familiar Raíces',
  description text not null default '',
  root_person_id uuid,
  is_deleted boolean not null default false,
  deleted_at timestamp with time zone,
  deleted_by uuid references auth.users(id) on delete set null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create index idx_trees_active_updated_at on public.trees (updated_at desc) where is_deleted = false;

-- 3. Tabla: people (Personas asociadas a un árbol)
create table public.people (
  id uuid primary key default gen_random_uuid(),
  tree_id uuid not null references public.trees(id) on delete cascade,
  given_names text not null default '',
  surnames text not null default '',
  nickname text not null default '',
  email text not null default '',
  profile_image text not null default '',
  sex text not null default '',
  birth_date text not null default '',
  birth_place text not null default '',
  birth_year integer,
  birth_month integer,
  birth_day integer,
  birth_date_precision text check (birth_date_precision is null or birth_date_precision in ('year', 'month', 'day')),
  birth_date_certainty text not null default 'exact' check (birth_date_certainty in ('exact', 'approx')),
  birth_place_id uuid,
  birth_place_precision text check (birth_place_precision is null or birth_place_precision in ('country', 'region', 'city', 'locality')),
  birth_place_certainty text not null default 'exact' check (birth_place_certainty in ('exact', 'approx')),
  death_date text not null default '',
  death_year integer,
  death_month integer,
  death_day integer,
  death_date_precision text check (death_date_precision is null or death_date_precision in ('year', 'month', 'day')),
  death_date_certainty text not null default 'exact' check (death_date_certainty in ('exact', 'approx')),
  death_place text not null default '',
  death_place_id uuid,
  death_place_precision text check (death_place_precision is null or death_place_precision in ('country', 'region', 'city', 'locality')),
  death_place_certainty text not null default 'exact' check (death_place_certainty in ('exact', 'approx')),
  occupation text not null default '',
  notes text not null default '',
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

alter table public.people add constraint people_birth_date_parts_check check (
  (birth_month is null or birth_year is not null)
  and (birth_day is null or birth_month is not null)
  and (birth_year is null or birth_year between 1 and 9999)
  and (birth_month is null or birth_month between 1 and 12)
  and (birth_day is null or birth_day between 1 and 31)
  and (birth_day is null or birth_day <= case when birth_year between 1 and 9999 and birth_month between 1 and 12 then extract(day from (date_trunc('month', make_date(birth_year, birth_month, 1)) + interval '1 month - 1 day')) else 31 end)
);

alter table public.people add constraint people_death_date_parts_check check (
  (death_month is null or death_year is not null)
  and (death_day is null or death_month is not null)
  and (death_year is null or death_year between 1 and 9999)
  and (death_month is null or death_month between 1 and 12)
  and (death_day is null or death_day between 1 and 31)
  and (death_day is null or death_day <= case when death_year between 1 and 9999 and death_month between 1 and 12 then extract(day from (date_trunc('month', make_date(death_year, death_month, 1)) + interval '1 month - 1 day')) else 31 end)
);

-- 3b. Lugares geográficos normalizados; independientes del proveedor.
create table public.places (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null check (type in ('country', 'region', 'city', 'locality', 'other')),
  parent_id uuid references public.places(id) on delete set null,
  country_code text,
  latitude double precision,
  longitude double precision,
  external_provider text not null,
  external_id text not null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint places_external_reference_unique unique (external_provider, external_id)
);

alter table public.people add constraint people_birth_place_id_fkey
  foreign key (birth_place_id) references public.places(id) on delete set null;
alter table public.people add constraint people_death_place_id_fkey
  foreign key (death_place_id) references public.places(id) on delete set null;

-- Agregar FK circular diferida de root_person_id a public.people
alter table public.trees
  add constraint trees_root_person_id_fkey
  foreign key (root_person_id) references public.people(id) on delete set null;

-- 4. Tabla: sources (Fuentes documentales)
create table public.sources (
  id uuid primary key default gen_random_uuid(),
  tree_id uuid not null references public.trees(id) on delete cascade,
  title text not null default '',
  type text not null default '',
  repository text not null default '',
  url text not null default '',
  notes text not null default '',
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

-- 5. Tabla: events (Eventos de personas)
create table public.events (
  id uuid primary key default gen_random_uuid(),
  tree_id uuid not null references public.trees(id) on delete cascade,
  person_id uuid not null references public.people(id) on delete cascade,
  type text not null default '',
  date text not null default '',
  place text not null default '',
  description text not null default '',
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

-- 6. Tabla: partnerships (Relaciones de pareja)
create table public.partnerships (
  id uuid primary key default gen_random_uuid(),
  tree_id uuid not null references public.trees(id) on delete cascade,
  person_a_id uuid not null references public.people(id) on delete cascade,
  person_b_id uuid not null references public.people(id) on delete cascade,
  status text not null default '',
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

-- 7. Tabla: parent_child (Vínculos progenitor-hijo)
create table public.parent_child (
  id uuid primary key default gen_random_uuid(),
  tree_id uuid not null references public.trees(id) on delete cascade,
  parent_id uuid not null references public.people(id) on delete cascade,
  child_id uuid not null references public.people(id) on delete cascade,
  source_id uuid references public.sources(id) on delete set null,
  notes text not null default '',
  created_at timestamp with time zone not null default now()
);

-- 8. Tabla: citations (Citas de fuentes)
create table public.citations (
  id uuid primary key default gen_random_uuid(),
  tree_id uuid not null references public.trees(id) on delete cascade,
  source_id uuid references public.sources(id) on delete cascade,
  person_id uuid references public.people(id) on delete set null,
  event_id uuid references public.events(id) on delete set null,
  quote text not null default '',
  notes text not null default '',
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

-- 9. Tabla: detective_suggestions (Sugerencias del detective)
create table public.detective_suggestions (
  id uuid primary key default gen_random_uuid(),
  tree_id uuid not null references public.trees(id) on delete cascade,
  status text not null default 'pending',
  fingerprint text not null default '',
  kind text not null default '',
  title text not null default '',
  summary text not null default '',
  confidence text not null default '',
  source jsonb not null default '{}'::jsonb,
  proposed_changes jsonb not null default '[]'::jsonb,
  reviewed_at timestamp with time zone,
  applied_source_id uuid references public.sources(id) on delete set null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

-- 10. Índices btree para búsquedas rápidas por tree_id (Escalabilidad y rendimiento)
create index idx_people_tree_id on public.people(tree_id);
create index idx_people_birth_place_id on public.people(birth_place_id);
create index idx_people_death_place_id on public.people(death_place_id);
create index idx_places_parent_id on public.places(parent_id);
create index idx_sources_tree_id on public.sources(tree_id);
create index idx_events_tree_id on public.events(tree_id);
create index idx_partnerships_tree_id on public.partnerships(tree_id);
create index idx_parent_child_tree_id on public.parent_child(tree_id);
create index idx_citations_tree_id on public.citations(tree_id);
create index idx_detective_suggestions_tree_id on public.detective_suggestions(tree_id);

-- 11. Habilitar Row Level Security (RLS) en todas las tablas
alter table public.trees enable row level security;
alter table public.people enable row level security;
alter table public.places enable row level security;
alter table public.sources enable row level security;
alter table public.events enable row level security;
alter table public.partnerships enable row level security;
alter table public.parent_child enable row level security;
alter table public.citations enable row level security;
alter table public.detective_suggestions enable row level security;

-- 12. Políticas RLS públicas para acceso total
do $$
declare
  tbl text;
begin
  for tbl in select unnest(array['trees', 'people', 'places', 'sources', 'events', 'partnerships', 'parent_child', 'citations', 'detective_suggestions'])
  loop
    execute format('create policy "Allow public read access" on public.%I for select to public using (true);', tbl);
    execute format('create policy "Allow public insert access" on public.%I for insert to public with check (true);', tbl);
    execute format('create policy "Allow public update access" on public.%I for update to public using (true) with check (true);', tbl);
    execute format('create policy "Allow public delete access" on public.%I for delete to public using (true);', tbl);
  end loop;
end;
$$;

-- 13. Otorgar permisos GRANT directos a los roles anon y authenticated
grant select, insert, update, delete on public.trees to anon, authenticated;
grant select, insert, update, delete on public.people to anon, authenticated;
grant select, insert, update, delete on public.places to anon, authenticated;
grant select, insert, update, delete on public.sources to anon, authenticated;
grant select, insert, update, delete on public.events to anon, authenticated;
grant select, insert, update, delete on public.partnerships to anon, authenticated;
grant select, insert, update, delete on public.parent_child to anon, authenticated;
grant select, insert, update, delete on public.citations to anon, authenticated;
grant select, insert, update, delete on public.detective_suggestions to anon, authenticated;

-- 14. Trigger automático para actualizar updated_at
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

do $$
declare
  tbl text;
begin
  for tbl in select unnest(array['trees', 'people', 'places', 'sources', 'events', 'partnerships', 'citations', 'detective_suggestions'])
  loop
    execute format('create trigger set_updated_at before update on public.%I for each row execute function public.handle_updated_at();', tbl);
  end loop;
end;
$$;
