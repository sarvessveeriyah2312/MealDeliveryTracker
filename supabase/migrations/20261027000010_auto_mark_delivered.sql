-- "Auto-mark on close" becomes "auto-mark delivered once the meal time passes", on by default.
alter table public.subscriptions rename column auto_mark_delivered_on_close to auto_mark_delivered;
alter table public.subscriptions alter column auto_mark_delivered set default true;
update public.subscriptions set auto_mark_delivered = true;
