-- ============================================
-- FunnyTicket - Migration: Système de commandes (multi-tickets)
-- ============================================
-- Exécuter dans Supabase Dashboard > SQL Editor

-- ============================================
-- Table: orders (commandes groupant plusieurs tickets)
-- ============================================
create table if not exists public.orders (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) not null,
  total_amount integer not null,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'rejected', 'cancelled')),
  created_at timestamptz default now()
);

alter table public.orders enable row level security;

create policy "Users can view their own orders"
  on public.orders for select using (auth.uid() = user_id);

create policy "Users can create orders"
  on public.orders for insert with check (auth.uid() = user_id);

create policy "Admins can view all orders"
  on public.orders for select using (public.is_admin());

create policy "Admins can update orders"
  on public.orders for update using (public.is_admin());

-- ============================================
-- Add order_id to tickets
-- ============================================
alter table public.tickets
  add column if not exists order_id uuid references public.orders(id);

-- ============================================
-- Modify payments: add order_id, make ticket_id nullable
-- ============================================
alter table public.payments
  add column if not exists order_id uuid references public.orders(id);

-- Make ticket_id nullable (for new orders with multiple tickets)
alter table public.payments
  alter column ticket_id drop not null;
