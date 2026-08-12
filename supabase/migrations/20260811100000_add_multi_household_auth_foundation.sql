begin;

create type public.household_role as enum ('owner', 'member');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  active_household_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint households_name_not_blank check (length(btrim(name)) > 0)
);

create table public.household_members (
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.household_role not null default 'member',
  created_at timestamptz not null default now(),
  primary key (household_id, user_id)
);

alter table public.profiles
  add constraint profiles_active_household_id_fkey
  foreign key (active_household_id)
  references public.households(id)
  on delete set null;

create index household_members_user_id_idx
  on public.household_members (user_id, household_id);

create index profiles_active_household_id_idx
  on public.profiles (active_household_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    nullif(btrim(coalesce(new.raw_user_meta_data ->> 'display_name', '')), '')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

insert into public.profiles (id, display_name)
select
  users.id,
  nullif(btrim(coalesce(users.raw_user_meta_data ->> 'display_name', '')), '')
from auth.users as users
on conflict (id) do nothing;

create or replace function public.is_household_member(target_household_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.household_members
    where household_id = target_household_id
      and user_id = (select auth.uid())
  );
$$;

create or replace function public.is_household_owner(target_household_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.household_members
    where household_id = target_household_id
      and user_id = (select auth.uid())
      and role = 'owner'
  );
$$;

revoke all on function public.is_household_member(uuid) from public;
revoke all on function public.is_household_owner(uuid) from public;
grant execute on function public.is_household_member(uuid) to authenticated;
grant execute on function public.is_household_owner(uuid) to authenticated;

-- A stable id lets the current UI address the existing shared data until auth UI exists.
insert into public.households (id, name)
values ('00000000-0000-4000-8000-000000000001', 'Legacy-hushåll')
on conflict (id) do nothing;

alter table public.shopping_list add column household_id uuid;
alter table public.inventory add column household_id uuid;
alter table public.recipes add column household_id uuid;

update public.shopping_list
set household_id = '00000000-0000-4000-8000-000000000001'
where household_id is null;

update public.inventory
set household_id = '00000000-0000-4000-8000-000000000001'
where household_id is null;

update public.recipes
set household_id = '00000000-0000-4000-8000-000000000001'
where household_id is null;

alter table public.shopping_list
  alter column household_id set not null,
  alter column household_id set default '00000000-0000-4000-8000-000000000001',
  add constraint shopping_list_household_id_fkey
    foreign key (household_id) references public.households(id) on delete cascade;

alter table public.inventory
  alter column household_id set not null,
  alter column household_id set default '00000000-0000-4000-8000-000000000001',
  add constraint inventory_household_id_fkey
    foreign key (household_id) references public.households(id) on delete cascade;

alter table public.recipes
  alter column household_id set not null,
  alter column household_id set default '00000000-0000-4000-8000-000000000001',
  add constraint recipes_household_id_fkey
    foreign key (household_id) references public.households(id) on delete cascade;

drop index if exists public.shopping_list_product_id_unique_idx;
create unique index shopping_list_household_product_unique_idx
  on public.shopping_list (household_id, product_id);

create index shopping_list_household_created_at_idx
  on public.shopping_list (household_id, created_at);
create index inventory_household_created_at_idx
  on public.inventory (household_id, created_at);
create index recipes_household_created_at_idx
  on public.recipes (household_id, created_at desc);

alter table public.profiles enable row level security;
alter table public.households enable row level security;
alter table public.household_members enable row level security;

grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.households to authenticated;
grant select, insert, update, delete on public.household_members to authenticated;
grant select, insert, update, delete on public.products to authenticated;
grant select, insert, update, delete on public.shopping_list to authenticated;
grant select, insert, update, delete on public.inventory to authenticated;
grant select, insert, update, delete on public.recipes to authenticated;
grant select, insert, update, delete on public.recipe_ingredients to authenticated;

create policy "Users can read their own profile"
on public.profiles for select to authenticated
using (id = (select auth.uid()));

create policy "Users can update their own profile"
on public.profiles for update to authenticated
using (id = (select auth.uid()))
with check (
  id = (select auth.uid())
  and (
    active_household_id is null
    or public.is_household_member(active_household_id)
  )
);

create policy "Users can read their households"
on public.households for select to authenticated
using (public.is_household_member(id));

create policy "Owners can update households"
on public.households for update to authenticated
using (public.is_household_owner(id))
with check (public.is_household_owner(id));

create policy "Owners can delete households"
on public.households for delete to authenticated
using (public.is_household_owner(id));

create policy "Members can read household memberships"
on public.household_members for select to authenticated
using (public.is_household_member(household_id));

create policy "Owners can add household members"
on public.household_members for insert to authenticated
with check (public.is_household_owner(household_id));

create policy "Owners can update household members"
on public.household_members for update to authenticated
using (public.is_household_owner(household_id))
with check (public.is_household_owner(household_id));

create policy "Owners can remove household members"
on public.household_members for delete to authenticated
using (public.is_household_owner(household_id));

-- Product names are a shared catalog. Household-owned rows remain isolated below.
drop policy if exists "Allow product inserts" on public.products;
create policy "Authenticated users can read products"
on public.products for select to authenticated using (true);
create policy "Authenticated users can create products"
on public.products for insert to authenticated with check (true);
create policy "Authenticated users can update products"
on public.products for update to authenticated using (true) with check (true);

-- The current client never deletes products; do not preserve that anonymous power.
drop policy if exists "Allow anonymous delete on products" on public.products;

drop policy if exists "Allow anonymous select on shopping_list" on public.shopping_list;
drop policy if exists "Allow anonymous insert on shopping_list" on public.shopping_list;
drop policy if exists "Allow anonymous update on shopping_list" on public.shopping_list;
drop policy if exists "Allow anonymous delete on shopping_list" on public.shopping_list;

create policy "Members can read shopping items"
on public.shopping_list for select to authenticated
using (public.is_household_member(household_id));
create policy "Members can create shopping items"
on public.shopping_list for insert to authenticated
with check (public.is_household_member(household_id));
create policy "Members can update shopping items"
on public.shopping_list for update to authenticated
using (public.is_household_member(household_id))
with check (public.is_household_member(household_id));
create policy "Members can delete shopping items"
on public.shopping_list for delete to authenticated
using (public.is_household_member(household_id));

drop policy if exists "Allow anonymous select on inventory" on public.inventory;
drop policy if exists "Allow anonymous insert on inventory" on public.inventory;
drop policy if exists "Allow anonymous update on inventory" on public.inventory;
drop policy if exists "Allow anonymous delete on inventory" on public.inventory;

create policy "Members can read inventory"
on public.inventory for select to authenticated
using (public.is_household_member(household_id));
create policy "Members can create inventory"
on public.inventory for insert to authenticated
with check (public.is_household_member(household_id));
create policy "Members can update inventory"
on public.inventory for update to authenticated
using (public.is_household_member(household_id))
with check (public.is_household_member(household_id));
create policy "Members can delete inventory"
on public.inventory for delete to authenticated
using (public.is_household_member(household_id));

drop policy if exists "Allow anonymous select on recipes" on public.recipes;
drop policy if exists "Allow anonymous insert on recipes" on public.recipes;
drop policy if exists "Allow anonymous update on recipes" on public.recipes;
drop policy if exists "Allow anonymous delete on recipes" on public.recipes;

create policy "Members can read recipes"
on public.recipes for select to authenticated
using (public.is_household_member(household_id));
create policy "Members can create recipes"
on public.recipes for insert to authenticated
with check (public.is_household_member(household_id));
create policy "Members can update recipes"
on public.recipes for update to authenticated
using (public.is_household_member(household_id))
with check (public.is_household_member(household_id));
create policy "Members can delete recipes"
on public.recipes for delete to authenticated
using (public.is_household_member(household_id));

drop policy if exists "Allow anonymous select on recipe_ingredients" on public.recipe_ingredients;
drop policy if exists "Allow anonymous insert on recipe_ingredients" on public.recipe_ingredients;
drop policy if exists "Allow anonymous update on recipe_ingredients" on public.recipe_ingredients;
drop policy if exists "Allow anonymous delete on recipe_ingredients" on public.recipe_ingredients;

create policy "Members can read recipe ingredients"
on public.recipe_ingredients for select to authenticated
using (
  exists (
    select 1 from public.recipes
    where recipes.id = recipe_ingredients.recipe_id
      and public.is_household_member(recipes.household_id)
  )
);
create policy "Members can create recipe ingredients"
on public.recipe_ingredients for insert to authenticated
with check (
  exists (
    select 1 from public.recipes
    where recipes.id = recipe_ingredients.recipe_id
      and public.is_household_member(recipes.household_id)
  )
);
create policy "Members can update recipe ingredients"
on public.recipe_ingredients for update to authenticated
using (
  exists (
    select 1 from public.recipes
    where recipes.id = recipe_ingredients.recipe_id
      and public.is_household_member(recipes.household_id)
  )
)
with check (
  exists (
    select 1 from public.recipes
    where recipes.id = recipe_ingredients.recipe_id
      and public.is_household_member(recipes.household_id)
  )
);
create policy "Members can delete recipe ingredients"
on public.recipe_ingredients for delete to authenticated
using (
  exists (
    select 1 from public.recipes
    where recipes.id = recipe_ingredients.recipe_id
      and public.is_household_member(recipes.household_id)
  )
);

-- Temporary bridge: remove these anon policies before a public production launch.
create policy "Legacy anonymous shopping access"
on public.shopping_list for all to anon
using (household_id = '00000000-0000-4000-8000-000000000001')
with check (household_id = '00000000-0000-4000-8000-000000000001');

create policy "Legacy anonymous inventory access"
on public.inventory for all to anon
using (household_id = '00000000-0000-4000-8000-000000000001')
with check (household_id = '00000000-0000-4000-8000-000000000001');

create policy "Legacy anonymous recipe access"
on public.recipes for all to anon
using (household_id = '00000000-0000-4000-8000-000000000001')
with check (household_id = '00000000-0000-4000-8000-000000000001');

create policy "Legacy anonymous recipe ingredient access"
on public.recipe_ingredients for all to anon
using (
  exists (
    select 1 from public.recipes
    where recipes.id = recipe_ingredients.recipe_id
      and recipes.household_id = '00000000-0000-4000-8000-000000000001'
  )
)
with check (
  exists (
    select 1 from public.recipes
    where recipes.id = recipe_ingredients.recipe_id
      and recipes.household_id = '00000000-0000-4000-8000-000000000001'
  )
);

commit;
