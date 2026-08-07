create table public.recipes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  instructions text,
  servings integer not null default 4,
  prep_time_minutes integer,
  image_url text,
  favorite boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint recipes_servings_positive check (servings > 0),
  constraint recipes_prep_time_non_negative check (
    prep_time_minutes is null or prep_time_minutes >= 0
  )
);

create table public.recipe_ingredients (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  amount numeric,
  unit text,
  created_at timestamptz not null default now()
);

create index recipes_created_at_idx
on public.recipes (created_at desc);

create unique index recipe_ingredients_recipe_id_product_id_unique_idx
on public.recipe_ingredients (recipe_id, product_id);

create index recipe_ingredients_product_id_idx
on public.recipe_ingredients (product_id);

alter table public.recipes enable row level security;
alter table public.recipe_ingredients enable row level security;

grant select, insert, update, delete on table public.recipes to anon;
grant select, insert, update, delete on table public.recipe_ingredients to anon;

create policy "Allow anonymous select on recipes"
on public.recipes
for select
to anon
using (true);

create policy "Allow anonymous insert on recipes"
on public.recipes
for insert
to anon
with check (true);

create policy "Allow anonymous update on recipes"
on public.recipes
for update
to anon
using (true)
with check (true);

create policy "Allow anonymous delete on recipes"
on public.recipes
for delete
to anon
using (true);

create policy "Allow anonymous select on recipe_ingredients"
on public.recipe_ingredients
for select
to anon
using (true);

create policy "Allow anonymous insert on recipe_ingredients"
on public.recipe_ingredients
for insert
to anon
with check (true);

create policy "Allow anonymous update on recipe_ingredients"
on public.recipe_ingredients
for update
to anon
using (true)
with check (true);

create policy "Allow anonymous delete on recipe_ingredients"
on public.recipe_ingredients
for delete
to anon
using (true);

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'recipes'
  ) then
    alter publication supabase_realtime add table public.recipes;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'recipe_ingredients'
  ) then
    alter publication supabase_realtime add table public.recipe_ingredients;
  end if;
end
$$;
