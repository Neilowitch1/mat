begin;

create table public.meal_budgets (
  household_id uuid not null references public.households(id) on delete cascade,
  month date not null check (extract(day from month) = 1),
  amount_ore integer not null check (amount_ore between 0 and 100000000),
  primary key (household_id, month)
);

create table public.grocery_purchases (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  purchased_on date not null,
  amount_ore integer not null check (amount_ore between 1 and 100000000),
  note text check (char_length(note) <= 240),
  created_at timestamptz not null default now()
);
create index grocery_purchases_household_date_idx on public.grocery_purchases(household_id, purchased_on);

-- The composite FK prevents references to another household's recipe,
-- even when a user belongs to both households.
alter table public.recipes add constraint recipes_household_id_id_unique unique (household_id, id);
create table public.planned_meals (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  planned_on date not null,
  source text not null check (source in ('recipe', 'custom')),
  recipe_id uuid,
  name text not null check (char_length(btrim(name)) between 1 and 160),
  created_at timestamptz not null default now(),
  unique (household_id, planned_on),
  unique (household_id, id),
  check (source = 'recipe' or recipe_id is null),
  foreign key (household_id, recipe_id) references public.recipes(household_id, id)
    on delete set null (recipe_id)
);
create index planned_meals_recipe_idx on public.planned_meals(household_id, recipe_id);

create table public.planned_meal_ingredients (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null,
  meal_id uuid not null,
  product_id uuid not null references public.products(id) on delete restrict,
  amount text check (amount is null or (char_length(amount) <= 40 and amount ~ '^[0-9.,/[:space:]-]+$')),
  unit text check (char_length(unit) <= 40),
  sort_order integer not null check (sort_order >= 0),
  foreign key (household_id, meal_id) references public.planned_meals(household_id, id) on delete cascade,
  unique (meal_id, product_id)
);
create index planned_meal_ingredients_household_meal_idx on public.planned_meal_ingredients(household_id, meal_id);
create index planned_meal_ingredients_product_idx on public.planned_meal_ingredients(product_id);

do $$
declare table_name text;
begin
  foreach table_name in array array['meal_budgets', 'grocery_purchases', 'planned_meals', 'planned_meal_ingredients'] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('revoke all on public.%I from anon, authenticated', table_name);
    execute format('grant select, insert, update, delete on public.%I to authenticated', table_name);
    execute format('create policy "Household members manage planning" on public.%I for all to authenticated using (public.is_household_member(household_id)) with check (public.is_household_member(household_id))', table_name);
  end loop;
end $$;

-- One transaction for the meal and its ingredients; invoker preserves RLS.
-- The upsert locks household+date, serializing concurrent edits to one day.
create function public.save_planned_meal(
  p_household_id uuid, p_planned_on date, p_name text,
  p_recipe_id uuid, p_ingredients jsonb default '[]'::jsonb
) returns uuid language plpgsql security invoker set search_path = '' as $$
declare v_meal_id uuid; meal_name text;
begin
  if not public.is_household_member(p_household_id) then
    raise exception 'Household membership required' using errcode = '42501';
  end if;
  if jsonb_typeof(p_ingredients) is distinct from 'array' then
    raise exception 'Ingredients must be an array';
  end if;
  if jsonb_array_length(p_ingredients) > 100 then
    raise exception 'Too many ingredients';
  end if;
  meal_name := btrim(p_name);
  if p_recipe_id is not null then
    select name into meal_name from public.recipes where id = p_recipe_id and household_id = p_household_id;
    if not found then raise exception 'Recipe unavailable'; end if;
  end if;
  insert into public.planned_meals(household_id, planned_on, source, recipe_id, name)
  values (p_household_id, p_planned_on, case when p_recipe_id is null then 'custom' else 'recipe' end, p_recipe_id, meal_name)
  on conflict (household_id, planned_on) do update
    set source = excluded.source, recipe_id = excluded.recipe_id, name = excluded.name
  returning id into v_meal_id;

  delete from public.planned_meal_ingredients where planned_meal_ingredients.meal_id = v_meal_id and household_id = p_household_id;
  if p_recipe_id is null then
    insert into public.planned_meal_ingredients(household_id, meal_id, product_id, amount, unit, sort_order)
    select p_household_id, v_meal_id, (item->>'product_id')::uuid,
      nullif(btrim(item->>'amount'), ''), nullif(btrim(item->>'unit'), ''), (ordinality - 1)::integer
    from jsonb_array_elements(p_ingredients) with ordinality as ingredients(item, ordinality);
  end if;
  return v_meal_id;
end $$;
revoke all on function public.save_planned_meal(uuid, date, text, uuid, jsonb) from public, anon;
grant execute on function public.save_planned_meal(uuid, date, text, uuid, jsonb) to authenticated;

commit;
