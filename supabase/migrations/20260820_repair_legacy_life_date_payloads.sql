-- Repara combinaciones legacy que no cumplen la precisión normalizada.
-- La aplicación también normaliza estos valores antes de cada escritura;
-- esta migración deja consistentes las filas ya guardadas.

alter table public.people drop constraint if exists people_birth_date_parts_check;
alter table public.people drop constraint if exists people_death_date_parts_check;

update public.people
set birth_year = null
where birth_year is not null and birth_year not between 1 and 9999;

update public.people
set birth_month = null
where birth_month is not null
  and (birth_year is null or birth_month not between 1 and 12);

update public.people
set birth_day = null
where birth_day is not null
  and (
    birth_year is null
    or birth_month is null
    or birth_day not between 1 and extract(day from (make_date(birth_year, birth_month, 1) + interval '1 month - 1 day'))::integer
  );

update public.people
set birth_date_precision = case
  when birth_year is null then null
  when birth_month is null then 'year'
  when birth_day is null then 'month'
  else 'day'
end;

update public.people
set death_year = null
where death_year is not null and death_year not between 1 and 9999;

update public.people
set death_month = null
where death_month is not null
  and (death_year is null or death_month not between 1 and 12);

update public.people
set death_day = null
where death_day is not null
  and (
    death_year is null
    or death_month is null
    or death_day not between 1 and extract(day from (make_date(death_year, death_month, 1) + interval '1 month - 1 day'))::integer
  );

update public.people
set death_date_precision = case
  when death_year is null then null
  when death_month is null then 'year'
  when death_day is null then 'month'
  else 'day'
end;

alter table public.people add constraint people_birth_date_parts_check check (
  (birth_month is null or birth_year is not null)
  and (birth_day is null or birth_month is not null)
  and (birth_year is null or birth_year between 1 and 9999)
  and (birth_month is null or birth_month between 1 and 12)
  and (birth_day is null or birth_day between 1 and 31)
  and (birth_day is null or birth_day <= case when birth_year between 1 and 9999 and birth_month between 1 and 12 then extract(day from (make_date(birth_year, birth_month, 1) + interval '1 month - 1 day'))::integer else 31 end)
  and (birth_date_precision is null
    or (birth_date_precision = 'year' and birth_year is not null and birth_month is null and birth_day is null)
    or (birth_date_precision = 'month' and birth_year is not null and birth_month is not null and birth_day is null)
    or (birth_date_precision = 'day' and birth_year is not null and birth_month is not null and birth_day is not null))
);

alter table public.people add constraint people_death_date_parts_check check (
  (death_month is null or death_year is not null)
  and (death_day is null or death_month is not null)
  and (death_year is null or death_year between 1 and 9999)
  and (death_month is null or death_month between 1 and 12)
  and (death_day is null or death_day between 1 and 31)
  and (death_day is null or death_day <= case when death_year between 1 and 9999 and death_month between 1 and 12 then extract(day from (make_date(death_year, death_month, 1) + interval '1 month - 1 day'))::integer else 31 end)
  and (death_date_precision is null
    or (death_date_precision = 'year' and death_year is not null and death_month is null and death_day is null)
    or (death_date_precision = 'month' and death_year is not null and death_month is not null and death_day is null)
    or (death_date_precision = 'day' and death_year is not null and death_month is not null and death_day is not null))
);
