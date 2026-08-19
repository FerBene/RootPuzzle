-- Normaliza fecha y lugar de nacimiento sin eliminar los datos legados.
-- Los campos birth_date/birth_place se conservan para compatibilidad e importaciones.

create table if not exists public.places (
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

alter table public.people add column if not exists birth_year integer;
alter table public.people add column if not exists birth_month integer;
alter table public.people add column if not exists birth_day integer;
alter table public.people add column if not exists birth_date_precision text;
alter table public.people add column if not exists birth_place_id uuid references public.places(id) on delete set null;
alter table public.people add column if not exists birth_place_precision text;

alter table public.people drop constraint if exists people_birth_date_precision_check;
alter table public.people add constraint people_birth_date_precision_check
  check (birth_date_precision is null or birth_date_precision in ('year', 'month', 'day'));
alter table public.people drop constraint if exists people_birth_place_precision_check;
alter table public.people add constraint people_birth_place_precision_check
  check (birth_place_precision is null or birth_place_precision in ('country', 'region', 'city', 'locality'));
alter table public.people drop constraint if exists people_birth_date_parts_check;
alter table public.people add constraint people_birth_date_parts_check check (
  (birth_month is null or birth_year is not null)
  and (birth_day is null or birth_month is not null)
  and (birth_year is null or birth_year between 1 and 9999)
  and (birth_month is null or birth_month between 1 and 12)
  and (birth_day is null or birth_day between 1 and 31)
  and (birth_day is null or birth_day <= case when birth_year between 1 and 9999 and birth_month between 1 and 12 then extract(day from (date_trunc('month', make_date(birth_year, birth_month, 1)) + interval '1 month - 1 day')) else 31 end)
  and (birth_date_precision is null or (birth_date_precision = 'year' and birth_year is not null and birth_month is null and birth_day is null)
    or (birth_date_precision = 'month' and birth_year is not null and birth_month is not null and birth_day is null)
    or (birth_date_precision = 'day' and birth_year is not null and birth_month is not null and birth_day is not null))
);

create index if not exists idx_places_parent_id on public.places(parent_id);
create index if not exists idx_people_birth_place_id on public.people(birth_place_id);

alter table public.places enable row level security;
drop policy if exists "Allow public read access" on public.places;
drop policy if exists "Allow public insert access" on public.places;
drop policy if exists "Allow public update access" on public.places;
drop policy if exists "Allow public delete access" on public.places;
create policy "Allow public read access" on public.places for select to public using (true);
create policy "Allow public insert access" on public.places for insert to public with check (true);
create policy "Allow public update access" on public.places for update to public using (true) with check (true);
create policy "Allow public delete access" on public.places for delete to public using (true);
grant select, insert, update, delete on public.places to anon, authenticated;
drop trigger if exists set_updated_at on public.places;
create trigger set_updated_at before update on public.places for each row execute function public.handle_updated_at();
