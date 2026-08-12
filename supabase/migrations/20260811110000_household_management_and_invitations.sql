begin;

create extension if not exists pgcrypto with schema extensions;

create table public.household_invitations (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  email text,
  token_hash text not null unique,
  kind text not null check (kind in ('email', 'code')),
  expires_at timestamptz not null,
  accepted_at timestamptz,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint household_invitations_email_kind check (
    (kind = 'email' and email is not null) or (kind = 'code' and email is null)
  )
);

create index household_invitations_household_idx
  on public.household_invitations (household_id, created_at desc);
create index household_invitations_expiry_idx
  on public.household_invitations (expires_at) where accepted_at is null;

alter table public.household_invitations enable row level security;
grant select on public.household_invitations to authenticated;

create policy "Owners can read household invitations"
on public.household_invitations for select to authenticated
using (public.is_household_owner(household_id));

create or replace function public.household_members_for_settings(target_household_id uuid)
returns table (user_id uuid, role public.household_role, display_name text, email text, created_at timestamptz)
language sql stable security definer set search_path = ''
as $$
  select members.user_id, members.role, profiles.display_name,
         users.email::text, members.created_at
  from public.household_members members
  join public.profiles profiles on profiles.id = members.user_id
  join auth.users users on users.id = members.user_id
  where members.household_id = target_household_id
    and public.is_household_member(target_household_id)
  order by (members.role = 'owner') desc, members.created_at;
$$;

create or replace function public.remove_household_member(target_household_id uuid, target_user_id uuid)
returns void language plpgsql security definer set search_path = ''
as $$
declare target_role public.household_role; owner_count integer;
begin
  if (select auth.uid()) = target_user_id then
    raise exception 'Använd lämna hushåll för ditt eget medlemskap.';
  end if;
  if not public.is_household_owner(target_household_id) then raise exception 'Endast en ägare kan ta bort medlemmar.'; end if;
  select role into target_role from public.household_members where household_id = target_household_id and user_id = target_user_id for update;
  if target_role is null then raise exception 'Medlemmen finns inte.'; end if;
  if target_role = 'owner' then
    select count(*) into owner_count from public.household_members where household_id = target_household_id and role = 'owner';
    if owner_count <= 1 then raise exception 'Hushållets sista ägare kan inte tas bort.'; end if;
  end if;
  delete from public.household_members where household_id = target_household_id and user_id = target_user_id;
  update public.profiles set active_household_id = null, updated_at = now() where id = target_user_id and active_household_id = target_household_id;
end;
$$;

create or replace function public.leave_household(target_household_id uuid)
returns void language plpgsql security definer set search_path = ''
as $$
declare current_user_id uuid := (select auth.uid()); current_role public.household_role; owner_count integer;
begin
  select role into current_role from public.household_members where household_id = target_household_id and user_id = current_user_id for update;
  if current_role is null then raise exception 'Du är inte medlem i hushållet.'; end if;
  if current_role = 'owner' then
    select count(*) into owner_count from public.household_members where household_id = target_household_id and role = 'owner';
    if owner_count <= 1 then raise exception 'Överför ägarskapet innan du lämnar hushållet.'; end if;
  end if;
  delete from public.household_members where household_id = target_household_id and user_id = current_user_id;
  update public.profiles set active_household_id = null, updated_at = now() where id = current_user_id and active_household_id = target_household_id;
end;
$$;

create or replace function public.transfer_household_ownership(target_household_id uuid, target_user_id uuid)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  if not public.is_household_owner(target_household_id) then raise exception 'Endast en ägare kan överföra ägarskap.'; end if;
  if not exists (select 1 from public.household_members where household_id = target_household_id and user_id = target_user_id) then raise exception 'Mottagaren måste redan vara medlem.'; end if;
  update public.household_members set role = 'owner' where household_id = target_household_id and user_id = target_user_id;
end;
$$;

