alter table public.recipe_ingredients
alter column amount type text
using amount::text;
