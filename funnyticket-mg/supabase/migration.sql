-- ============================================
-- FunnyTicket - Migration SQL pour Supabase
-- ============================================

-- Extension UUID
create extension if not exists "uuid-ossp";

-- ============================================
-- Table: profiles (extension de auth.users)
-- ============================================
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  identifiant text not null unique,
  full_name text not null,
  phone text not null,
  email text,
  role text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;

-- Helper function to avoid recursive RLS
create or replace function public.is_admin()
returns boolean as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$$ language sql security definer;

create policy "Users can view own profile"
  on public.profiles for select using (auth.uid() = id);

create policy "Admins can view all profiles"
  on public.profiles for select using (public.is_admin());

create policy "Users can update their own profile"
  on public.profiles for update using (auth.uid() = id);

create policy "Users can insert their own profile"
  on public.profiles for insert with check (auth.uid() = id);

-- ============================================
-- Table: packs (offres WiFi)
-- ============================================
create table public.packs (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  duration_hours integer not null,
  price integer not null,
  description text,
  is_active boolean default true,
  created_at timestamptz default now()
);

alter table public.packs enable row level security;

create policy "Authenticated users can view active packs"
  on public.packs for select to authenticated using (is_active = true);

create policy "Admins can manage packs"
  on public.packs for all using (public.is_admin());

-- Données par défaut
insert into public.packs (name, duration_hours, price, description) values
  ('12 Heures', 12, 1000, 'Accès WiFi pendant 12 heures'),
  ('1 Semaine', 168, 5000, 'Accès WiFi pendant 1 semaine'),
  ('1 Mois', 720, 20000, 'Accès WiFi pendant 1 mois');

-- ============================================
-- Table: payment_methods (config vendeur)
-- ============================================
create table public.payment_methods (
  id uuid default uuid_generate_v4() primary key,
  admin_id uuid references public.profiles(id) not null,
  method_type text not null check (method_type in ('mvola', 'orange_money', 'airtel_money')),
  phone_number text not null,
  account_name text not null,
  is_active boolean default true,
  created_at timestamptz default now(),
  unique(admin_id, method_type)
);

alter table public.payment_methods enable row level security;

create policy "Anyone authenticated can view active payment methods"
  on public.payment_methods for select to authenticated using (is_active = true);

create policy "Admins can manage their payment methods"
  on public.payment_methods for all using (public.is_admin());

-- ============================================
-- Table: tickets
-- ============================================
create table public.tickets (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) not null,
  pack_id uuid references public.packs(id) not null,
  login_hotspot text not null,
  password_hotspot text not null,
  status text not null default 'pending' check (status in ('pending', 'active', 'expired', 'cancelled')),
  created_at timestamptz default now(),
  activated_at timestamptz,
  expires_at timestamptz
);

alter table public.tickets enable row level security;

create policy "Users can view their own tickets"
  on public.tickets for select using (auth.uid() = user_id);

create policy "Users can create tickets"
  on public.tickets for insert with check (auth.uid() = user_id);

create policy "Admins can view all tickets"
  on public.tickets for select using (public.is_admin());

create policy "Admins can update tickets"
  on public.tickets for update using (public.is_admin());

-- ============================================
-- Table: payments
-- ============================================
create table public.payments (
  id uuid default uuid_generate_v4() primary key,
  ticket_id uuid references public.tickets(id) not null,
  user_id uuid references public.profiles(id) not null,
  amount integer not null,
  payment_method text not null check (payment_method in ('mvola', 'orange_money', 'airtel_money', 'cash')),
  payment_method_id uuid references public.payment_methods(id),
  reference text,
  screenshot_url text,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'rejected')),
  confirmed_by uuid references public.profiles(id),
  confirmed_at timestamptz,
  created_at timestamptz default now()
);

alter table public.payments enable row level security;

create policy "Users can view their own payments"
  on public.payments for select using (auth.uid() = user_id);

create policy "Users can create payments"
  on public.payments for insert with check (auth.uid() = user_id);

create policy "Admins can view all payments"
  on public.payments for select using (public.is_admin());

create policy "Admins can update payments"
  on public.payments for update using (public.is_admin());

-- ============================================
-- Trigger: créer un profil à l'inscription
-- ============================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, identifiant, full_name, phone, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'identifiant', ''),
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'phone', ''),
    coalesce(new.raw_user_meta_data->>'email', null),
    coalesce(new.raw_user_meta_data->>'role', 'user')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================
-- Pour promouvoir un utilisateur en admin :
-- UPDATE public.profiles SET role = 'admin' WHERE id = 'USER_UUID';
-- ============================================

-- ============================================
-- Storage: bucket pour les captures d'écran
-- ============================================
-- Créer dans Supabase Dashboard > Storage > New bucket:
--   Nom: payment-screenshots
--   Public: false
-- Puis ajouter ces policies:
--
-- INSERT: authenticated users can upload
--   (bucket_id = 'payment-screenshots' AND auth.role() = 'authenticated')
--
-- SELECT: users can view their own OR admins can view all
--   (bucket_id = 'payment-screenshots')
-- ============================================
