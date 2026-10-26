create table public.payments (
  id uuid primary key default gen_random_uuid(),
  subscription_month_id uuid not null,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  amount numeric(10, 2) not null check (amount > 0),
  paid_on date not null,
  method public.payment_method not null default 'bank_transfer',
  note text,
  created_at timestamptz not null default now(),
  foreign key (subscription_month_id, user_id) references public.subscription_months (id, user_id) on delete cascade
);
