-- Add cash_received tracking column to payments
-- Allows admin to track if cash has been physically received
alter table public.payments
  add column if not exists cash_received boolean default false,
  add column if not exists cash_received_at timestamptz;
