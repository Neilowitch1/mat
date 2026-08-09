alter table public.recipes
  add column category text not null default 'cooking';

alter table public.recipes
  add constraint recipes_category_check
  check (category in ('cooking', 'baking'));

create index recipes_category_created_at_idx
  on public.recipes (category, created_at desc);
