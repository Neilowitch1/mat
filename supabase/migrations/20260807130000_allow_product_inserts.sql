drop policy if exists "Allow product inserts" on public.products;

create policy "Allow product inserts"
on public.products
for insert
to anon, authenticated
with check (true);
