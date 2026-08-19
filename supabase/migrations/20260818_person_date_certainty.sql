-- Precisión declarada por la persona usuaria para fechas y lugares de vida.
alter table public.people
  add column if not exists birth_date_certainty text not null default 'exact',
  add column if not exists birth_place_certainty text not null default 'exact',
  add column if not exists death_year integer,
  add column if not exists death_month integer,
  add column if not exists death_day integer,
  add column if not exists death_date_precision text,
  add column if not exists death_date_certainty text not null default 'exact',
  add column if not exists death_place_precision text,
  add column if not exists death_place_certainty text not null default 'exact';

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

alter table public.people drop constraint if exists people_death_date_parts_check;
alter table public.people add constraint people_death_date_parts_check check (
  (death_month is null or death_year is not null)
  and (death_day is null or death_month is not null)
  and (death_year is null or death_year between 1 and 9999)
  and (death_month is null or death_month between 1 and 12)
  and (death_day is null or death_day between 1 and 31)
  and (death_day is null or death_day <= case when death_year between 1 and 9999 and death_month between 1 and 12 then extract(day from (date_trunc('month', make_date(death_year, death_month, 1)) + interval '1 month - 1 day')) else 31 end)
);
