create table if not exists public.inventory (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  quantity numeric not null default 1,
  unit text not null default 'st',
  location text not null default 'Pantry',
  expires_at date,
  created_at timestamptz not null default now()
);
