-- Migration: Add superadmin role
-- Run this in Supabase SQL Editor

-- 1. Update the role check constraint to include 'superadmin'
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('user', 'admin', 'superadmin'));

-- 2. Create a SECURITY DEFINER helper (avoids recursive RLS on profiles)
CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'superadmin'
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- 3. Drop old policies if they exist (in case migration was run before)
DROP POLICY IF EXISTS "Superadmin can read all profiles" ON profiles;
DROP POLICY IF EXISTS "Superadmin can update all profiles" ON profiles;
DROP POLICY IF EXISTS "Superadmin can read all tickets" ON tickets;
DROP POLICY IF EXISTS "Superadmin can read all payments" ON payments;
DROP POLICY IF EXISTS "Superadmin can read all orders" ON orders;

-- 4. Add RLS policies using the safe helper function
CREATE POLICY "Superadmin can read all profiles"
  ON profiles FOR SELECT
  USING (public.is_superadmin());

CREATE POLICY "Superadmin can update all profiles"
  ON profiles FOR UPDATE
  USING (public.is_superadmin());

CREATE POLICY "Superadmin can read all tickets"
  ON tickets FOR SELECT
  USING (public.is_superadmin());

CREATE POLICY "Superadmin can read all payments"
  ON payments FOR SELECT
  USING (public.is_superadmin());

CREATE POLICY "Superadmin can read all orders"
  ON orders FOR SELECT
  USING (public.is_superadmin());

-- 5. Promote a user to superadmin (replace the email)
-- UPDATE profiles SET role = 'superadmin' WHERE email = 'ton-email@example.com';
