begin;

create or replace function public.create_household(household_name text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_household_id uuid;
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  if nullif(btrim(household_name), '') is null then
    raise exception 'Household name is required';
  end if;

  insert into public.households (name, created_by)
  values (btrim(household_name), current_user_id)
  returning id into new_household_id;

  insert into public.household_members (household_id, user_id, role)
  values (new_household_id, current_user_id, 'owner');

  update public.profiles
  set active_household_id = new_household_id,
      updated_at = now()
  where id = current_user_id;

  return new_household_id;
end;
$$;

revoke all on function public.create_household(text) from public;
grant execute on function public.create_household(text) to authenticated;

commit;
