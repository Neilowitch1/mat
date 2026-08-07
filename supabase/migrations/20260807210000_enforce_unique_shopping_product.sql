begin;

lock table public.shopping_list in share row exclusive mode;

with ranked_shopping_items as (
  select
    id,
    row_number() over (
      partition by product_id
      order by created_at asc nulls last, id asc
    ) as row_number
  from public.shopping_list
)
delete from public.shopping_list as shopping_item
using ranked_shopping_items
where shopping_item.id = ranked_shopping_items.id
  and ranked_shopping_items.row_number > 1;

create unique index if not exists shopping_list_product_id_unique_idx
on public.shopping_list (product_id);

commit;
