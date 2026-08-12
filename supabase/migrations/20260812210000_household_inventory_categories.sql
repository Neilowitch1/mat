create table public.inventory_categories (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  key text not null,
  name text not null,
  is_default boolean not null default false,
  is_enabled boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint inventory_categories_name_not_blank check (btrim(name) <> ''),
  constraint inventory_categories_key_not_blank check (btrim(key) <> ''),
  constraint inventory_categories_household_key_unique unique (household_id, key),
  constraint inventory_categories_household_name_unique unique (household_id, name)
);

create index inventory_categories_household_sort_idx
  on public.inventory_categories (household_id, sort_order, created_at);

create or replace function public.create_default_inventory_categories()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.inventory_categories
    (household_id, key, name, is_default, sort_order)
  values
    (new.id, 'fridge', 'Kyl', true, 0),
    (new.id, 'freezer', 'Frys', true, 1),
    (new.id, 'pantry', 'Skafferi', true, 2),
    (new.id, 'spices', 'Kryddor', true, 3)
  on conflict (household_id, key) do nothing;
  return new;
end;
$$;

create trigger create_household_inventory_categories
after insert on public.households
for each row execute function public.create_default_inventory_categories();

insert into public.inventory_categories
  (household_id, key, name, is_default, sort_order)
select households.id, defaults.key, defaults.name, true, defaults.sort_order
from public.households
cross join (values
  ('fridge', 'Kyl', 0),
  ('freezer', 'Frys', 1),
  ('pantry', 'Skafferi', 2),
  ('spices', 'Kryddor', 3)
) as defaults(key, name, sort_order)
on conflict (household_id, key) do nothing;

alter table public.inventory
  drop constraint if exists inventory_location_check;

alter table public.inventory_categories enable row level security;

grant select, insert, update, delete on public.inventory_categories to authenticated;

create policy "Members can read inventory categories"
on public.inventory_categories for select to authenticated
using (public.is_household_member(household_id));

create policy "Members can create inventory categories"
on public.inventory_categories for insert to authenticated
with check (public.is_household_member(household_id));

create policy "Members can update inventory categories"
on public.inventory_categories for update to authenticated
using (public.is_household_member(household_id))
with check (public.is_household_member(household_id));

create policy "Members can delete custom inventory categories"
on public.inventory_categories for delete to authenticated
using (public.is_household_member(household_id) and not is_default);

revoke all on function public.create_default_inventory_categories() from public;
