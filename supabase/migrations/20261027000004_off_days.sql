create table public.off_days (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  date date not null,
  reason text not null default 'public holiday',
  created_at timestamptz not null default now(),
  unique (subscription_id, date),
  foreign key (subscription_id, user_id) references public.subscriptions (id, user_id) on delete cascade
);
