alter table public.shopping_list
add column if not exists completed boolean not null default false;
