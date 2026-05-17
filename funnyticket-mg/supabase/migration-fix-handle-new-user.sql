-- ============================================
-- FunnyTicket — Migration : Trigger handle_new_user robuste
-- ============================================
-- Cause traitée :
--   • Erreur "Database error saving new user" lors de auth.signUp
--   • Provoquée par un search_path manquant dans la fonction SECURITY DEFINER
--     (Supabase a durci les défauts : sans search_path, le trigger ne trouve
--     plus la table public.profiles)
--   • Ou par une exception non gérée (conflit de contrainte) faisant échouer
--     toute la transaction auth.signUp
--
-- À exécuter dans Supabase Dashboard > SQL Editor
-- ============================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  insert into public.profiles (id, identifiant, full_name, phone, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'identifiant', ''),
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'phone', ''),
    nullif(coalesce(new.raw_user_meta_data->>'email', ''), ''),
    coalesce(new.raw_user_meta_data->>'role', 'user')
  );
  return new;
exception
  when unique_violation then
    -- Loggé côté Postgres pour diagnostic, mais on n'empêche pas la création
    -- du compte auth.users. L'application doit gérer l'incohérence ensuite.
    raise warning 'handle_new_user: unique_violation pour user_id=%, identifiant=%, email=%',
      new.id,
      coalesce(new.raw_user_meta_data->>'identifiant', ''),
      coalesce(new.raw_user_meta_data->>'email', '');
    return new;
  when others then
    raise warning 'handle_new_user: erreur inattendue pour user_id=% : % (%)',
      new.id, sqlerrm, sqlstate;
    return new;
end;
$$;

-- Le trigger lui-même n'a pas besoin d'être recréé s'il existait déjà,
-- mais on le recrée par sécurité (idempotent).
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
