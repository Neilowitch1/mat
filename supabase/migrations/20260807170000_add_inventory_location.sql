alter table public.inventory
add column if not exists location text;

update public.inventory
set location = 'pantry'
where location is null
   or location not in ('fridge', 'freezer', 'pantry');

alter table public.inventory
alter column location set default 'pantry',
alter column location set not null;

alter table public.inventory
drop constraint if exists inventory_location_check;

alter table public.inventory
add constraint inventory_location_check
check (location in ('fridge', 'freezer', 'pantry'));
