# Auth and onboarding (step 2)

## Architecture and transition mode

- Browser auth uses `@supabase/ssr` so the session is stored in cookies rather than browser-only storage.
- `proxy.ts` validates the user on requests and refreshes expired session cookies.
- Server Components use the cookie-aware server client. The auth callback exchanges PKCE codes on the server.
- Authenticated users without `profiles.active_household_id` are redirected from `/hemma`, `/handla`, `/inventarie`, `/recept`, and their subroutes to `/onboarding`.
- Anonymous users deliberately retain access to the fixed legacy household during verification. This is the temporary compatibility exception to the private-route guard.
- Onboarding lists memberships, lets the user restore an existing active household, or calls `create_household()` to create one transactionally.
- `create_household()` automatically moves any remaining fixed-household legacy rows into the first Auth user's newly created household. An advisory transaction lock makes the claim one-time under concurrent signups; later users can never claim the unowned legacy dataset.

Do not apply `20260811102000_disable_legacy_anonymous_access.sql.example` yet. Invitations, owner transfer, and full household settings are not part of step 2.

## Manual Supabase Dashboard setup

In **Authentication → URL Configuration**:

1. Set the production **Site URL** to `https://kökshyllan.se`.
2. Add these **Redirect URLs** (use the real production origin):
   - `http://localhost:3000/auth/callback`
   - `https://kökshyllan.se/auth/callback`
3. Preview deployments need an explicitly allowed preview pattern or exact callback URL if they will be used for auth testing.

In **Authentication → Providers → Email**:

1. Keep Email + Password enabled.
2. Decide whether email confirmation is required. Production should normally require it.
3. Review the minimum password policy; the UI currently requires at least eight characters.

In **Authentication → Email Templates**, keep the confirmation and password-recovery templates enabled and ensure they use Supabase's confirmation URL variable. The app supplies `/auth/callback` as `redirect_to`; no Dashboard setting is changed by the code.

## First account and safe legacy-data link

1. Keep the anonymous bridge enabled.
2. Open `/skapa-konto`, create the real production account, and confirm its email if required.
3. If onboarding appears, you may stop there without creating a new household. Find the account in **Authentication → Users** and copy its UUID. Confirm the email and UUID carefully.
4. Take a database backup/checkpoint.
5. Run the following in Supabase SQL Editor after replacing `AUTH_USER_UUID`. This changes membership and the profile pointer only; it does not move, copy, or delete shopping, inventory, or recipe rows.

```sql
begin;

do $$
declare
  target_user_id uuid := 'AUTH_USER_UUID';
  legacy_id constant uuid := '00000000-0000-4000-8000-000000000001';
begin
  if not exists (select 1 from auth.users where id = target_user_id) then
    raise exception 'Auth user % does not exist', target_user_id;
  end if;

  if not exists (select 1 from public.households where id = legacy_id) then
    raise exception 'Legacy household is missing';
  end if;

  insert into public.household_members (household_id, user_id, role)
  values (legacy_id, target_user_id, 'owner')
  on conflict (household_id, user_id)
  do update set role = excluded.role;

  update public.profiles
  set active_household_id = legacy_id, updated_at = now()
  where id = target_user_id;

  if not found then
    raise exception 'Profile for auth user % is missing', target_user_id;
  end if;
end $$;

commit;
```

6. Log out and in again (or reload). `/hemma` should now show the existing legacy data under the real account.
7. Verify shopping, inventory, recipes, recipe details, edits, and realtime in two tabs before any anonymous cutover.
8. Only after explicit verification should the example cutover migration be reviewed, renamed with a new timestamp, and applied. Re-check that anonymous requests then fail.

If onboarding already created another household, the SQL above safely changes the active household to legacy; it does not remove the newly created household.

## Test plan

1. Anonymous: load all existing app routes and verify legacy data still works.
2. Sign-up: test both confirmation-required and immediate-session behavior as configured.
3. Session: log in, reload, close/reopen the browser, and revisit a private route.
4. Onboarding: test no memberships → create household; membership exists → select it; multiple memberships → switch the active selection.
5. Guards: while authenticated with a null active household, open every private route and a recipe subroute directly; each must land on `/onboarding`.
6. Password: request reset, follow the email link, set a new password, then log in with it.
7. Account: log out from Settings and confirm anonymous legacy mode still works during transition.
8. Legacy link: perform the SQL procedure above and confirm old data and realtime remain intact.

## Step 3 household management

