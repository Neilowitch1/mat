alter table public.products enable row level security;
alter table public.shopping_list enable row level security;
alter table public.inventory enable row level security;

grant select, insert, update, delete on table public.products to anon;
grant select, insert, update, delete on table public.shopping_list to anon;
grant select, insert, update, delete on table public.inventory to anon;

drop policy if exists "Allow product inserts" on public.products;

drop policy if exists "Allow anonymous select on products" on public.products;
drop policy if exists "Allow anonymous insert on products" on public.products;
drop policy if exists "Allow anonymous update on products" on public.products;
drop policy if exists "Allow anonymous delete on products" on public.products;

create policy "Allow anonymous select on products"
on public.products
for select
to anon
using (true);

create policy "Allow anonymous insert on products"
on public.products
for insert
to anon
with check (true);

create policy "Allow anonymous update on products"
on public.products
for update
to anon
using (true)
with check (true);

create policy "Allow anonymous delete on products"
on public.products
for delete
to anon
using (true);

drop policy if exists "Allow anonymous select on shopping_list" on public.shopping_list;
drop policy if exists "Allow anonymous insert on shopping_list" on public.shopping_list;
drop policy if exists "Allow anonymous update on shopping_list" on public.shopping_list;
drop policy if exists "Allow anonymous delete on shopping_list" on public.shopping_list;

create policy "Allow anonymous select on shopping_list"
on public.shopping_list
for select
to anon
using (true);

create policy "Allow anonymous insert on shopping_list"
on public.shopping_list
for insert
to anon
with check (true);

create policy "Allow anonymous update on shopping_list"
on public.shopping_list
for update
to anon
using (true)
with check (true);

create policy "Allow anonymous delete on shopping_list"
on public.shopping_list
for delete
to anon
using (true);

drop policy if exists "Allow anonymous select on inventory" on public.inventory;
drop policy if exists "Allow anonymous insert on inventory" on public.inventory;
drop policy if exists "Allow anonymous update on inventory" on public.inventory;
drop policy if exists "Allow anonymous delete on inventory" on public.inventory;

create policy "Allow anonymous select on inventory"
on public.inventory
for select
to anon
using (true);

create policy "Allow anonymous insert on inventory"
on public.inventory
for insert
to anon
with check (true);

create policy "Allow anonymous update on inventory"
on public.inventory
for update
to anon
using (true)
with check (true);

create policy "Allow anonymous delete on inventory"
on public.inventory
for delete
to anon
using (true);
