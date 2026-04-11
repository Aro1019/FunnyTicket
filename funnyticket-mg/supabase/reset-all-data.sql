-- ============================================
-- RESET COMPLET : Vider toutes les tables + utilisateurs
-- ⚠️  ATTENTION : Irréversible ! Supprime TOUTES les données.
-- Exécuter dans Supabase Dashboard > SQL Editor
-- ============================================

-- 1. Désactiver temporairement les triggers pour éviter les conflits
set session_replication_role = 'replica';

-- 2. Vider les tables enfants d'abord (respect des foreign keys)
truncate table public.notification_log cascade;
truncate table public.push_subscriptions cascade;
truncate table public.payments cascade;
truncate table public.tickets cascade;
truncate table public.orders cascade;
truncate table public.payment_methods cascade;
truncate table public.packs cascade;
truncate table public.profiles cascade;

-- 3. Supprimer tous les utilisateurs auth
delete from auth.users;

-- 4. Réactiver les triggers
set session_replication_role = 'origin';

-- 5. Réinsérer les packs par défaut
insert into public.packs (name, duration_hours, price, description) values
  ('12 Heures', 12, 1000, 'Accès WiFi pendant 12 heures'),
  ('1 Semaine', 168, 5000, 'Accès WiFi pendant 1 semaine'),
  ('1 Mois', 720, 20000, 'Accès WiFi pendant 1 mois');
