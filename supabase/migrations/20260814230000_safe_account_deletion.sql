begin;

create or replace function public.handle_auth_user_deletion()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  membership record;
  household_member_count integer;
  household_owner_count integer;
begin
  -- Serialize account deletion with membership and household mutations.
  perform 1
  from public.households households
  join public.household_members members on members.household_id = households.id
  where members.user_id = old.id
  order by households.id
  for update of households;

  for membership in
    select members.household_id, members.role
    from public.household_members members
    where members.user_id = old.id
    order by members.household_id
  loop
    select count(*) into household_member_count
    from public.household_members
    where household_id = membership.household_id;

    select count(*) into household_owner_count
    from public.household_members
    where household_id = membership.household_id
      and role = 'owner';

    if household_member_count = 1 then
      if membership.role <> 'owner' then
        raise exception 'Kontot är ensam medlem men inte ägare i ett hushåll. Kontakta support.';
      end if;

      update public.profiles
      set active_household_id = null, updated_at = now()
      where active_household_id = membership.household_id;

      -- Household-owned rows cascade here. public.products has no household FK
      -- and is deliberately outside this deletion path.
      delete from public.households where id = membership.household_id;
    elsif membership.role = 'owner' and household_owner_count <= 1 then
      raise exception 'Du är sista ägaren i ett hushåll med andra medlemmar. Gör först en annan medlem till ägare.';
    else
      delete from public.household_members
      where household_id = membership.household_id
        and user_id = old.id;
    end if;
  end loop;

  -- Invites authored by the user and their profile also cascade from auth.users.
  return old;
end;
$$;

revoke all on function public.handle_auth_user_deletion() from public;

drop trigger if exists before_auth_user_delete_cleanup on auth.users;
create trigger before_auth_user_delete_cleanup
before delete on auth.users
for each row execute function public.handle_auth_user_deletion();

commit;
