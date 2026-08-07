begin;

lock table public.inventory in share row exclusive mode;

with ranked_inventory as (
  select
    id,
    row_number() over (
      partition by product_id, location
      order by created_at asc nulls last, id asc
    ) as row_number
  from public.inventory
)
delete from public.inventory as inventory
using ranked_inventory
where inventory.id = ranked_inventory.id
  and ranked_inventory.row_number > 1;

create unique index if not exists inventory_product_id_location_unique_idx
on public.inventory (product_id, location);

commit;
