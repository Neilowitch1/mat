# Multi-household migration

> Step 2 auth and onboarding are implemented. See `AUTH_AND_ONBOARDING.md` for Dashboard setup, testing, and the safe production-account link procedure.

## Scope

This foundation adds Supabase Auth-backed profiles and household isolation without adding login, onboarding, invitations, or settings UI.

The fixed legacy household id is `00000000-0000-4000-8000-000000000001`.

## What the migrations do

1. `20260811100000_add_multi_household_auth_foundation.sql`
   - Creates `profiles`, `households`, `household_members`, and the `household_role` enum.
   - Provisions a profile for every new Auth user and backfills existing Auth users.
   - Creates membership helpers for RLS and the fixed `Legacy-hushåll` row.
   - Adds nullable `household_id` columns to `shopping_list`, `inventory`, and `recipes`.
   - Updates every existing row in those tables to the legacy household.
   - Only after the backfill, makes those columns required and adds foreign keys.
   - Replaces global shopping-list uniqueness with uniqueness per household.
   - Adds household-aware indexes and authenticated RLS policies.
   - Protects recipe ingredients through their parent recipe.
   - Keeps temporary anonymous access only to the legacy household so the current UI works.
2. `20260811101000_create_household_rpc.sql`
   - Transactionally creates a household, makes the current user its owner, and selects it as active.
3. `20260811102000_disable_legacy_anonymous_access.sql.example`
   - Is deliberately not runnable yet. It becomes the auth cutover migration after step 2 UI is deployed.

No existing application row is deleted. The old unique index on `shopping_list.product_id` is replaced by `(household_id, product_id)`.

## Before applying to production

1. Take a Supabase backup or point-in-time recovery checkpoint.
2. Confirm the production schema has the expected tables and columns and all earlier repository migrations are recorded as applied. Some original base tables were created outside this migration history, so test against a production schema clone first.
3. Check that the fixed legacy id does not conflict with a manually created household.
4. Run the two `.sql` migrations in timestamp order during a low-write window. Backfill and `not null` changes take locks proportional to table size.
5. Deploy the application code after both migrations succeed. The old client remains compatible in the short interval because the database supplies the legacy default and its temporary anon policies.
6. Compare row counts before and after for `shopping_list`, `inventory`, `recipes`, and `recipe_ingredients`.
7. Verify every row in the three directly owned tables has the legacy household id.
8. Keep the `.sql.example` file unchanged until step 2.

## Required auth cutover in step 2

Before public production use:

1. Configure Supabase Auth redirect URLs, email templates, and email/password policy.
2. Build login, session handling, password reset, onboarding, and a route guard.
3. Create the first production user.
4. Make that user the legacy household owner and set it active:

```sql
insert into public.household_members (household_id, user_id, role)
values (
  '00000000-0000-4000-8000-000000000001',
  '<AUTH_USER_UUID>',
  'owner'
)
on conflict (household_id, user_id)
do update set role = excluded.role;

update public.profiles
set active_household_id = '00000000-0000-4000-8000-000000000001',
    updated_at = now()
where id = '<AUTH_USER_UUID>';
```

5. Rename the `.sql.example` cutover file to a later `.sql` timestamp and apply it after the auth UI deploy.
6. Verify anonymous requests cannot read or mutate household data.

## Product catalog decision

`products` remains global. Product identity is shared by shopping items, inventory batches, and recipe ingredients. A global catalog avoids duplicates per household and preserves cross-feature matching.

The current `default_unit` and rename behavior modify global product metadata. Before a broad public launch, either restrict global edits to trusted server-side operations or move household-specific preferences such as default units to a `household_products` table.

## Known transition risks

- Until the cutover migration is applied, anyone with the public anon key can access the legacy household. This is compatibility behavior, not production-grade privacy.
- The service layer falls back to the legacy household only when there is no Auth user. An authenticated user without an active household gets an explicit error.
- `recipe_ingredients` intentionally has no duplicate `household_id`; ownership derives from `recipes`.
- Invitations, ownership transfer, preventing removal of the final owner, account deletion, and household deletion UX belong to later steps.
