create table public.household_product_locations (
  household_id uuid not null references public.households(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  location text not null,
  updated_at timestamptz not null default now(),
  primary key (household_id, product_id)
);
alter table public.household_product_locations enable row level security;
revoke all on public.household_product_locations from anon, authenticated;
grant select on public.household_product_locations to authenticated;
create policy "Members can read product locations"
on public.household_product_locations for select to authenticated
using (public.is_household_member(household_id));

insert into public.household_product_locations (household_id, product_id, location, updated_at)
select distinct on (household_id, product_id) household_id, product_id, location, updated_at
from public.inventory
order by household_id, product_id, updated_at desc, id;

create function public.remember_inventory_product_location()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.household_product_locations (household_id, product_id, location, updated_at)
  values (new.household_id, new.product_id, new.location, clock_timestamp())
  on conflict (household_id, product_id) do update
    set location = excluded.location, updated_at = excluded.updated_at;
  return new;
end;
$$;
revoke all on function public.remember_inventory_product_location() from public;
create trigger remember_inventory_product_location
after insert or update of location, product_id on public.inventory
for each row execute function public.remember_inventory_product_location();
