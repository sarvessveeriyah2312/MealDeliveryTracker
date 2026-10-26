# Build: MealTrack — Meal Subscription Delivery Tracker

## Context
I pay a monthly catering subscription for lunch and dinner. The vendor sometimes doesn't deliver, and sometimes I cancel. I need a mobile-first web app to log every meal, calculate what I'm owed, and carry unused credit into the next month's payment.

Single user for now (me), but design the data model so it's multi-user safe via Supabase Auth + RLS.
Currency: MYR (RM). Timezone: Asia/Kuala_Lumpur. All "today" logic must use this timezone, not UTC.

## Tech stack
- React + Vite + TypeScript (strict)
- Tailwind CSS, mobile-first (design for 375px width first)
- React Router, TanStack Query, react-hook-form + zod, date-fns (+ date-fns-tz)
- Supabase: Postgres, Auth (email magic link), RLS on every table, SQL migrations in `supabase/migrations`
- vite-plugin-pwa (installable, works as home-screen app)
- Vitest for unit tests
- Deploy target: Vercel. Env vars: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY

## Core concepts
1. **Subscription** – a vendor plan I'm on (I may have more than one, e.g. switching vendors).
2. **Subscription month** – one billing period (calendar month) of a subscription. Snapshots the config at the time it's created so later config changes don't rewrite history.
3. **Meal** – one scheduled slot = (date, meal_type). Auto-generated for the month from the delivery-days config.
4. **Credit** – money owed back to me from undelivered/cancelled meals. Carried forward to reduce next month's payment.

## Data model (create as migrations)
- `subscriptions`: id, user_id, vendor_name, vendor_phone, meal_types (text[] of 'lunch'|'dinner'), delivery_weekdays (int[] 0–6), monthly_fee numeric(10,2), lunch_value numeric null, dinner_value numeric null (optional fixed per-meal credit value), user_cancel_policy ('full_credit' | 'credit_with_notice' | 'no_credit'), notice_hours int default 24, carry_forward_enabled bool default true, start_date, end_date null, is_active, created_at
- `subscription_months`: id, subscription_id, user_id, period (date, first day of month), fee_snapshot, meal_types_snapshot, weekdays_snapshot, opening_credit numeric default 0, status ('open' | 'closed'), closing_credit numeric null, closed_at null. Unique (subscription_id, period).
- `off_days`: id, subscription_id, user_id, date, reason (public holiday / vendor off / etc). Meals on these dates are status `no_service` and are excluded from the fee math.
- `meals`: id, subscription_month_id, user_id, date, meal_type, status ('scheduled' | 'delivered' | 'vendor_cancelled' | 'user_cancelled' | 'no_service'), cancelled_at timestamptz null, credit_override numeric null, note text. Unique (subscription_month_id, date, meal_type).
- `payments`: id, subscription_month_id, user_id, amount, paid_on, method (cash / bank transfer / DuitNow / other), note.
- RLS: user can only CRUD rows where user_id = auth.uid(). Add indexes on (user_id, date).

## Business rules (the important part)
Put ALL fee logic in one pure TypeScript module `src/lib/billing.ts` with no Supabase imports, fully unit tested.

**Meal generation**
- When a month is opened, generate a `scheduled` meal for every date in the month whose weekday is in delivery_weekdays, for each meal_type. Respect subscription start/end dates (partial first/last month).
- Dates in `off_days` → `no_service`.
- Changing delivery days/meal types in settings regenerates only FUTURE `scheduled` meals in the open month; never touch past or already-marked meals. Show a confirmation of what will change.

**Credit value per meal**
- If lunch_value/dinner_value is set, use it.
- Otherwise: fee_snapshot ÷ count of billable meals in the month (billable = all statuses except `no_service`).
- `credit_override` on a meal wins over both.
- Keep full precision internally; round to 2 dp only for display and when closing a month.

