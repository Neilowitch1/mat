begin;

create or replace function public.delete_household_as_last_member(target_household_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  member_count integer;
  current_role public.household_role;
begin
  if current_user_id is null then
    raise exception 'Du måste vara inloggad.';
  end if;

  perform 1 from public.households
  where id = target_household_id
  for update;

  if not found then
    raise exception 'Hushållet finns inte.';
  end if;

  select role into current_role
  from public.household_members
  where household_id = target_household_id
    and user_id = current_user_id;

  if current_role is null then
    raise exception 'Du är inte medlem i hushållet.';
  end if;

  if current_role <> 'owner' then
    raise exception 'Endast hushållets ägare kan radera hushållet.';
  end if;

  select count(*) into member_count
  from public.household_members
  where household_id = target_household_id;

  if member_count <> 1 then
    raise exception 'Hushållet kan bara raderas när du är den enda medlemmen.';
  end if;

  update public.profiles
  set active_household_id = null, updated_at = now()
  where active_household_id = target_household_id;

  delete from public.households where id = target_household_id;
end;
$$;

revoke all on function public.delete_household_as_last_member(uuid) from public;
grant execute on function public.delete_household_as_last_member(uuid) to authenticated;

commit;
