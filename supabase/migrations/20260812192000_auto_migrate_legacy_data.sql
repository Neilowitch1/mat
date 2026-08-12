begin;

create or replace function public.create_household(household_name text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  legacy_id constant uuid := '00000000-0000-4000-8000-000000000001';
  new_household_id uuid;
  current_user_id uuid := auth.uid();
  oldest_user_id uuid;
  legacy_has_data boolean;
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  if nullif(btrim(household_name), '') is null then
    raise exception 'Household name is required';
  end if;

  -- Serialize household creation while deciding whether the one-time legacy
  -- dataset should follow the first account into its new household.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('public.create_household.legacy_migration'));

  insert into public.households (name, created_by)
  values (btrim(household_name), current_user_id)
  returning id into new_household_id;

  insert into public.household_members (household_id, user_id, role)
  values (new_household_id, current_user_id, 'owner');

  update public.profiles
  set active_household_id = new_household_id,
      updated_at = now()
  where id = current_user_id;

  select u.id
  into oldest_user_id
  from auth.users u
  order by u.created_at, u.id
  limit 1;

  select
    exists (select 1 from public.shopping_list where household_id = legacy_id)
    or exists (select 1 from public.inventory where household_id = legacy_id)
    or exists (select 1 from public.recipes where household_id = legacy_id)
  into legacy_has_data;

  -- Legacy data predates accounts and has no user owner. Only the first auth
  -- account may claim it, and only once; moving the rows empties the source.
  if legacy_has_data and current_user_id = oldest_user_id then
    update public.shopping_list
    set household_id = new_household_id
    where household_id = legacy_id;

    update public.inventory
    set household_id = new_household_id
    where household_id = legacy_id;

    update public.recipes
    set household_id = new_household_id
    where household_id = legacy_id;
  end if;

  return new_household_id;
end;
$$;

revoke all on function public.create_household(text) from public;
grant execute on function public.create_household(text) to authenticated;

commit;
