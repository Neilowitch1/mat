begin;

create or replace function public.demote_household_owner(target_household_id uuid, target_user_id uuid)
returns void language plpgsql security definer set search_path = ''
as $$
declare owner_count integer;
begin
  if not public.is_household_owner(target_household_id) then
    raise exception 'Endast en ägare kan ändra ägarroller.';
  end if;
  perform 1 from public.households where id = target_household_id for update;
  if (select auth.uid()) = target_user_id then
    raise exception 'Du kan inte sänka din egen roll.';
  end if;
  if not exists (
    select 1 from public.household_members
    where household_id = target_household_id and user_id = target_user_id and role = 'owner'
    for update
  ) then
    raise exception 'Personen är inte ägare i hushållet.';
  end if;
  select count(*) into owner_count from public.household_members where household_id = target_household_id and role = 'owner';
  if owner_count <= 1 then raise exception 'Hushållets sista ägare kan inte degraderas.'; end if;
  update public.household_members set role = 'member' where household_id = target_household_id and user_id = target_user_id;
end;
$$;

revoke all on function public.demote_household_owner(uuid, uuid) from public;
grant execute on function public.demote_household_owner(uuid, uuid) to authenticated;

commit;
