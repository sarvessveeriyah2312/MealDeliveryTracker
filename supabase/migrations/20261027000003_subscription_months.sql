create table public.subscription_months (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  period date not null check (extract(day from period) = 1),
  fee_snapshot numeric(10, 2) not null check (fee_snapshot >= 0),
  meal_types_snapshot public.meal_type[] not null,
  weekdays_snapshot smallint[] not null,
  opening_credit numeric(10, 2) not null default 0,
  status public.month_status not null default 'open',
  closing_credit numeric(10, 2),
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (subscription_id, period),
  unique (id, user_id),
  foreign key (subscription_id, user_id) references public.subscriptions (id, user_id) on delete cascade
);
