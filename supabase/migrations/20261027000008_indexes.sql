create index meals_user_date_idx on public.meals (user_id, date);
create index off_days_user_date_idx on public.off_days (user_id, date);
create index payments_user_paid_on_idx on public.payments (user_id, paid_on);
create index subscriptions_user_idx on public.subscriptions (user_id);
create index subscription_months_user_period_idx on public.subscription_months (user_id, period);
create index payments_month_idx on public.payments (subscription_month_id);
