alter table public.products
add column if not exists barcode text;

alter table public.products
drop constraint if exists products_barcode_format_check;

alter table public.products
add constraint products_barcode_format_check
check (barcode is null or barcode ~ '^[0-9]{6,14}$');

create unique index if not exists products_barcode_unique_idx
on public.products (barcode)
where barcode is not null;

alter table public.recipe_ingredients
add column if not exists sort_order integer;

with ordered_ingredients as (
  select
    id,
    row_number() over (
      partition by recipe_id
      order by created_at desc, id desc
    ) - 1 as position
  from public.recipe_ingredients
)
update public.recipe_ingredients
set sort_order = ordered_ingredients.position
from ordered_ingredients
where public.recipe_ingredients.id = ordered_ingredients.id
  and public.recipe_ingredients.sort_order is null;

alter table public.recipe_ingredients
alter column sort_order set default 0,
alter column sort_order set not null;

create index if not exists recipe_ingredients_recipe_sort_order_idx
on public.recipe_ingredients (recipe_id, sort_order);
