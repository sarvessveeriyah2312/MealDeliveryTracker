create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  vendor_name text not null,
  vendor_phone text,
  meal_types public.meal_type[] not null default '{lunch,dinner}',
  delivery_weekdays smallint[] not null default '{1,2,3,4,5}',
  monthly_fee numeric(10, 2) not null check (monthly_fee >= 0),
  lunch_value numeric(10, 2) check (lunch_value >= 0),
  dinner_value numeric(10, 2) check (dinner_value >= 0),
  user_cancel_policy public.cancel_policy not null default 'credit_with_notice',
  notice_hours integer not null default 24 check (notice_hours >= 0),
  carry_forward_enabled boolean not null default true,
  auto_mark_delivered_on_close boolean not null default false,
  start_date date not null,
  end_date date,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  -- Lets child tables use a composite FK so a row can never point at another user's subscription.
  unique (id, user_id),
  check (end_date is null or end_date >= start_date),
  check (cardinality(meal_types) > 0),
  check (delivery_weekdays <@ '{0,1,2,3,4,5,6}'::smallint[])
);
