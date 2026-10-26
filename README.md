# MealTrack

A mobile-first PWA for tracking a monthly meal-catering subscription: log every lunch and dinner, see what credit you're owed for missed or cancelled meals, and carry it into next month's payment.

React + Vite + TypeScript · Tailwind v4 · TanStack Query · Supabase (Postgres, Auth, RLS) · vite-plugin-pwa · Vitest.

## How the money works

All fee logic lives in [`src/lib/billing.ts`](src/lib/billing.ts) (pure, no Supabase imports) and is covered by [`src/lib/billing.test.ts`](src/lib/billing.test.ts).

- **Per-meal value** = `credit_override` → fixed `lunch_value`/`dinner_value` → `fee_snapshot ÷ billable meals` (everything except `no_service`).
- **Credit**: `vendor_cancelled` always earns credit. For `user_cancelled` it depends on the policy: `full_credit`, `credit_with_notice` (cancelled ≥ `notice_hours` before lunch 12:00 / dinner 19:00 MYT), or `no_credit`.
- **Statement**: `amount_due = fee − min(opening_credit, fee)`; `closing_credit = leftover opening credit + earned credit + overpayment`. Closing a month carries `closing_credit` into the next one.
- **Auto-delivered**: with the vendor's auto-mark setting on (default), a meal still unmarked after its time (lunch 12:00 / dinner 19:00 MYT) is marked `delivered` by the app the next time it's open. Mark it cancelled before then (or change it afterwards) to earn credit.
- **Partial months** are prorated by meals: e.g. starting mid-month with half the meals gives half the fee (editable).
- All "today" logic uses `Asia/Kuala_Lumpur`.

## Setup

### 1. Supabase project

1. Create a project at [supabase.com](https://supabase.com).
2. Link and push the migrations (needs the [Supabase CLI](https://supabase.com/docs/guides/cli)):
   ```sh
   supabase login
   supabase link --project-ref <your-project-ref>   # asks for the database password
   supabase db push
   ```
3. Regenerate the typed client (optional; `src/types/database.ts` already mirrors the migrations):
   ```sh
   npm run db:types
   ```
4. **Google sign-in** (the only login method):
   1. In [Google Cloud Console](https://console.cloud.google.com/apis/credentials) create an **OAuth client ID** of type *Web application*.
      - Authorized JavaScript origins: `http://localhost:5173`, `https://<your-vercel-domain>`
      - Authorized redirect URI: `https://<project-ref>.supabase.co/auth/v1/callback`
   2. In Supabase → **Authentication → Sign In / Providers → Google**, enable it and paste the client ID and secret.
   3. Optional: disable the **Email** provider so Google is the only way in.
5. **Authentication → URL Configuration**:
   - Site URL: your production URL (or `http://localhost:5173` while developing)
   - Redirect URLs: `http://localhost:5173/**` and `https://<your-vercel-domain>/**`

Each Google account gets its own data (row-level security on `user_id`) and a row in `profiles` (name, email, photo) created by a trigger on `auth.users`. If someone previously signed in by email with the same Gmail address, Supabase links the Google identity to that existing account, so their data carries over.

### 2. Environment

```sh
cp .env.example .env.local
```

| Variable | Where to find it |
| --- | --- |
| `VITE_SUPABASE_URL` | Project Settings → API → Project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Project Settings → API Keys → publishable key (`sb_publishable_…`). The legacy `VITE_SUPABASE_ANON_KEY` also works. |

Both are safe to ship to the browser; row-level security restricts every table to `user_id = auth.uid()`.

### 3. Run

```sh
npm install
npm run dev        # http://localhost:5173
npm test           # unit tests
npm run typecheck
npm run build      # production build + service worker
```

## Deploying to Vercel

1. Import the repo in Vercel (framework preset: **Vite**; build `npm run build`, output `dist`).
2. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` under Project Settings → Environment Variables.
3. Deploy, then add `https://<your-domain>/**` to Supabase's Redirect URLs (and set it as the Site URL).

`vercel.json` rewrites all routes to `index.html` so client-side routes survive refreshes.

On your phone, open the deployed URL and use **Add to Home Screen** to install it as an app.

## Project layout

```
supabase/migrations/   enums, tables, RLS policies, indexes
src/lib/               billing.ts (all fee logic), dates.ts (MYT helpers), report.ts (export model), shareText.ts, money.ts
src/lib/export/        Excel (exceljs) and PDF (jsPDF) exporters, loaded on demand
src/api/               thin Supabase data access + monthOps.ts (open/close/reopen workflows)
src/hooks/             TanStack Query hooks, optimistic meal updates
src/features/          today, calendar, summary, reports (export + WhatsApp), settings, onboarding screens
src/components/        bottom nav, sheets, toast, shared UI
```

## Data model notes

- `subscription_months` snapshots the fee, meal types and weekdays when a month is opened, so later settings changes never rewrite history.
- Child tables use composite foreign keys on `(id, user_id)`, so a row can never reference another user's subscription even if its id is known.
- Reopening a closed month makes its meals editable again; closing it again recalculates the carried credit for every later month.
