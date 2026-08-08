begin;

drop index if exists public.inventory_product_id_location_unique_idx;

create index if not exists inventory_product_id_location_idx
on public.inventory (product_id, location);

commit;