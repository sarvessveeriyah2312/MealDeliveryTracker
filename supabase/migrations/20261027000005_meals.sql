create table public.meals (
  id uuid primary key default gen_random_uuid(),
  subscription_month_id uuid not null,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  date date not null,
  meal_type public.meal_type not null,
  status public.meal_status not null default 'scheduled',
  cancelled_at timestamptz,
  credit_override numeric(10, 2) check (credit_override >= 0),
  note text,
  unique (subscription_month_id, date, meal_type),
  foreign key (subscription_month_id, user_id) references public.subscription_months (id, user_id) on delete cascade
);
