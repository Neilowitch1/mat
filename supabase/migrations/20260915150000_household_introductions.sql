begin;

-- No backfill: existing users have not yet completed this introduction.
-- A row means completed OR skipped; no row means not yet completed.
-- Keep status across leaving/rejoining, but delete it with the user/household.
create table public.household_introductions (
  user_id uuid not null references auth.users(id) on delete cascade,
  household_id uuid not null references public.households(id) on delete cascade,
  completed_at timestamptz not null default now(),
  primary key (user_id, household_id)
);

alter table public.household_introductions enable row level security;
revoke all on public.household_introductions from anon, authenticated;
grant select, insert on public.household_introductions to authenticated;

create policy "Users read only their own introduction status"
on public.household_introductions for select to authenticated
using (user_id = (select auth.uid()) and public.is_household_member(household_id));

create policy "Users complete only their own household introduction"
on public.household_introductions for insert to authenticated
with check (user_id = (select auth.uid()) and public.is_household_member(household_id));

commit;
