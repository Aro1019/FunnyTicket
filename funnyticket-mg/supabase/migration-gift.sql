-- ============================================
-- FunnyTicket - Migration: Système cadeau
-- 6 tickets de 1000 Ar en 1 semaine = 1 ticket gratuit
-- ============================================
-- Exécuter dans Supabase Dashboard > SQL Editor

-- ============================================
-- Table: gifts (tickets offerts)
-- ============================================
create table if not exists public.gifts (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) not null,
  ticket_id uuid references public.tickets(id) not null,
  week_start date not null,
  qualifying_count integer not null default 6,
  created_at timestamptz default now()
);

alter table public.gifts enable row level security;

create policy "Users can view their own gifts"
  on public.gifts for select using (auth.uid() = user_id);

create policy "System can insert gifts"
  on public.gifts for insert with check (auth.uid() = user_id);

create policy "Admins can view all gifts"
  on public.gifts for select using (public.is_admin());