- `20260811110000_household_management_and_invitations.sql` adds protected membership RPCs and invitation storage. Apply it manually after the two foundation migrations; the app does not run migrations.
- Settings lists members and roles, lets owners promote another member to owner, remove members, create e-mail links, and renew five-minute join codes.
- E-mail invitations open a pre-addressed message in the owner's local mail app. No mail-provider or service-role secret is needed by the browser.
- Join codes are generated in Postgres, stored only as SHA-256 hashes, expire after five minutes, and are consumed once.
- The database prevents removing or leaving as the final owner. Promote another member before leaving.
- Invitation acceptance selects the joined household as active. Code entry is available both in onboarding and Settings.

## Remaining backlog

- Account deletion flow.
- Product-catalog write hardening.
- Final anonymous-policy cutover after production verification.

## Last-member household deletion

`20260814100000_delete_household_as_last_member.sql` adds the protected
`delete_household_as_last_member` RPC. Apply it manually in Supabase after all
earlier repository migrations:

1. Take a database backup or point-in-time recovery checkpoint.
2. Open Supabase Dashboard → SQL Editor.
3. Copy the complete contents of
   `supabase/migrations/20260814100000_delete_household_as_last_member.sql` into
   a new query and run it once.
4. Confirm that the query commits successfully and that the function is
   executable only by the `authenticated` role.
5. Test first with a disposable household whose only member is its owner.

The RPC locks the household row, rechecks that the caller is its sole member and
owner, clears the active-household pointer, and deletes the household in one
transaction. Cascading foreign keys remove inventory, shopping-list rows,
recipes and ingredients, invitations and join codes, memberships, and inventory
categories. The global `products` catalog is not connected to this cascade and
is never deleted.

If `20260814100000_delete_household_as_last_member.sql` has already been
applied, also apply
`20260814210000_fix_delete_household_profile_references.sql`. The corrective
migration clears every stale profile pointer to the household before deletion;
it does not weaken the sole-member or owner checks.

After that migration, apply
`20260814220000_fix_delete_household_owner_role_check.sql`. It renames the
PL/pgSQL membership-role variable so PostgreSQL cannot interpret `current_role`
as its built-in database-role keyword during the owner check. All authentication,
locking, sole-member, profile cleanup, privilege, and search-path protections
remain unchanged.

## Production polish: guards, roles, and invitation delivery

- All private UI routes (`/hemma`, `/handla`, `/inventarie`, `/recept` and subroutes, `/installningar`, and `/onboarding`) redirect anonymous visitors to `/logga-in?next=...`. The complete path and query string are preserved, including invitation destinations passed through login and signup.
- The legacy anonymous database policies remain temporarily available for migration verification, but the normal application UI no longer exposes anonymous access.
- `20260811120000_demote_household_owner.sql` adds the protected `demote_household_owner` RPC. Apply it manually after `20260811110000_household_management_and_invitations.sql`. The app does not run it. It prevents self-demotion and guarantees that the final owner cannot be demoted.
- Destructive household actions use the app's Sheet UI rather than browser confirmation dialogs.

### Resend setup (manual)

No Resend or DNS dashboard changes are made by the application.

1. Create or sign in to a Resend account.
2. In Resend, add `kökshyllan.se` as the production sending domain (or use `mail.kökshyllan.se` as a dedicated sending subdomain).
3. Add the DNS records shown by Resend at the domain's DNS provider, then wait until Resend marks the domain as verified.
4. Create a Resend API key with permission to send mail. Copy it once and store it as the server-only environment variable `RESEND_API_KEY` in local `.env.local` and in the Vercel project settings. Never prefix it with `NEXT_PUBLIC_` and never commit the value.
5. Set `RESEND_FROM_EMAIL` to a sender on the verified domain, for example `Kökshyllan <inbjudan@kökshyllan.se>`.
6. Redeploy after adding or changing Vercel environment variables.
7. For an initial Resend test without a verified domain, use the testing sender permitted by the current Resend account. Resend testing restrictions may limit recipient addresses; use a verified domain before production invitations.

If either variable is absent, the invitation endpoint returns a clear configuration error and does not create an invitation. If Resend rejects a send after the invitation is created, the UI reports that delivery failed; retrying replaces the unused invitation for that address with a fresh token.

### Supabase Auth emails (styled separately)

Household invitation emails are sent by Kökshyllan through Resend. Supabase's own transactional auth emails remain separate and can later be styled in **Authentication → Email Templates**:

- Confirm signup
- Invite user (only if Supabase Admin invitations are introduced later)
- Magic link
- Change email address
- Reset password
- Reauthentication (when enabled)

Keep Supabase's required template variables and confirmation URL intact when styling them. Supabase SMTP/provider configuration is independent of `RESEND_API_KEY` used by Kökshyllan's household invitation route.
