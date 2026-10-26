alter table public.subscriptions enable row level security;
alter table public.subscriptions force row level security;
create policy "subscriptions_select_own" on public.subscriptions for select to authenticated using (user_id = (select auth.uid()));
create policy "subscriptions_insert_own" on public.subscriptions for insert to authenticated with check (user_id = (select auth.uid()));
create policy "subscriptions_update_own" on public.subscriptions for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "subscriptions_delete_own" on public.subscriptions for delete to authenticated using (user_id = (select auth.uid()));

alter table public.subscription_months enable row level security;
alter table public.subscription_months force row level security;
create policy "subscription_months_select_own" on public.subscription_months for select to authenticated using (user_id = (select auth.uid()));
create policy "subscription_months_insert_own" on public.subscription_months for insert to authenticated with check (user_id = (select auth.uid()));
create policy "subscription_months_update_own" on public.subscription_months for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "subscription_months_delete_own" on public.subscription_months for delete to authenticated using (user_id = (select auth.uid()));

alter table public.off_days enable row level security;
alter table public.off_days force row level security;
create policy "off_days_select_own" on public.off_days for select to authenticated using (user_id = (select auth.uid()));
create policy "off_days_insert_own" on public.off_days for insert to authenticated with check (user_id = (select auth.uid()));
create policy "off_days_update_own" on public.off_days for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "off_days_delete_own" on public.off_days for delete to authenticated using (user_id = (select auth.uid()));

alter table public.meals enable row level security;
alter table public.meals force row level security;
create policy "meals_select_own" on public.meals for select to authenticated using (user_id = (select auth.uid()));
create policy "meals_insert_own" on public.meals for insert to authenticated with check (user_id = (select auth.uid()));
create policy "meals_update_own" on public.meals for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "meals_delete_own" on public.meals for delete to authenticated using (user_id = (select auth.uid()));

alter table public.payments enable row level security;
alter table public.payments force row level security;
create policy "payments_select_own" on public.payments for select to authenticated using (user_id = (select auth.uid()));
create policy "payments_insert_own" on public.payments for insert to authenticated with check (user_id = (select auth.uid()));
create policy "payments_update_own" on public.payments for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "payments_delete_own" on public.payments for delete to authenticated using (user_id = (select auth.uid()));

