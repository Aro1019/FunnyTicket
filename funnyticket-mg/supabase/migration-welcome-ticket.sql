-- ============================================
-- FunnyTicket - Migration: Ticket de bienvenue
-- 1 ticket 12h gratuit à la première inscription
-- Anti-abus : unicité par numéro de téléphone normalisé
-- ============================================
-- Exécuter dans Supabase Dashboard > SQL Editor

-- ============================================
-- Table: welcome_tickets (anti-abus par téléphone)
-- ============================================
create table if not exists public.welcome_tickets (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) not null,
  phone_normalized text not null unique,
  ticket_id uuid references public.tickets(id) not null,
  created_at timestamptz default now()
);

alter table public.welcome_tickets enable row level security;

create policy "Users can view their own welcome tickets"
  on public.welcome_tickets for select using (auth.uid() = user_id);

create policy "System can insert welcome tickets"
  on public.welcome_tickets for insert with check (auth.uid() = user_id);

create policy "Admins can view all welcome tickets"
  on public.welcome_tickets for select using (public.is_admin());

-- ============================================
-- Unique index on normalized phone in profiles
-- ============================================
-- Normalize: strip spaces, dashes, dots, and standardize +261/0 prefix
create or replace function public.normalize_phone(p text)
returns text as $$
begin
  -- Remove all non-digit characters
  p := regexp_replace(p, '[^0-9]', '', 'g');
  -- Convert +261xx to 0xx
  if left(p, 3) = '261' and length(p) = 12 then
    p := '0' || right(p, 9);
  end if;
  return p;
end;
$$ language plpgsql immutable;

-- Unique index on normalized phone (prevents same phone across accounts)
create unique index if not exists idx_profiles_phone_normalized
  on public.profiles (public.normalize_phone(phone));
