alter table public.inventory
drop constraint if exists inventory_location_check;

alter table public.inventory
add constraint inventory_location_check
check (location in ('fridge', 'freezer', 'pantry', 'spices'));