**Which meals earn credit**
- `vendor_cancelled` → always full credit.
- `user_cancelled` → depends on policy:
  - full_credit → full credit
  - credit_with_notice → credit only if cancelled_at is ≥ notice_hours before the meal time (lunch 12:00, dinner 19:00; make these times configurable constants)
  - no_credit → 0
- `delivered`, `scheduled`, `no_service` → 0.

**Monthly statement** (for month M)
- base_fee = fee_snapshot
- opening_credit = previous month's closing_credit (0 if none or carry forward disabled)
- credit_applied = min(opening_credit, base_fee)
- amount_due = base_fee − credit_applied
- paid = sum(payments)
- earned_credit = sum of credit from M's meals
- overpayment = max(paid − amount_due, 0)
- closing_credit = (opening_credit − credit_applied) + earned_credit + overpayment
- outstanding = max(amount_due − paid, 0)

**Closing a month**
- "Close month" locks the month (meals read-only unless I explicitly reopen), stores closing_credit, and opens the next month with opening_credit = that value.
- Any `scheduled` meals still unmarked in the past must be resolved before closing: show a review list. Setting: "auto-mark past unmarked meals as delivered on close" (default off).
- Reopening a closed month must recalculate and cascade the new closing_credit forward to later months (warn me first).

**Required unit tests (include at least these)**
- Mon–Fri, lunch+dinner, 20 delivery days, fee RM600 → RM15/meal. 3 vendor cancels + 2 user cancels with notice → earned RM75. Next month fee RM600 → amount_due RM525.
- user_cancelled with less notice than notice_hours under credit_with_notice → RM0.
- Off days reduce billable meals and raise the per-meal value accordingly.
- Credit larger than next month's fee → amount_due 0, remainder carried again.
- Fixed lunch_value/dinner_value overrides derived value.
- Partial month (subscription starts on the 15th).
- Timezone: a meal at 23:30 MYT is on the correct local date.

## Screens (mobile-first, bottom tab nav)
1. **Today** – today's lunch & dinner cards with big one-tap buttons: ✅ Delivered / ❌ They didn't deliver / 🙅 I cancelled. Show this month's running credit and amount due next month at top. Also show "unmarked past meals: N" with a link to resolve.
2. **Calendar** – month grid; each day shows two dots (lunch/dinner) colour-coded by status. Tap a day → bottom sheet to change status, add note, override credit. Long-press / multi-select to bulk-mark a date range (e.g. "I'm travelling 10–14th, cancel all").
3. **Summary** – current month statement using the formula above, breakdown by status counts, payments list + add payment, close month button, history of past months with carry-forward chain.
4. **Settings** – subscription config (vendor, fee, meal types, delivery weekday toggles, per-meal values, cancel policy, notice hours, carry forward), off days manager, switch/add subscription.
5. **Share** – generate a plain-text month summary I can copy to WhatsApp to send the vendor (dates they missed, credit owed, amount I'll pay next month).

## UX requirements
- Thumb-friendly: tap targets ≥ 44px, primary actions in the bottom half of the screen.
- Optimistic updates with TanStack Query; toast with Undo after marking a meal.
- Status colours: delivered green, vendor_cancelled red, user_cancelled amber, no_service grey, scheduled outline.
- Dark mode support. RM formatting via Intl.NumberFormat('en-MY', { style: 'currency', currency: 'MYR' }).
- Empty state on first login → onboarding wizard to create the first subscription and open the current month.

## How to work
1. Start in plan mode. Propose the folder structure, migration list, and build order, then wait for my OK.
2. Build in phases, and stop for me to review after each:
   - Phase 1: scaffold, Supabase migrations + RLS, auth, typed Supabase client (generate types)
   - Phase 2: `billing.ts` + meal generation + all unit tests passing
   - Phase 3: Today + Calendar screens
   - Phase 4: Summary, close/reopen month, payments, share text
   - Phase 5: Settings, off days, PWA, polish
3. Never put fee logic in components or SQL triggers; components call `billing.ts`.
4. Write a README with setup steps (Supabase project, running migrations, env vars, Vercel deploy).