create or replace function public.create_join_code(target_household_id uuid)
returns table (code text, expires_at timestamptz)
language plpgsql security definer set search_path = ''
as $$
declare generated_code text; expiry timestamptz := now() + interval '5 minutes';
begin
  if not public.is_household_owner(target_household_id) then raise exception 'Endast en ägare kan skapa en kod.'; end if;
  delete from public.household_invitations where household_id = target_household_id and kind = 'code' and accepted_at is null;
  loop
    generated_code := upper(substr(encode(extensions.gen_random_bytes(8), 'hex'), 1, 8));
    begin
      insert into public.household_invitations (household_id, token_hash, kind, expires_at, created_by)
      values (target_household_id, encode(extensions.digest(generated_code, 'sha256'), 'hex'), 'code', expiry, (select auth.uid()));
      exit;
    exception when unique_violation then end;
  end loop;
  return query select generated_code, expiry;
end;
$$;

create or replace function public.create_email_invitation(target_household_id uuid, target_email text, raw_token text)
returns timestamptz language plpgsql security definer set search_path = ''
as $$
declare normalized_email text := lower(btrim(target_email)); expiry timestamptz := now() + interval '7 days';
begin
  if not public.is_household_owner(target_household_id) then raise exception 'Endast en ägare kan bjuda in.'; end if;
  if normalized_email !~ '^[^@[:space:]]+@[^@[:space:]]+[.][^@[:space:]]+$' then raise exception 'Ogiltig e-postadress.'; end if;
  delete from public.household_invitations where household_id = target_household_id and email = normalized_email and accepted_at is null;
  insert into public.household_invitations (household_id, email, token_hash, kind, expires_at, created_by)
  values (target_household_id, normalized_email, encode(extensions.digest(raw_token, 'sha256'), 'hex'), 'email', expiry, (select auth.uid()));
  return expiry;
end;
$$;

create or replace function public.accept_household_invitation(raw_token text)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare invitation public.household_invitations%rowtype; current_user_id uuid := (select auth.uid()); current_email text;
begin
  if current_user_id is null then raise exception 'Du måste vara inloggad.'; end if;
  select * into invitation from public.household_invitations
  where token_hash = encode(extensions.digest(upper(btrim(raw_token)), 'sha256'), 'hex') and accepted_at is null and expires_at > now() for update;
  if invitation.id is null then raise exception 'Inbjudan är ogiltig, använd eller har gått ut.'; end if;
  if invitation.kind = 'email' then
    select lower(email) into current_email from auth.users where id = current_user_id;
    if current_email is distinct from invitation.email then raise exception 'Inbjudan är skickad till en annan e-postadress.'; end if;
  end if;
  insert into public.household_members (household_id, user_id, role) values (invitation.household_id, current_user_id, 'member') on conflict do nothing;
  update public.household_invitations set accepted_at = now() where id = invitation.id;
  update public.profiles set active_household_id = invitation.household_id, updated_at = now() where id = current_user_id;
  return invitation.household_id;
end;
$$;

revoke all on function public.household_members_for_settings(uuid) from public;
revoke all on function public.remove_household_member(uuid, uuid) from public;
revoke all on function public.leave_household(uuid) from public;
revoke all on function public.transfer_household_ownership(uuid, uuid) from public;
revoke all on function public.create_join_code(uuid) from public;
revoke all on function public.create_email_invitation(uuid, text, text) from public;
revoke all on function public.accept_household_invitation(text) from public;
grant execute on function public.household_members_for_settings(uuid) to authenticated;
grant execute on function public.remove_household_member(uuid, uuid) to authenticated;
grant execute on function public.leave_household(uuid) to authenticated;
grant execute on function public.transfer_household_ownership(uuid, uuid) to authenticated;
grant execute on function public.create_join_code(uuid) to authenticated;
grant execute on function public.create_email_invitation(uuid, text, text) to authenticated;
grant execute on function public.accept_household_invitation(text) to authenticated;

commit;
