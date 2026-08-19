-- Completa la normalización de fechas y lugares de nacimiento/fallecimiento.
-- Los campos textuales legacy se conservan para compatibilidad e importaciones.

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

alter table public.people
  add column if not exists birth_year integer,
  add column if not exists birth_month integer,
  add column if not exists birth_day integer,
  add column if not exists birth_date_precision text,
  add column if not exists birth_date_certainty text not null default 'exact',
  add column if not exists birth_place_id uuid,
  add column if not exists birth_place_precision text,
  add column if not exists birth_place_certainty text not null default 'exact',
  add column if not exists death_year integer,
  add column if not exists death_month integer,
  add column if not exists death_day integer,
  add column if not exists death_date_precision text,
  add column if not exists death_date_certainty text not null default 'exact',
  add column if not exists death_place_id uuid,
  add column if not exists death_place_precision text,
  add column if not exists death_place_certainty text not null default 'exact';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'people_birth_place_id_fkey') then
    alter table public.people add constraint people_birth_place_id_fkey
      foreign key (birth_place_id) references public.places(id) on delete set null;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'people_death_place_id_fkey') then
    alter table public.people add constraint people_death_place_id_fkey
      foreign key (death_place_id) references public.places(id) on delete set null;
  end if;
end $$;

alter table public.people drop constraint if exists people_birth_date_precision_check;
alter table public.people add constraint people_birth_date_precision_check
  check (birth_date_precision is null or birth_date_precision in ('year', 'month', 'day'));
alter table public.people drop constraint if exists people_birth_place_precision_check;
alter table public.people add constraint people_birth_place_precision_check
  check (birth_place_precision is null or birth_place_precision in ('country', 'region', 'city', 'locality'));
alter table public.people drop constraint if exists people_birth_date_certainty_check;
alter table public.people add constraint people_birth_date_certainty_check
  check (birth_date_certainty in ('exact', 'approx'));
alter table public.people drop constraint if exists people_birth_place_certainty_check;
alter table public.people add constraint people_birth_place_certainty_check
  check (birth_place_certainty in ('exact', 'approx'));
alter table public.people drop constraint if exists people_death_date_precision_check;
alter table public.people add constraint people_death_date_precision_check
  check (death_date_precision is null or death_date_precision in ('year', 'month', 'day'));
alter table public.people drop constraint if exists people_death_date_certainty_check;
alter table public.people add constraint people_death_date_certainty_check
  check (death_date_certainty in ('exact', 'approx'));
alter table public.people drop constraint if exists people_death_place_precision_check;
alter table public.people add constraint people_death_place_precision_check
  check (death_place_precision is null or death_place_precision in ('country', 'region', 'city', 'locality'));
alter table public.people drop constraint if exists people_death_place_certainty_check;
alter table public.people add constraint people_death_place_certainty_check
  check (death_place_certainty in ('exact', 'approx'));

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
alter table public.people drop constraint if exists people_death_date_parts_check;
alter table public.people add constraint people_death_date_parts_check check (
  (death_month is null or death_year is not null)
  and (death_day is null or death_month is not null)
  and (death_year is null or death_year between 1 and 9999)
  and (death_month is null or death_month between 1 and 12)
  and (death_day is null or death_day between 1 and 31)
  and (death_day is null or death_day <= case when death_year between 1 and 9999 and death_month between 1 and 12 then extract(day from (date_trunc('month', make_date(death_year, death_month, 1)) + interval '1 month - 1 day')) else 31 end)
  and (death_date_precision is null or (death_date_precision = 'year' and death_year is not null and death_month is null and death_day is null)
    or (death_date_precision = 'month' and death_year is not null and death_month is not null and death_day is null)
    or (death_date_precision = 'day' and death_year is not null and death_month is not null and death_day is not null))
);

create index if not exists idx_people_birth_place_id on public.people(birth_place_id);
create index if not exists idx_people_death_place_id on public.people(death_place_id);
