create type public.meal_type as enum ('lunch', 'dinner');
create type public.meal_status as enum ('scheduled', 'delivered', 'vendor_cancelled', 'user_cancelled', 'no_service');
create type public.cancel_policy as enum ('full_credit', 'credit_with_notice', 'no_credit');
create type public.month_status as enum ('open', 'closed');
create type public.payment_method as enum ('cash', 'bank_transfer', 'duitnow', 'other');
